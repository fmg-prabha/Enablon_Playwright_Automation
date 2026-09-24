# Enablon UAT test-case catalogue

| ID | Module | Test case | Default execution |
| --- | --- | --- | --- |
| EVT-001 | Events | Authorised user opens Events and sees the profile marker. | Read-only |
| EVT-002 | Events | Create a Health & Safety Incident with mandatory fields. | Save gated |
| EVT-003 | Events | Mandatory-field validation blocks a blank Event. | Save gated |
| RSK-001 | Risk Management | Authorised user opens Risks and sees the profile marker. | Read-only |
| RSK-002 | Risk Management | Create, submit and verify a Risk with inherited attribution. | Save gated |
| RSK-003 | Risk Management | Verify BowTie causes, consequences and controls. | Read-only / fixture required |
| CTL-001 | Control Management | Authorised user opens Controls Library. | Read-only |
| CTL-002 | Control Management | Create and implement a Control; verify synchronization. | Save gated |
| AUD-001 | Audits and CCV | Authorised user opens Checklist Definitions. | Read-only |
| AUD-002 | Audits and CCV | Create/publish checklist and validate questionnaire generation. | Save gated |
| AP-001 | Action Plans | Authorised user opens Action Plans. | Read-only |
| AP-002 | Action Plans | Create, assign and complete a corrective action. | Save gated |
| RPT-001 | Reports | Authorised user opens the Risk report folder. | Read-only |
| RPT-002 | Reports | Apply criteria and verify record drill-through. | Read-only |

Save-gated cases must use a unique synthetic run ID, run with one worker and no retries, capture evidence, and either clean up or record the created fixture ID.
