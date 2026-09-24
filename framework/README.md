# Enablon automation framework

## Canonical structure

```text
framework/
  test-cases/
    M01-Action-Plans/ ... M15-Heritage/    Case registers and detailed steps
  test-data/
    M01-Action-Plans/ ... M15-Heritage/    Module data templates
    M05-Events-Incident-Management/.local/event-data.json  Private Events data
    .local/module-data.json               Optional private access fixtures
  tests/
    M01-Action-Plans/ ... M15-Heritage/    Module automation
    M05-Events-Incident-Management/helpers/login.ts
    shared/module-access.ts              Shared read-only access implementation
    legacy/                              Preserved older examples, excluded from discovery
  docs/                                  Earlier guides retained for reference
```

All module tests, case documents and data now live under framework. Old guides in docs are historical; this README is the current path reference. Module-folder READMEs may describe older locations; use the matching folders above.

## Commands (project root)

List the module suite, without logging in:

```powershell
npx.cmd playwright test --list
```

List only Events access/business cases:

```powershell
npx.cmd playwright test --grep M05 --list
```

Run the existing attended Create Event workflow separately:

```powershell
npx.cmd playwright test --config=playwright.enablon.config.ts
```

The root Playwright config delegates to the module config. Create Event is deliberately excluded from it. Existing Create Event login, preview/cancel and ENABLON_SAVE safeguards remain unchanged.

## Data and safety

The password remains in ENABLON_PASSWORD only; no credential file is created. Nested .local directories are Git ignored. Existing private Events data is preserved. ENABLON_DATA overrides the Events data path. ENABLON_MODULE_DATA overrides the shared module-fixture path. New per-module data.example.json files remain templates, not auto-loaded fixtures.

Read-only access checks require ENABLON_RUN_READONLY=1. Undefined module access cases and business-case placeholders stay skipped. Access checks do not prove all module permissions. Shared helpers were rebuilt because the old helpers were missing; only test discovery has been verified, not live access.

Essential package files, Playwright entry configs, .gitignore, dependencies and generated reports remain at project root. No business files were deleted. Legacy specs are archived under tests/legacy and excluded from both active configs.

