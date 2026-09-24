# Module-wise test cases and data

All 15 modules use the same descriptive folder name in three locations:

```text
tests/modules/M01-Action-Plans/     Automated tests
test-cases/M01-Action-Plans/        Case register and detailed steps
test-data/M01-Action-Plans/         Non-secret data templates
```

- M01-Action-Plans
- M02-Approvals
- M03-Audit
- M04-Contractor-Management-CSM
- M05-Events-Incident-Management
- M06-Field-Leadership
- M07-HERO-Mobile-Application
- M08-Inspections
- M09-Job-Hazard-Analysis-JHA
- M10-Occupational-Health
- M11-Obligations-Compliance
- M12-Management-of-Change-MoC
- M13-Risk-Management
- M14-Reporting-Enablon-Reporting
- M15-Heritage

Edit `test-cases/<module>/test-cases.md` to define cases later. Implement approved cases in `tests/modules/<module>/cases.spec.ts`; placeholders remain skipped.

Each `test-data/<module>/data.example.json` has an empty cases array. Add data entries keyed by case ID only when requirements are known. These new templates are not automatically loaded by existing tests. Existing private .local/module-data.json and .local/event-data.json remain unchanged and continue to supply current workflows. Do not store passwords or sensitive records in the new templates.

Existing M05 Create Event stays in tests/create-event.spec.ts and uses its separate config. Module naming changes do not enable record creation.

```powershell
npx.cmd playwright test --config=playwright.framework.config.ts --list
```

