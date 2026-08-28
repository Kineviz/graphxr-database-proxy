# Kuzu and Ladybug: embedded stores with a version-matched engine

**Status:** agreed
**Date:** 2026-08-27

Three decisions taken before implementation:

- **Two database types**, not one auto-detecting type. The magic bytes are
  incompatible and the version lines are unrelated, so `capabilities.type` must be
  able to say which engine a project actually reached.
- **Engines are installed eagerly at configure time and lazily as a fallback.** One
  install path, two triggers; the runtime path waits on an in-flight install rather
  than starting a second one.
- **Read-only by default, writable by an explicit per-project opt-in.**

## What is being asked

Serve a local Kuzu or Ladybug database file through the proxy.

- Kuzu, currently 0.11.3. Ladybug, currently 0.19.x with 0.18.x still in use.
- A project points at a store either by **configuring a path** or by **dragging the
  file onto the project**.
- The store's own bytes decide which engine version opens it: read the header, take
  the storage version, look up the release line that writes it.
- If that engine release is not present, **download it on demand** and use exactly
  that version for this store.
- The storage-version to release map is **probed and learned**, not a frozen table,
  and it is keyed on the release *line* — patch versions are collapsed.

## Ground truth (measured, not assumed)

Everything below was verified against real installs on 2026-08-27 rather than read
off documentation, because several of the findings contradict what the docs imply.

| | Kuzu | Ladybug |
|---|---|---|
| PyPI package | `kuzu`, latest 0.11.3 | `ladybug`, latest 0.19.1 |
| Magic bytes | `KUZU` | `LBUG` |
| Header | 4 magic bytes, then storage version as uint64 LE | same |
| Layout, 0.10 and older | **directory**: `catalog.kz`, `data.kz`, `metadata.kz` | n/a |
| Layout, 0.11+ / all Ladybug | **single file** | single file |
| Result key casing | `_id`, `_label`, `_src`, `_dst` | `_ID`, `_LABEL`, `_SRC`, `_DST` |
| Backward read | exact storage version only | `canReadStorageVersion` accepts a range |

Storage versions, from each project's `storage_version_info.h` and confirmed by
`kuzu.storage_version` / `ladybug.storage_version` at runtime:

- Kuzu: 0.11.x is 39, 0.10.0 is 38, 0.9.0 is 37, 0.8.0 is 36, 0.7.x is 34 and 35,
  older lines down to 1.
- Ladybug: 0.12 through 0.16 is 40, 0.17.x is 41, 0.18.x is 42, 0.19.x is 43,
  0.20.0 is 47.

Five findings that shape the design:

1. **One process cannot host two engines.** `import kuzu` after `import ladybug`
   raises `ImportError: generic_type: type "Database" is already registered!` — both
   pybind11 modules claim the same type names in one global registry. Two *versions*
   of one engine are worse. A subprocess per engine build is therefore mandatory,
   not a tidiness preference.
2. **A wheel may not exist for the running interpreter.** This box runs CPython
   3.14; `kuzu` 0.11.3 publishes no `cp314` Windows wheel, so a plain install falls
   back to a source build and fails. The engine's interpreter has to be selectable
   independently of the proxy's.
3. **The Ladybug Windows wheel is missing its OpenSSL dependencies.** `_lbug.pyd`
   imports `libssl-3-x64.dll` and `libcrypto-3-x64.dll`, which `ladybug.libs` does
   not vendor; the import dies with a bare "DLL load failed". Adding
   `<base_prefix>/DLLs` to the DLL search path fixes it, because CPython ships those
   two for its own `ssl` module.
