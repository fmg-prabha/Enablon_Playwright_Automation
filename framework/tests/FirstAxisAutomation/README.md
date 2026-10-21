# FirstAxis location lookup automation

The `locations.spec.ts` test reads `Entity`, `Location`, and `Active` values from `Locations-UAT_Test.xlsx`. It signs in with the `eventfrontline` account, navigates to Events, opens **Add a new Event** for each row, and checks the location autocomplete without saving an Event.

Entity suggestions are matched by their visible entity name and any suggestion whose Org Hierarchy contains `TST` is excluded.

- `Active = Yes`: the matching Location option must appear and be selectable, populating the lookup value.
- `Active = No`: the matching Location option must not appear and the hidden lookup value must remain empty. The exact empty-state message is not used to decide the result.
- Each evaluated row is written as `PASS` or `FAIL` into its `Test Result` cell. A row-level failure does not stop later rows from being checked.
- The required `Comment` column receives the assertion or form-cleanup error for FAIL rows. PASS clears any previous comment. The header is matched by name, so the column does not need a fixed position. Comments also populate when restoring a checkpoint containing failure details; older results without details receive an explanatory placeholder.

The test is gated because it opens the live UAT application. From the repository root, point `FIRSTAXIS_LOCATIONS_FILE` at the workbook if it is not in the current user's Downloads folder, then run:

```powershell
$env:ENABLON_USERNAME = 'eventfrontline  '
$loginSecret = Read-Host 'Enablon password' -AsSecureString
$env:ENABLON_PASSWORD = [System.Net.NetworkCredential]::new('', $loginSecret).Password
$env:ENABLON_RUN_FIRSTAXIS = '1'
$env:FIRSTAXIS_LOCATIONS_FILE = 'C:\Users\<user>\Downloads\Locations-UAT_Test.xlsx'
try {
    npx.cmd playwright test --config=playwright.firstaxis.config.ts
} finally {
    Remove-Item Env:ENABLON_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ENABLON_USERNAME -ErrorAction SilentlyContinue
    Remove-Item Env:ENABLON_RUN_FIRSTAXIS -ErrorAction SilentlyContinue
    Remove-Variable loginSecret -ErrorAction SilentlyContinue
}
```

No Event is saved. The workbook is modified in place after the lookup checks. The helper connects to the open workbook in Excel when available, or opens it through Excel automation when it is closed. The password is prompted securely and passed only through the process environment; it is not stored in the script or workbook.

The test timeout scales with the workbook size: at least 20 minutes, or five minutes plus three minutes per data row. After each row, the test verifies that the Events list is restored. If Cancel fails, it navigates back to the Events list without saving. If recovery fails, the run stops after recording the current row, leaving subsequent rows untouched.

To resume an unchanged workbook, set `$env:FIRSTAXIS_RESUME = '1'` before running. Rows already marked PASS are skipped; FAIL and unfinished rows are checked again. Remove that variable (or set it to `0`) for a fresh full run. Do not resume after changing the workbook data or when you need to validate UAT changes against previously passed rows.

Each run also saves cumulative checked results to `artifacts/firstaxis/results-<timestamp>.json` before attempting the Excel update. These checkpoints survive subsequent Playwright runs. Excel writes have a two-minute timeout; a write failure stops the run with the checkpoint path. The timeout does not prove whether the save itself succeeded.

After saving your work and closing Excel or dismissing any Excel dialogs, apply a checkpoint to the same unchanged workbook with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\framework\tests\FirstAxisAutomation\locations-workbook.ps1 -Mode Write -Workbook $env:FIRSTAXIS_LOCATIONS_FILE -ResultsJson '.\artifacts\firstaxis\results-<timestamp>.json'
```

Then resume. Checkpoints match workbook rows by row number, so do not use them after inserting, deleting, sorting, or editing the data rows.
