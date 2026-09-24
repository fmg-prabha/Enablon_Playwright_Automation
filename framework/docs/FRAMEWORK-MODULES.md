# Enablon M01–M15 automation framework

## Module catalogue

| Code | Module | Current coverage |
| --- | --- | --- |
| M01 | Action Plans | Existing access smoke test; not live-verified |
| M02 | Approvals | Planned — skipped placeholder |
| M03 | Audit | Planned — skipped placeholder |
| M04 | Contractor Management / CSM | Planned — skipped placeholder |
| M05 | Events / Incident Management | Existing access smoke test; not live-verified |
| M06 | Field Leadership | Planned — skipped placeholder |
| M07 | HERO Mobile Application | Planned — skipped placeholder |
| M08 | Inspections | Planned — skipped placeholder |
| M09 | Job Hazard Analysis (JHA) | Planned — skipped placeholder |
| M10 | Occupational Health | Planned — skipped placeholder |
| M11 | Obligations / Compliance | Planned — skipped placeholder |
| M12 | Management of Change (MoC) | Planned — skipped placeholder |
| M13 | Risk Management | Existing access smoke test; not live-verified |
| M14 | Reporting / Enablon Reporting | Existing access smoke test; not live-verified |
| M15 | Heritage | Planned — skipped placeholder |

## Structure

```text
framework/common/
  module-catalog.ts       Canonical M01–M15 names and status
  modules.ts              Existing UAT routes (legacy compatibility)
  auth.ts                 Shared login/navigation
  test-data.ts            Local scope/role data loader
  evidence.ts             Read-only result evidence
framework/test-cases/
  coded-module-access.ts  Code-based suite registration
  module-access.ts        Existing shared access test
 tests/modules/M01–M15-Heritage/   One folder per module: access.spec.ts and README.md
 tests/create-event.spec.ts  Existing M05 attended Create Event workflow
 tests/helpers/login.ts     Existing M05 login
 test-data/modules.example.json  Existing access-fixture template
 .local/module-data.json         Private access fixtures (not overwritten)
 .local/event-data.json          Private M05 create data (not overwritten)
```

## Run commands (PowerShell from project root)

List the complete catalogue without opening UAT:

```powershell
npx.cmd playwright test --config=playwright.framework.config.ts --list
```

Run only M05 access checks (after supplying ENABLON_PASSWORD in this terminal):

```powershell
$env:ENABLON_RUN_READONLY = '1'
try {
  npx.cmd playwright test --config=playwright.framework.config.ts --grep 'M05'
} finally {
  Remove-Item Env:ENABLON_RUN_READONLY -ErrorAction SilentlyContinue
}
```

Use `--grep 'M13'` for Risk and Controls. Use the same command without --grep for all access suites. Unimplemented modules are explicitly skipped, never reported as passed.

Existing M05 Create Event remains separate:

```powershell
npx.cmd playwright test --config=playwright.enablon.config.ts
```

This remains attended and preview-only unless ENABLON_SAVE=1. Module-suite execution never invokes Create Event.

## Data and implementation rules

Existing fixture keys remain compatible: M01 = actionPlans; M05 = events; M13 = risk + controls; M14 = reports. The legacy audits fixture is retained but excluded from the canonical run pending Audit/Inspections route verification. Role names in fixture data are labels, not proof of the logged-in user's permissions.

Do not fabricate module URLs, role names, record IDs or selectors. Implement a planned module only after confirming its route, required platform, observable access marker and account permissions. Add separate files for create, edit, validation and role tests with case IDs such as M05-CREATE-001. Extend local fixture data and the loader together.

HERO Mobile is catalogued only; native mobile testing is not implemented. The old flat tests/modules/*.spec.ts files are preserved for reference but excluded by the new framework config, avoiding duplicate access runs. Existing FRAMEWORK.md and legacy case catalogue are retained as historical documentation; this document is the canonical module map.

Secrets must remain runtime-only. Trace and automatic screenshots are disabled in the canonical config; the existing access helper still attaches a post-login screenshot, so reports may contain UAT business data and must not be committed.

