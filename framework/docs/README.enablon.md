# Enablon Create Event test

Uses selectors inspected in the UAT Create Event form on 21 September 2026. Supports Health & Safety Incidents. It does not submit/validate records, add impacts or attachments, or test role permissions.

## Setup

Your local `.local/event-data.json` is prefilled with the requested Solomon UAT test values. For a fresh checkout, create the file from the example. From the PlayWrightAutomation folder in the VS Code PowerShell terminal:

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item test-data/event.example.json .local/event-data.json -Confirm
```

Edit `.local/event-data.json`. Set `query` (unique search text) and `displayValue` (the exact label shown after selection) for Entity, Org Hierarchy, Location, Event Owner and Lead Investigator. Do not run with blanks. The test reports all missing fields together.

The lookup helper selects only one matching primary suggestion. Trailing numeric IDs and role annotations, such as `(123456) {Central Admin}`, are ignored when comparing names. Where labels repeat, use a more specific query or add `optionText` with the full suggestion text including its secondary code. It refuses ambiguous matches. Reporter and Supervisor default to Enablon's preselected values when their JSON value is null; set lookup objects to override them.

## Preview first

```powershell
$env:ENABLON_USERNAME = 'EventSupervisor'
$loginSecret = Read-Host 'Enablon password (include any literal backslash)' -AsSecureString
$env:ENABLON_PASSWORD = [System.Net.NetworkCredential]::new('', $loginSecret).Password
try {
    npx.cmd playwright test --config=playwright.enablon.config.ts
} finally {
    Remove-Item Env:ENABLON_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable loginSecret -ErrorAction SilentlyContinue
}
```

The test calls `login(page)` from `tests/helpers/login.ts`. It selects Sign in with credentials and fills the observed Username and Password fields. It submits once and reports Login failed without retrying. The password is passed through the process environment, never hardcoded or saved to a file. The prompt above keeps it out of shell history. Use your confirmed password exactly; a backslash is literal at this prompt.

After filling the Event, the test pauses again for review. Click Resume to cancel the unsaved form and finish. Do not manually save during a preview. A passing preview means the form was populated and cancelled, not that an Event was created.

## Save one Event

```powershell
$env:ENABLON_SAVE = '1'
try {
    npx.cmd playwright test --config=playwright.enablon.config.ts
} finally {
    Remove-Item Env:ENABLON_SAVE -ErrorAction SilentlyContinue
}
```

This clicks Save once. It then pauses so you can check the Event ID and open the saved read-only detail page. Resume performs a reload and checks the unique title remains visible. If Enablon returns to the list after reload, verification fails even if Save succeeded: inspect/search the unique title before rerunning. The test does not claim success just because it clicked Save. It never clicks Submit.

Use the separate config: it selects one Chromium project, one worker and zero retries. Do not add `--repeat-each` or retries. The test skips under the existing general three-browser config to prevent accidental repeated creation.

The config uses installed Microsoft Edge (`channel: 'msedge'`), so no Playwright Chromium download is required. Set the login environment variables as above before a save run too.

## Reports and Git

```powershell
npx.cmd playwright show-report playwright-report/enablon
```

The report includes an `event-result` attachment with the unique title and outcome. Authentication state is not saved. Trace, screenshots and videos are off to avoid recording the manual login. Do not commit test results, reports, passwords or `.local` test data. The added ignore rules cover them.

Commit `tests/create-event.spec.ts`, `tests/helpers/login.ts`, `playwright.enablon.config.ts`, `test-data/event.example.json`, this README and `.gitignore` to the approved repository.

## Validation status

Selectors come from live browser inspection. The test is provided for an attended first run with your chosen test data. No live Event was created as part of generating this script. Test discovery alone is not end-to-end execution verification.
