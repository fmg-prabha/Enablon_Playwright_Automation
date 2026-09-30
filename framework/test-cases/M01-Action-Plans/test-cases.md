# M01 — Action Plans: test cases

Status: M01-TC-001 is drafted. Automation remains blocked until the UAT form fields, test values, expected saved status, and cleanup approach are confirmed.

## Case register

| Test case ID | Title | Category | Priority | Role | Data reference | Status | Automation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M01-TC-001 | M01-TC-001-CreateActionPlan | Create | TBD | Action.Actioncontributor1 | M01 data fixture (to be completed) | Draft | cases.spec.ts (fixme) |

The access/navigation smoke test remains separate and is not evidence of business-case coverage.

## M01-TC-001-CreateActionPlan

- Requirement/reference: User-provided request to create a new Action Plan.
- Objective: Create an Action Plan and verify the saved record and expected status.
- Category/priority: Create / TBD.
- Preconditions and record state: Enablon UAT available; Action.Actioncontributor1 can create Action Plans; approved unique test data is available.
- User role: Action.Actioncontributor1.
- Test data reference: `framework/test-data/M01-Action-Plans/data.example.json` (required fields and approved values not yet supplied).
- Platform/device: Desktop Edge, per the framework configuration.
- Execution type: Write-capable.
- Save gate: Keep skipped until the form mapping, data, expected result, and cleanup plan are approved. When implemented, require `ENABLON_RUN_ACTIONPLAN_CREATE=1` before saving.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Sign in as Action.Actioncontributor1. | Authenticated Enablon UAT session. |
| 2 | Navigate using Apps > Action Plans > Action Plans > Action Plans. | Action Plans list is open. |
| 3 | Click **Create a new Action Plan**. | The Action Plan creation form opens. |
| 4 | Complete all required fields using approved M01 test data. | Values are accepted; exact fields and selectors must be confirmed in UAT. |
| 5 | Save the Action Plan once. | A new record is saved and has the approved initial status. |
| 6 | Find the new record and verify its identifier, key field values, and status. | Saved data matches the fixture and expected status. |

- Postconditions/cleanup: Define an approved cleanup approach before enabling the save step; do not delete or modify records without an approved cleanup rule.
- Evidence required: New Action Plan identifier, saved field values, and status in the Playwright report.
- Automation status: Scaffold only; skipped until required form labels, test data, expected status, and cleanup are confirmed.

Duplicate this section for additional cases. Do not add passwords, personal information, or production records.
