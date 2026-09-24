# M05 Create Event selector review

Evidence: supplied failing run and its local Playwright page snapshot, 23 September 2026. This is not a claim of end-to-end validation.

| Control | Selector / data | Evidence status |
| --- | --- | --- |
| Login and navigation | Common helpers; Apps sidebar-application-IMS | User run reached Event form |
| Add a new Event | Exact button name | User run opened form |
| Entity | combobox Entity; Solomon | Selected in snapshot |
| Org Hierarchy | combobox Org Hierarchy; Aerodrome Solomon | Selected in snapshot |
| Event Type | combobox Event Type; Incident | Selected in snapshot |
| Classification | combobox Classification; Health & Safety | User run passed selection checks |
| Location | combobox Location; option Sol - Solomon Drive | Exact option observed; selected display still needs live confirmation |
| Event Title | textbox Event Title | Present; final filling not reached |
| Specific Area | textbox Specific Area | Present; filling not reached |
| Description | iframe #rte_fld_XEventsd_ifr, #tinymce | Editor present; IDs retained from earlier inspection, not reverified by latest snapshot |
| Emergency Response Initiated? | Exact group and Yes/No radio | Present; checking not reached |
| Release of Energy? | Exact group and Yes/No radio | Present; checking not reached |
| Immediate Actions Taken | Exact textbox name | Present; filling not reached |
| Reported by / Supervisor | Exact combobox names | Preselected values visible |
| Event Owner / Lead Investigator | Exact combobox names | Present; suggestions and selection not yet verified |
| Save / Cancel | Existing exact button-name selectors | Controls present; interaction not reached |

Private Location data now uses query Solomon Drive, displayValue Sol - Solomon Drive and optionText Sol - Solomon Drive. The full prefix is preserved to avoid selecting a different location. Other private fixture values are unchanged.

Before preview or Save, the script checks selected lookup IDs and displayed values, text fields and radios again. Future lookup errors report actual candidates rather than only a zero-match count. Do not commit run output containing private lookup results. A complete preview run with runtime credentials is still needed; no record was saved during this review.
