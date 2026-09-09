# Assessment: Requirements DB drift

## Finding
`REQUIREMENTS.md` lists requirements (R001…R011), but the GSD database table `requirements` is empty (`select count(*) from requirements;` => 0). As a result, `gsd_requirement_update` cannot find `R008` even though it exists in the markdown file.

## Impact
- Requirement status updates via tools will fail.
- `STATE.md` currently reports 0 active/validated because it is reading from DB, not from `REQUIREMENTS.md`.

## Proposed Fix
Re-import/sync requirements from `.gsd/REQUIREMENTS.md` into the DB, then re-run requirement updates (e.g., mark R008 validated based on M004 completion).

## Evidence
- `.gsd/REQUIREMENTS.md` contains `| R008 | Comunicación (Anuncios y Mensajería) | ... | Active |`.
- `sqlite3 .gsd/gsd.db "select count(*) from requirements;"` returns 0.
