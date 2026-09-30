# CreateActionPlans

The test is `framework/tests/M01-Action-Plans/CreateActionPlans.spec.ts` / `CreateActionPlans`. Run it only through
`playwright.action-plans.config.ts`; the existing default read-only suite is unchanged.

This is a **write-capable UAT happy-path test**, not a field-validation suite or a
production script. It creates one uniquely titled, non-recurring Standard Action,
retains the record and may generate normal workflow notifications.

## Workflow

| Step | Logged-in role | Expected Approval Level / Status |
| --- | --- | --- |
| Create, save, edit description, save and reopen | `Action.Actioncontributor1` | Draft / Not Started |
| Assign | Creator | Assigned / In Progress |
| Add completion notes and complete | `ActionPlan.Actioncontributor2` | L1 Verifier / Pending Verification |
| L1 verification | `ActionPlan.ActionL1Reviewer` | L2 Verifier / Pending Verification |
| L2 verification | `ActionPlan.ActionL2Reviewer` | L3 Approver / Pending Verification |
| L3 approval | `ActionPlan.ActionL3Approver` | Validated / Completed |
| Reopen the same ID and check saved final state | L3 | Validated / Completed |

Each participant signs in through the shared login helper, then signs out.
Every participant also gets an empty, isolated browser context. No saved login state
or administrative approval-level override is used. The known landing-page error is
recovered once with **Return to Home page**; credentials are never retried automatically.

## Setup

From the `PlayWrightAutomation` repository root, create a local, git-ignored fixture:

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item -LiteralPath 'framework/tests/M01-Action-Plans/data.example.json' -Destination .local/action-plan.json
```

Review the organisational hierarchy, entity, people, exact autocomplete option text,
workflow action labels, and evidence requirements. Set `approvedForUat` to `true`
only in the local copy. The default case has evidence **not required**, so it does
not pretend to validate mandatory-evidence enforcement. For that variant, set
`completionEvidenceRequired=true` and provide approved UAT evidence paths in
`evidenceFiles` (relative to the local JSON file or absolute).

The role keys reuse `framework/test-data/M01-Action-Plans/roles.example.json`.
Set these environment variables in the test process through your approved secret
mechanism; do not put password values in JSON or source code:

- `ENABLON_ACTION_ACTIONCONTRIBUTOR1_PASSWORD`
- `ENABLON_ACTIONPLAN_ACTIONCONTRIBUTOR2_PASSWORD`
- `ENABLON_ACTIONPLAN_ACTIONL1REVIEWER_PASSWORD`
- `ENABLON_ACTIONPLAN_ACTIONL2REVIEWER_PASSWORD`
- `ENABLON_ACTIONPLAN_ACTIONL3APPROVER_PASSWORD`

Optional overrides: `ENABLON_ACTIONPLAN_DATA_FILE` and
`ENABLON_ACTIONPLAN_ROLES_FILE` (relative to the repository root or absolute).
Every credential and evidence path is checked before creating a record. The five
identities must be distinct. Do not use production credentials or fixtures.

## Run

```powershell
$env:ENABLON_RUN_ACTIONPLAN_CREATE = '1'
$env:ENABLON_SAVE = '1'
npx playwright test --config=playwright.action-plans.config.ts --grep CreateActionPlans
npx playwright show-report playwright-report/action-plans
```

The dedicated configuration uses Edge, one worker, one project, no retries and no
repeat-each. Without both write flags, the test is **skipped**, not passed.
Do not use UI/watch mode or repeated execution against the same business scenario.

Safe local checks that do not log in or create records:

```powershell
node --test "framework/tests/M01-Action-Plans/fixture.test.mjs"
npx playwright test --config=playwright.action-plans.config.ts --list
```

The fixture unit tests require Node 22.18+ or Node 24 for native TypeScript support.

## Results and failure handling

The HTML report shows named workflow steps, authenticated checkpoint screenshots,
the created ID/title, and a `CreateActionPlans-result` JSON attachment with the
overall result, completed checkpoints and the failed step. A pass requires all
eight checkpoints, final persisted **Validated / Completed**, and successful
logout for every participant. No traces/videos capture credential entry.

On failure, inspect the retained ID/title before rerunning; the script deliberately
does not retry a save/approval, delete records, skip approvers or modify an existing
unrelated plan. If Save succeeded but the ID could not be read, search the unique
title in the result attachment before retrying.

## Verification boundary

This script uses the Action Plans controls and workflow states previously observed
in this UAT environment. It still needs its first live execution as a new script.
The responsible-person, L1 and L2 action labels default to `Complete`; confirm them
against the currently deployed workflow and change only the corresponding
`actions` values if needed (`Complete`, `Approve`, `Validate`, or
`Submit for Verification`). The L3 `More… > Complete` path was observed previously.
The optional Completion Evidence upload branch also needs live confirmation.

A missing control, unexpected confirmation, inaccessible record or incorrect stage
fails the test. It is not treated as a successful approval. Local fixture tests and
test discovery are not proof that the live UAT workflow passed.
