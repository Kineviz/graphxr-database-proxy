# Embedded stores: Kuzu, Ladybug and LatticeDB

These are embedded graph databases: a project points at a **file on the proxy's
machine** rather than at a server. There is no host, no port and no password — the
filesystem is the access control.

They are two families, not three.

**Kuzu and Ladybug are one engine under two names.** Ladybug is Kuzu's
continuation after the fork. It speaks the same Cypher and has the same catalog,
but it writes a different magic number and its own series of storage formats, so a
store belongs to one family or the other.

**LatticeDB is a separate project.** It is embedded and it speaks Cypher, and the
resemblance ends about there: a different file format, a narrower grammar, no
schema of any kind, and — where it counts — a better identity story than the other
two. See [What GraphXR gets](#what-graphxr-gets).

> **LatticeDB publishes no Windows wheel.** On Windows it has to be built once —
> the engine runs there perfectly well, it is the *packaging* that stops at
> Linux and macOS. See [Building an engine yourself](#building-an-engine-yourself);
> the alternative is the Docker image or a Linux/macOS host. Kuzu and Ladybug are
> unaffected.

**Within the Kuzu family, the project type does not have to match the file.** A Kuzu project pointed at a
Ladybug store is served with the Ladybug package and Ladybug's release series, and
the other way round. The two are one codebase with two names -- same statements,
same catalog, same result shapes -- so refusing would turn a store the proxy can
serve perfectly well into a configuration error. The project type decides the URL
(`/api/kuzu/...` or `/api/ladybug/...`) and the label; the file decides the engine.
The substitution is never silent: the form says so while you configure it, and
`GET /api/{type}/{project}` reports the engine actually in use under
`features.engine`.

One consequence worth knowing: an **engine version pin is dropped** when the file
turns out to be the other family. `0.11` names a Kuzu line and there is no Ladybug
0.11, so carrying it across would turn a working store into a failed install.

**That substitution does not cross to LatticeDB.** A `latticedb` project pointed at
a Kuzu or Ladybug file is refused, and the other way round. LatticeDB cannot open
those stores, and even if it could, the statements the proxy builds for it are not
Kuzu's — so the message names the project type the file actually wants instead of
quietly serving something else.

## The short version

1. Create a project, pick **Kuzu (embedded)**, **Ladybug (embedded)** or
   **LatticeDB (embedded)**.
2. Give it a path, or drop the store file onto the form.
3. The proxy reads the file's header, works out which engine release can open it,
   and downloads that release if it does not have it. The form shows the progress.
4. Point GraphXR at `/api/kuzu/<project>`, `/api/ladybug/<project>` or
   `/api/latticedb/<project>`.

## Why the engine is chosen from the file

Every store begins with four magic bytes naming the family and then a **storage
version** — the on-disk format number:

```
4b 55 5a 55  27 00 00 00 00 00 00 00     KUZU, format 39   (Kuzu 0.11.x)
4c 42 55 47  2b 00 00 00 00 00 00 00     LBUG, format 43   (Ladybug 0.19.x)
42 44 54 4c  03 00 03 00 00 10 00 00     BDTL, format 3    (LatticeDB 0.9+)
```

Kuzu and Ladybug write that number as a 64-bit field. LatticeDB writes a 16-bit
one, **twice** — the format it wrote and the oldest reader allowed — and what
follows is its page size rather than more of the version. LatticeDB has used three
formats so far: 1 (0.2–0.4), 2 (0.5–0.8) and 3 (0.9 onwards).

That number, not the filename and not a setting, is what decides which build can
read the store. Kuzu accepts only its own format; Ladybug and LatticeDB each
accept a range below themselves. Opening a store with the wrong build fails, and fails unhelpfully — Kuzu
0.10 on a 0.11 file reports a `UnicodeDecodeError` from inside its catalog reader
— so the proxy reads the header itself and picks the build, rather than handing
the path over and hoping. A path that is not a store at all is refused here, with
a message naming what was found instead.

The mapping from format to release is keyed on the format number rather than on a
version line, which is what makes patch versions collapse: 0.19.0 and 0.19.1 both
write format 43, so a format-43 store gets whichever of them is newest, and it
will pick up 0.19.2 the day it is published without the proxy changing.

The proxy ships a table covering every release that exists today, so it resolves
a store offline. For Kuzu and Ladybug that table is transcribed from each
project's own `storage_version_info.h`; LatticeDB publishes no such file, so its
entries were measured instead — each release installed, a store created, and its
first bytes read. Beyond that it learns: a build it loads is asked
what format it writes, a build that opens a store is recorded as able to read that
format, and a build that refuses one is un-recorded. What it learns is kept in
`config/engine_versions.json`. If it meets a format newer than anything it knows,
it lists the releases from PyPI and installs the newest few to find out which one
writes it.

## Where the engines are kept

Each release is installed on its own, under `~/.graphxr-proxy/engines/`, and runs
in its own process. That is not tidiness: importing `kuzu` into a process that has
already imported `ladybug` fails outright — both are pybind11 extensions claiming
the same type names — so a proxy serving one project on Kuzu and another on
Ladybug cannot hold either engine itself.

LatticeDB arrives at the same place by another road. It is a `ctypes` binding with
no type registry to collide over, but it loads its shared library from *inside its
own package*, so two releases would mean two `latticedb` packages in one
interpreter. The per-release install and the process around it are what every
engine here needs, for whichever reason applies to it.

The engine also gets its own interpreter when it needs one. `kuzu` 0.11.3, for
instance, publishes no CPython 3.14 wheel for Windows; if the proxy is running
3.14 there, `uv` is used to fetch a 3.13 for the engine while the proxy stays
where it is. An install is not considered finished until the engine has actually
been started once and answered — a wheel can match the platform tags and still
fail to load — and if it will not run, the next interpreter is tried.

`uv` is therefore strongly recommended. Without it the proxy can only install for
its own interpreter, and will say which interpreters would have worked instead of
attempting a source build.

## Building an engine yourself

An engine has to publish a wheel for your platform, and one of them does not.
LatticeDB is a Zig project whose CI has no Windows job, so on Windows PyPI offers
only a source distribution — and that cannot build itself, because the helper its
`setup.py` loads is not inside it. Kuzu and Ladybug are unaffected.

The engine itself is fine there. It cross-compiles in one command, and a store it
writes on Windows has the same header and the same format number as one written on
Linux, so stores move between them unchanged. What was missing was a way to hand
the proxy the result.

Any wheel dropped into `~/.graphxr-proxy/wheelhouse/` is that way. It joins the
releases the installer plans against, is matched against this machine's tags like
any published wheel, and is installed **by path** — so a build of your own wins
over a file of the same version on PyPI rather than racing it. Its own
dependencies still resolve normally. The same mechanism covers an air-gapped
install, for any of the three engines.

To build the LatticeDB wheel on Windows you need [Zig](https://ziglang.org) 0.16
or newer:

```powershell
git clone https://github.com/jeffhajewski/latticedb
cd latticedb
zig build shared -Doptimize=ReleaseFast     # -> zig-out\bin\lattice.dll

pip install build wheel
cd bindings\python
$env:LATTICE_BUNDLE_LIB_PATH = "..\..\zig-out\bin\lattice.dll"
python -m build --wheel
wheel tags --platform-tag=win_amd64 --remove (Get-ChildItem dist\*.whl).FullName

mkdir -Force ~\.graphxr-proxy\wheelhouse
copy dist\latticedb-*-win_amd64.whl ~\.graphxr-proxy\wheelhouse\
```

Two details are easy to lose. Windows leaves the DLL in `zig-out\bin\`, not
`zig-out\lib\` where the other platforms put it. And the retag is not cosmetic:
the package is pure Python, so a plain build tags it `py3-none-any` even though it
now carries a Windows DLL — and "runs anywhere" is the one thing that wheel does
not do.

Then configure a LatticeDB project as usual. The next connection installs from the
wheelhouse instead of reporting a platform gap.

Two things to know before relying on it. Upstream runs no Windows CI, so a later
release can regress there without anyone noticing; you own that verification. And
the multi-hop limitation is the engine's rather than the platform's — it is
declared unsupported on every OS, for the same reason.

## Configuring a project

| Field | Meaning |
|---|---|
| **Database path** | The store. A single file for Kuzu 0.11+ and every Ladybug and LatticeDB release; the *directory* for a store written by Kuzu 0.10 or older. The field offers what the proxy already holds — see below — and still takes any path you type. |
| **Engine version** | Normally empty, so the file decides. `0.19` pins the newest 0.19.x; `0.19.1` pins that exact release. |
| **Access** | Read-only by default. |

The path field is a dropdown as well as a text box. It offers the stores in the
library and the paths other projects already point at, each labelled with the
engine and release read out of the file — so reusing a store is picking it rather
than remembering where it went. It offers the first hundred and says how many it
is not showing; a store anywhere else on the proxy's disk is still a valid answer
and can be typed in full.

**Read-only is the default for a reason.** The proxy is a read path, and a
read-only open can be shared — several processes, including your own tooling, can
have the store open at once. A writable project takes the file exclusively, and
nothing else can open it while the proxy holds it.

### Dropping a store

The drop zone copies the file onto the proxy under
`config/databases/<project>/<filename>` and fills the path in. It is checked as it
arrives and rejected as soon as its first bytes say it is not a store, so a large
wrong file is never written out in full. If something is already there under that
name you are asked before it is replaced.

A store written by **Kuzu 0.10 or older is a directory**, not a file, so it cannot
be dragged. Every Ladybug and LatticeDB release writes a single file. Give its path in the field instead; the proxy finds the header in the
`catalog.kz` inside it.

## The store library

Everything dropped onto the proxy lands in one place, and the **Files** page is
that place: `config/databases`, listed with what each file turned out to be.

Each row carries the engine and storage format read from the file itself, the
release that would open it and whether that release is already installed, the
size, and **the projects pointing at it**. That last column is what the page is
for. A store can be deleted from here, and a store a project still names is
refused the first time with those names in the message — the alternative is a
project that keeps working until the next time GraphXR opens it.

Three things worth knowing about what it shows:

- **Files the proxy cannot serve are listed anyway.** A SQLite or DuckDB file in
  the directory is named as one rather than called unrecognised, and rather than
  hidden. It is on the disk either way, and a listing that only shows what it
  understands is how a directory fills up with things nobody can find. Neither has
  a driver yet, so neither can back a project; uploads are still Kuzu, Ladybug and
  LatticeDB only, refused by their first bytes.
- **A directory-layout store is one row, not a folder of them.** A directory
  holding a `catalog.kz` is a Kuzu 0.10-or-older store; the page reports it as a
  single entry and deletes it whole.
- **The listing is paged at the proxy.** Each row costs a header read, so a page
  of ten reads ten files — not every file in the directory. Deleting the last
  store in a folder takes the folder with it.

**Create project** on a row opens the project form with the path filled in and the
type set to the engine that wrote the file. Inside the Kuzu family either type
would have worked — the file picks the engine regardless — but opening on the
matching one saves a correction. For a LatticeDB store the matching type is the
only one that will start.

## What GraphXR gets

All three answer the graph surface: `/query`, `/schema`, `/graphSchema`,
`/sampleData`, `/capabilities`, `/expand`, `/pullCategory`, `/pullRelationship`.
What differs between the families is worth knowing.

|  | Kuzu / Ladybug | LatticeDB |
|---|---|---|
| Node id | `<Label>:<primary key>` | the engine's own integer |
| Expand seeds re-selected by | key property | identity (`id(n)`) |
| Exclude an edge by id | no | yes |
| Pin both ends of a traversal | no | yes |
| Multi-hop expand | yes | no — see below |
| `/schema` (relational view) | yes, from the catalog | no, nothing declares one |
| `/graphSchema` | read from the catalog | inferred by sampling |
| Full-text search | not wired up | not wired up |

### Kuzu and Ladybug

**Node ids are `<Label>:<primary key>`.** These engines expose `ID(n)` but have no
way to write one back into a statement, so an internal id could never be matched
again. Node tables always have a primary key — a table declared without one is a
parse error — so this form always exists, and the proxy reads which column it is
straight from the catalog rather than guessing.

**`/schema` answers for real here.** A Kuzu table is declared, so the relational
view reports actual column types, where the Neo4j and Memgraph drivers have to
refuse it.

### LatticeDB

**Node ids are the engine's own integers**, because `id(n)` both reads back *and*
matches — `WHERE id(n) IN [1,2]` is accepted. That single difference widens the
whole surface: seeds are re-selected by identity, an edge can be excluded by id,
and a traversal can be pinned at both ends. None of that is available to Kuzu.

**`/graphSchema` is inferred, not read.** A LatticeDB node is created without
declaring a label or a property, so there is no catalog to ask. The proxy asks
what distinct labels and endpoint/type triples exist, then samples a bounded
number of nodes per category to see what properties they carry, taking types from
the values. That makes the schema a *description of what was sampled*: a property
that appears only on the ten-thousandth node of a category will not be in it.

**`/schema` refuses**, the way it does for Neo4j and Memgraph, and for the same
reason — there is no relational layout to report.

**Multi-hop expand is not offered**, and not because the grammar lacks it: a
chained pattern parses and answers correctly. The projection this backend needs
grows by eight columns a hop — an edge carries no endpoints, so each one's ends
have to be named in the `RETURN` — and at that width latticedb 0.14.0 corrupts
memory and takes the engine process down with it. One hop is stable; the client
can walk out a hop at a time.

**There is no quoted identifier.** A backtick is an `Invalid token` wherever it
appears — label, type, property key, variable — and nothing stands in for it:
double quotes and brackets are rejected in those positions too. Every other Cypher
backend takes backticks, so a client that quotes by habit produces a statement this
engine refuses before reading anything else; GraphXR's search builder quotes every
label and every type it emits. The proxy takes the backticks off a name that is
already a bare identifier. A name that is *not* — a label with a space — has no
place in a pattern at all, so it moves into a `WHERE` predicate instead:
`MATCH (n0:`Order Item`)` becomes `MATCH (n0) WHERE "Order Item" IN labels(n0)`,
which is what the dialect emits for its own statements. An existing `WHERE` is
parenthesised before the predicate joins it.

**A hand-written `/query` is rewritten when it can be read.** LatticeDB has no `*`
in its grammar, so `MATCH (n)-[r]->(m) RETURN * LIMIT 100` — the first thing anyone
types — stops at the parser with `Expected expression`. Naming the variables
instead is worse: there is no node or relationship value type at all, so
`RETURN n, r, m` parses and answers three integers, which is not an error and not a
graph either. The proxy rewrites both into the projection its own statements use,
and the result comes back as a graph.

It only rewrites what it can read without guessing: one `MATCH`, no clause that
could rebind anything, a `RETURN` that is `*` or bare variables the pattern bound,
and every projected relationship directed with a named node at each end. An
undirected `(n)-[r]-(m)` is refused rather than handled — an edge cannot be asked
for its ends, so they come from the pattern, and that pattern does not say which
way the edge runs. Anything it cannot read reaches the engine exactly as typed; if
it then fails on the missing `*`, the error carries the reason and an example of
the projection to write instead. The intent routes never go through any of this —
they project properly to begin with.

Full-text search is not offered on any of them. Kuzu and Ladybug have an extension
that is not wired up. LatticeDB has BM25 built in — the only one here that does —
but its index is filled per node by an explicit call, so a store nobody indexed
would answer every search with nothing. In both cases the capability record says
so rather than offering a control with nothing behind it.

## Settings

| Variable | Default | What it does |
|---|---|---|
| `GRAPHXR_PROXY_ENGINES_DIR` | `~/.graphxr-proxy/engines` | Where engine builds are installed. |
| `GRAPHXR_PROXY_ENGINE_MAP` | `config/engine_versions.json` | Where the learned format-to-release map is kept. |
| `GRAPHXR_PROXY_STORES_DIR` | `config/databases` | The store library: where dropped stores land and what the Files page lists. |
| `GRAPHXR_PROXY_MAX_UPLOAD_BYTES` | 4 GiB | Ceiling on a dropped store. |
| `GRAPHXR_PROXY_ENGINE_IDLE_SECONDS` | 300 | How long an idle engine process is kept alive. |
| `GRAPHXR_PROXY_UV` | — | Path to `uv`, when it is not on `PATH`. |
| `GRAPHXR_PROXY_WHEELHOUSE` | `~/.graphxr-proxy/wheelhouse` | Wheels you built yourself, preferred over PyPI. |

## When something goes wrong

**"does not start with an embedded-store magic number"** — the path is not a
store. If it is a directory, check it holds a `catalog.kz`.

**"is a Kuzu store, not a LatticeDB store"** — the project type and the file
disagree across the family boundary, where the proxy does not substitute. The
message names the project type to use instead.

**"latticedb 0.14.0 publishes no wheel for this platform at all"** — you are on
Windows. LatticeDB ships macOS and manylinux wheels and nothing else, so no
interpreter on that host can install it; a different Python is not the answer.
Build the wheel once — see [Building an engine yourself](#building-an-engine-yourself)
— or use the Docker image or a Linux/macOS host. The message names the wheelhouse
it would install from.

**"No kuzu release is known to read storage version N"** — the format is newer
than anything the proxy could find. `GET /api/embedded/known-formats` lists what
it does know. A proxy with no network cannot discover a release published after it
shipped.

**"publishes no wheel for CPython 3.x on this platform"** — install `uv` so the
proxy can run the engine on an interpreter of its own, or run the proxy on one of
the interpreters the message lists.

## Running the engine tests

The test suite is offline and stubs the engines. To exercise the real ones:

```bash
GRAPHXR_PROXY_ENGINE_TESTS=1 uv run pytest tests/test_embedded_integration.py -q
```

They download engine builds, so point `GRAPHXR_PROXY_ENGINES_DIR` somewhere
disposable the first time.
