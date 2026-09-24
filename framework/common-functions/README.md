# Common functions

login.ts opens only https://fortescue-ehs-az.uat.ap.enablon.io/ and authenticates, remaining on the application's post-login landing page. It contains no Events URL or module navigation. It checks for an authenticated main page and profile marker; this landing-page check still needs live verification.

navigate-to-events.ts separately navigates an authenticated session to Events. Its read-only test is framework/tests/common/events-navigation.spec.ts. Run it with `npx.cmd playwright test --config=playwright.navigation.config.ts`. The login-only config does not discover this test. The existing M05 wrapper explicitly calls login followed by navigateToEvents and checks create permission.

## Login-only test

Automation: framework/tests/common/login.spec.ts (AUTH-001).
Configuration: playwright.login.config.ts at project root.

In the VS Code PowerShell terminal, enter your username and password when prompted:

```powershell
$env:ENABLON_USERNAME = Read-Host 'Enablon username'
$loginSecret = Read-Host 'Enablon password' -AsSecureString
$env:ENABLON_PASSWORD = [System.Net.NetworkCredential]::new('', $loginSecret).Password
try {
    npx.cmd playwright test --config=playwright.login.config.ts
} finally {
    Remove-Item Env:ENABLON_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable loginSecret -ErrorAction SilentlyContinue
}
```

Do not replace selector labels (Username, Password) with credentials. No password is saved to files or Git. Login-only screenshots, traces and videos are disabled. One attempt is made, with no automatic retries. This test is separate from both the module suite and Create Event suite.

## Reuse

From a module test one directory below framework/tests:

```typescript
import { login } from '../../common-functions/login';
await login(page);
```

Optional LoginOptions accept username and password from runtime configuration. Never hardcode a password. No live login or navigation has been verified by scaffolding these helpers.