4. **There is no writable node-identity literal.** `ID(n)` reads back as
   `INTERNAL_ID`, but `n._id` is rejected — "reserved for system usage" — so an id
   the proxy hands the client cannot be matched again by identity. Node tables do
   require a `PRIMARY KEY` (`CREATE NODE TABLE T(a INT64)` fails with "Can not find
   primary key"), so `<Label>:<key>` ids round-trip. This is RocketGraph's situation
   exactly, and gets RocketGraph's answer.
5. **Opening a store with the wrong engine fails badly.** Ladybug on a Kuzu file
   says "not a valid Lbug database file"; Kuzu 0.10 on a 0.11 file raises a
   `UnicodeDecodeError` from deep inside the catalog reader. The proxy checks the
   header itself before handing the path to any engine.

## Design

### 1. Types and configuration

`DatabaseType` gains `KUZU = "kuzu"` and `LADYBUG = "ladybug"`. `DatabaseConfig`
gains three fields, all embedded-only:

- `database_path` — the store, a file or a directory.
- `engine_version` — optional pin (`"0.19"` or `"0.19.1"`); empty means "resolve
  from the file".
- `read_only` — defaults true, and a project can opt out. Read-only is also what
  lets more than one process open the same store; a writable project takes an
  exclusive lock on the file, so the form says so where the checkbox is.

No host, port or credentials: an embedded store's access control is the filesystem's.

`graph_capabilities` stays a class attribute — `tests/test_driver_intents.py` reads
it off the class — and a writable project shadows it with an instance copy carrying
`write: true`. `get_capabilities` already reads the attribute off the instance.

### 2. `drivers/embedded/store_probe.py` — what is this file

Reads the header and returns `StoreFingerprint(engine, storage_version, kind)`.
A directory is probed through its `catalog.kz` (then `catalog.bin` for the oldest
lines); a file is read directly. The magic decides the family, `header[4:12]` decides
the version — the full uint64 rather than the single low byte, which is the same
answer today and stays right past 255.

An unreadable or foreign file is an error here, with the path in the message, rather
than a stack trace out of an engine.

### 3. `drivers/embedded/version_map.py` — storage version to release line

Three layers, consulted in order:

1. **Seed** — a small checked-in table taken from both projects'
   `storage_version_info.h`, so a cold, offline proxy resolves every version that
   exists today without a network call.
2. **Learned** — `config/engine_versions.json`, written whenever the proxy actually
   loads an engine and asks it for `mod.storage_version`. The map grows from what
   was observed, which is the "probe it yourself" part of the request.
3. **Discovery** — for a storage version no layer knows, list the releases from
   PyPI, take those newer than the newest mapped one, and probe them newest-first:
   install, import, read `storage_version`, record. It stops at the first match, so
   a store written by a release that did not exist when this code shipped costs one
   or two installs and is then permanently known.

**Patch versions are collapsed.** The map's value is a line — `0.19`, not `0.19.1` —
and the release to install is the newest patch published on that line. Ladybug
declares `canReadStorageVersion` over a range, so when the exact line is
unavailable the resolver falls back to the newest line observed to read that
storage version; Kuzu has no such allowance and is matched exactly.

### 4. `drivers/embedded/runtime.py` — getting the engine onto the disk

A runtime is `<engines_dir>/<engine>-<version>-py<XY>/`, a `--target` install of one
release. `engines_dir` is `~/.graphxr-proxy/engines` by default and
`GRAPHXR_PROXY_ENGINES_DIR` overrides it — wheels do not belong in the repo's
`config/`.

Install is `uv pip install --target ...` when `uv` is on PATH, else
`<sys.executable> -m pip install --target ...`, guarded by a lock file so two
requests cannot race into the same directory.

Before installing, the release's PyPI file list is checked for a wheel matching this
interpreter and platform. If there is none and `uv` is available, a private
interpreter is provisioned (`uv venv --python <newest supported>`) and the worker
runs on that. If neither path works the error names the interpreter versions that do
have wheels, instead of surfacing a failed C++ build (finding 2).

**One install path, two triggers.** An `EngineInstallRegistry` holds the state of
each `(engine, version)` — `absent`, `installing` with a progress line, `ready`, or
`failed` with the reason — and single-flights the work:

- *Eager*: dropping a file or saving a path fires `POST
  /api/engines/{engine}/{version}/install`, which starts the install in a background
  task and returns at once. The form polls `GET /api/engines` and shows the line.
- *Lazy*: `connect()` awaits the same registry entry. A query that arrives during an
  eager install waits for it rather than starting a second one, and a project
  restored from `projects.json` after a restart still works with no UI visit.

### 5. `drivers/embedded/worker.py` and `pool.py` — one process per engine

`worker.py` is stdlib-only and runs under the runtime's `PYTHONPATH`. It adds
`<base_prefix>/DLLs` to the DLL search path on Windows before importing (finding 3),
opens `Database(path, read_only=...)` once, and speaks newline-delimited JSON on
stdin/stdout: `ping`, `open`, `query`, `close`.

`pool.py` keeps one worker per `(engine, version, path)`, with a per-worker asyncio
lock — embedded engines are single-writer and there is nothing to gain from
concurrent statements against one file — an idle timeout, a per-request timeout, and
a restart on crash.

### 6. `drivers/kuzu.py` and `drivers/ladybug.py`

`LadybugDriver` subclasses `KuzuDriver`, the way `MemgraphDriver` subclasses
`Neo4jDriver` and for the same reason: same Cypher, same catalog procedures, same
result shapes. What differs is the magic bytes, the record key casing and the
version lines — all data, not behaviour.

- `get_graph_schema` — `CALL show_tables()`, then `CALL table_info(<node>)` per node
  table and `CALL show_connection(<rel>)` per rel table. `table_info`'s `primary key`
  column is exactly the key a `label-key` identity needs, so no guessing.
  (`CALL show_tables() WHERE type = 'NODE'` returns rel tables too on Ladybug 0.19.1
  — the filter is applied in Python.)
- `get_schema` — the same catalog in the relational `table -> column -> type` shape.
  Unlike the bolt family this can genuinely answer, because Kuzu tables are typed.
- `get_sample_data` — `MATCH (n:X) RETURN n SKIP 0 LIMIT 10` per category.
- `execute_query` — capped by the existing `enforce_limit` helper.

### 7. `drivers/embedded/kuzu_mapping.py`

The twin of `bolt_mapping.py`. A node is recognised by `_id`/`_ID` plus
`_label`/`_LABEL`, so one mapper serves both engines' casing. `Node.id` is
`<Label>:<key>` and `RelationshipData.id` is `<Type>:<srcId>-><dstId>`, because
neither identity has a literal the dialect could match on (finding 4). Table results
become a 2D array with a header row, as the other drivers do.

### 8. Dialect and capabilities

`KUZU_DIALECT` / `LADYBUG_DIALECT`, both measured rather than assumed:

- `predicate = "primary-key"`, `identity.nodeId = "label-key"` (finding 4).
- `directions = ["all", "from", "to"]` — `<-[r]->` is a parse error on both engines.
- `multiHop = True` — the chained form the shared builder already emits
  (`-[r]-(n1)-[r1]-(m)`) works; the `*1..2` form returns a recursive-rel value the
  mapper would have to unpack, and is not used.
- `rel_type_expr = label(r)` — verified in both `RETURN` and `WHERE`, so hidden and
  selected relationship types filter properly. `relationship_filter = "pattern"`,
  since `[r:` plus backticked types parses.
- `rel_id_expr = None`, therefore `excludeRelationshipIds = False`.
- `supports_only_between_selected = False` — a key predicate cannot pin both ends.
- `fulltextSearch.supported = False`. Both engines have full-text index extensions;
  wiring one is a separate change, and claiming it here would offer a control with
  nothing behind it.

### 9. Path configuration and drag-and-drop

- `POST /api/project/{name}/database-file` — multipart, streamed to
  `<data_dir>/<project>/<filename>` in chunks and never buffered whole. The header is
  checked before the file is accepted; anything that is not `KUZU`/`LBUG` is
  rejected with the reason.
- `POST /api/{database_type}/inspect_path` — the fingerprint for a path the user
  typed, so the configure-a-directory route gets the same feedback as the drop
  route.
- `GET /api/engines` and `POST /api/engines/{engine}/{version}/install` — the
  registry's state, and the eager trigger.
- `ProjectForm` gains a Kuzu/Ladybug section: a path field, an `Upload.Dragger`, a
  read-only checkbox, and a line reporting what was detected — "Ladybug store,
  storage v43, engine 0.19.1" — plus the install's progress while it runs.
- `config/databases/` and `config/engines/` are added to `.gitignore`.

### 10. Tests

New, all offline:

- `test_kuzu_store_probe.py` — both magics, file and directory layouts, truncated
  and foreign files.
- `test_kuzu_version_map.py` — seed lookups, learned-map merge, patch collapsing,
  Ladybug's read-range fallback, and discovery against a stubbed PyPI response.
- `test_kuzu_mapping.py` — records to `Node`/`RelationshipData` in both key casings.
- `test_kuzu_driver.py` — schema built from recorded catalog rows, driver over a
  fake worker.
- `test_dialect.py` — the two new token tables.
- `test_driver_intents.py` covers both drivers automatically once registered.

One integration test, skipped unless an engine is already installed, so the
acceptance gate stays offline and fast.

## Deliberately out of scope

- Writes. `read_only` defaults true and the capability record declares `write: false`.
- Full-text search on either engine.
- Kuzu lines older than 0.8. The probe recognises their directory layout and the map
  knows their storage versions, so they fail with a clear message rather than a
  crash, but they are not tested.

## Staging

1. Probe, version map and seed table, with tests. No engine needed.
2. Runtime install, worker and pool, with the integration test.
3. Drivers, mapping, dialect, capabilities, registration.
4. Upload and inspect API.
5. Frontend form section.
6. Docs — `doc/USAGE`, `doc/API_Reference` and their `.zh.md` twins, plus `CLAUDE.md`.
