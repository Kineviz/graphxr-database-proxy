---
description: Run the local acceptance gate (backend tests + frontend build) and report what is ready to commit
allowed-tools: Bash(uv run pytest *), Bash(npm run build *), Bash(git status *), Bash(git diff *)
---

Run this repo's acceptance gate and report the outcome. Do not fix anything and
do not commit unless the user asks.

1. `uv run pytest -q` — every test must pass. If any fail, print the failing test
   names and the relevant assertion output verbatim; do not summarise them away.
2. `npm run build` — only when the change touched `frontend/`. Skip it otherwise
   and say that you skipped it.
3. `git status --short` — list the files this stage actually touched, and call
   out anything modified that looks like it belongs to another session's work in
   flight.

Then state plainly whether the gate is green, and which of the three steps ran.
If a doc under `doc/` was changed, check that its `.zh.md` twin was updated too
and say so if it was not.
