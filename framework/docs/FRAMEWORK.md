# Enablon Playwright framework

## 1. Common functions

`framework/common` contains reusable UAT authentication, module navigation, evidence attachment and local test-data loading. No password belongs in source code or a JSON data file.

## 2. Test data

Copy `test-data/modules.example.json` to `.local/module-data.json`. Replace only placeholder record IDs and scope values with valid UAT fixtures. Keep `.local` out of source control.

## 3. Test cases

`test-cases/catalog.md` lists all module tests and whether a test is read-only or save-gated. `tests/modules` contains the common read-only access cases. Add each save-gated workflow only after recording its selectors and confirming its test account.

## Run read-only module checks

```powershell
$env:ENABLON_USERNAME = 'your-test-account'
$env:ENABLON_PASSWORD = 'your-password'
$env:ENABLON_RUN_READONLY = '1'
& npx.cmd playwright test --config=playwright.framework.config.ts --workers=1
```

The module tests are skipped unless `ENABLON_RUN_READONLY=1`. They navigate and capture evidence only; they do not create, edit or save Enablon records.
