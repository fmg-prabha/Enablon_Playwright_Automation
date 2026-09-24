# Module-wise test-case structure

Each of the 15 modules has the same structure:

```text
tests/modules/
  M01-Action-Plans/ ... M15-Heritage/
    README.md       Module scope and implementation status
    access.spec.ts  Existing access smoke test or skipped access placeholder
    test-cases.md   Editable case register and detailed step template
    cases.spec.ts   Skipped business-test scaffold
```

## Modules

- [M01 — Action Plans](test-cases/M01-Action-Plans/test-cases.md)
- [M02 — Approvals](test-cases/M02-Approvals/test-cases.md)
- [M03 — Audit](test-cases/M03-Audit/test-cases.md)
- [M04 — Contractor Management / CSM](test-cases/M04-Contractor-Management-CSM/test-cases.md)
- [M05 — Events / Incident Management](test-cases/M05-Events-Incident-Management/test-cases.md)
- [M06 — Field Leadership](test-cases/M06-Field-Leadership/test-cases.md)
- [M07 — HERO Mobile Application](test-cases/M07-HERO-Mobile-Application/test-cases.md)
- [M08 — Inspections](test-cases/M08-Inspections/test-cases.md)
- [M09 — Job Hazard Analysis (JHA)](test-cases/M09-Job-Hazard-Analysis-JHA/test-cases.md)
- [M10 — Occupational Health](test-cases/M10-Occupational-Health/test-cases.md)
- [M11 — Obligations / Compliance](test-cases/M11-Obligations-Compliance/test-cases.md)
- [M12 — Management of Change (MoC)](test-cases/M12-Management-of-Change-MoC/test-cases.md)
- [M13 — Risk Management](test-cases/M13-Risk-Management/test-cases.md)
- [M14 — Reporting / Enablon Reporting](test-cases/M14-Reporting-Enablon-Reporting/test-cases.md)
- [M15 — Heritage](test-cases/M15-Heritage/test-cases.md)

## Add cases later

1. Write the case in the module's test-cases.md. Use stable IDs such as M05-TC-001.
2. Fill in role, preconditions, test-data reference, actions and expected results.
3. Implement it in that module's cases.spec.ts; remove test.skip only when complete.
4. Keep secrets out of source code and case documents. Use runtime authentication and private UAT fixtures.
5. Confirm save/submit authorization and a separate write gate before enabling a mutating case.

All new business cases are deliberately skipped and contain a fail-fast guard if enabled without implementation. No selectors or business outcomes have been invented. Existing M05 Create Event remains separate and unchanged.

List all cases:

```powershell
npx.cmd playwright test --config=playwright.framework.config.ts --list
```

List M05 only:

```powershell
npx.cmd playwright test --config=playwright.framework.config.ts --grep M05 --list
```

