# M05 — Events / Incident Management

## Locations

- Automation: framework/tests/M05-Events-Incident-Management/
- Case register: test-cases/M05-Events-Incident-Management/test-cases.md
- Example data: framework/test-data/M05-Events-Incident-Management/event.example.json
- Private working data: framework/test-data/M05-Events-Incident-Management/.local/event-data.json (Git ignored)
- Login helper: helpers/login.ts in this test folder; password remains runtime-only.

From the project root:

```powershell
npx.cmd playwright test --config=playwright.enablon.config.ts
```

The dedicated config runs Create Event only. Its existing preview, manual review and ENABLON_SAVE safeguards remain unchanged. ENABLON_DATA can override the private data path. Do not add this write-capable test to a general module run.

access.spec.ts contains a separately gated login/access check; cases.spec.ts remains a skipped business-case template. Existing M05 field-selector verification is still pending; moving files does not verify an end-to-end run.
