# UAT Test Set — Propel Onboarding Form

**Version**: 1.0.2
**Date**: 2026-02-04
**Tester**: _______________
**Environment**: _______________
**Browser**: _______________

> **How to use this document**: Work through each test case in order. Mark the Result column with **PASS**, **FAIL**, or **SKIP**. For failures, note the actual behavior in the Notes column.

---

## Section 1: Authentication

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.1 | Login page displays on first visit | Navigate to the app URL | Login page shows with "Propel Onboarding" title, email input, and "Send sign-in link" button | | |
| 1.2 | Magic link sent for valid email | Enter a valid email address, click "Send sign-in link" | "Check your email" screen displays with email icon and the user's email address | | |
| 1.3 | Error shown for invalid email | Enter an invalid email (e.g., "notanemail"), click "Send sign-in link" | Browser validation prevents submission OR error message displays | | |
| 1.4 | Magic link authenticates user | Click the magic link received via email | User is redirected to the app and sees the form wizard (loading spinner, then form) | | |
| 1.5 | Sign out works | Click the user/auth button in the header, sign out | User returns to login page; refreshing page still shows login | | |

---

## Section 2: Step 1 — Program Selection

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.1 | All three programs displayed | View Step 1 after login | Three radio cards shown: Prevention4ME (P4M), Precision4ME (PR4M), GenoRx (GRX) with descriptions | | |
| 2.2 | Selecting a program highlights it | Click "Prevention4ME" | Card shows teal border/highlight, radio button selected | | |
| 2.3 | Cannot advance without selection | Click "Next" without selecting a program | Error message appears: "Select Program is required" | | |
| 2.4 | Can advance with selection | Select "Prevention4ME", click "Next" | Moves to Step 2 (Clinic Information) | | |

---

## Section 3: Step 2 — Clinic Information

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.1 | Required fields enforced | Leave all fields empty, click "Next" | Errors shown for: Clinic Name, Clinic EPIC ID, Clinic Address (street/city/state/zip), Timezone, Clinic Office Phone Number | | |
| 3.2 | Clinic Name accepts text | Enter "Montana Breast Care Center" | Value displays correctly in field | | |
| 3.3 | Clinic Name checkbox toggles | Check "Use this clinic name for patient emails and SMS" | Checkbox checked, value stored | | |
| 3.4 | Clinic EPIC ID accepts text | Enter "12345" | Value displays correctly | | |
| 3.5 | Clinic Address composite renders | Observe the Clinic Address section | Shows Street Address, City, State (dropdown), ZIP Code fields grouped in a gray box | | |
| 3.6 | Clinic Address state dropdown | Click the State dropdown | Shows all US state abbreviations | | |
| 3.7 | ZIP Code validates format | Enter "9720" (4 digits) in ZIP, click Next | Error shown (requires 5-digit or 5+4 format) | | |
| 3.8 | ZIP Code accepts valid format | Enter "97201" or "97201-1234" | No error | | |
| 3.9 | Timezone dropdown populated | Click the Timezone dropdown | Shows timezone options (e.g., America/Los_Angeles, America/Denver) | | |
| 3.10 | Clinic phone validates format | Enter "555-123" (incomplete), click Next | Error shown: "Main clinic phone number (10 digits)" pattern error | | |
| 3.11 | Clinic phone accepts valid format | Enter "555-123-4567" | No error | | |
| 3.12 | Helpdesk fields are hidden initially | Observe page without checking helpdesk checkbox | "Patient Helpline Phone Number", "Helpline Hours of Operation", and associated checkboxes are NOT visible | | |
| 3.13 | Helpdesk checkbox reveals fields | Check "Does this clinic have a separate patient-facing helpline?" | "Patient Helpline Phone Number", "Helpline Hours of Operation", and email checkboxes appear | | |
| 3.14 | Helpdesk phone validates format | Enter "123" in Patient Helpline Phone, click Next | Pattern error shown | | |
| 3.15 | Unchecking helpdesk hides fields again | Uncheck the helpdesk checkbox | All helpdesk-related fields disappear | | |
| 3.16 | Website fields are optional | Leave both website fields blank, fill all required fields, click Next | Advances to Step 3 without error | | |
| 3.17 | Hours of operation is optional | Leave Hours of Operation blank, fill all required fields, click Next | Advances without error | | |

---

## Section 4: Step 3 — Contacts

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.1 | Contact group renders all sub-fields | Observe the Clinic Champion section | Shows Name, Title, Email, Phone, Preferred Contact Method, and Best Time to Reach fields in a gray group box | | |
| 4.2 | Clinic Champion is required | Leave Clinic Champion empty, click Next | Errors shown for Name and Email (required sub-fields) | | |
| 4.3 | Clinic Champion accepts valid data | Enter Name: "Jane Smith", Email: "jane@clinic.org" | Fields accept input, no errors | | |
| 4.4 | Email validation on contact fields | Enter "notanemail" in Clinic Champion email, click Next | Email format error shown | | |
| 4.5 | Phone validation on contact fields | Enter "123" in Clinic Champion phone, click Next | Phone format error shown | | |
| 4.6 | Champion is primary hides Primary Contact | Check "Clinic Champion is also the Primary Point of Contact" | Primary Contact section disappears | | |
| 4.7 | Unchecking champion reveals Primary Contact | Uncheck "Clinic Champion is also the Primary Point of Contact" | Primary Contact section reappears | | |
| 4.8 | Primary Contact required when visible | Leave champion_is_primary unchecked, leave Primary Contact empty, click Next | Errors shown on Primary Contact Name and Email | | |
| 4.9 | Genetic Counselor is required | Leave Genetic Counselor empty, click Next | Errors shown for Name and Email | | |
| 4.10 | Optional contacts can be skipped | Leave Secondary Contact, IT Contact, Lab Contact all empty, fill required contacts, click Next | Advances to Step 4 without error | | |
| 4.11 | Preferred contact method dropdown | Click the Preferred Contact Method dropdown in any contact group | Shows options (Email, Phone, etc.) | | |
| 4.12 | Best Time to Reach dropdown | Click the Best Time to Reach dropdown | Shows time options (Morning, Afternoon, etc.) | | |

---

## Section 5: Step 4 — Key Stakeholders

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 5.1 | All stakeholder fields are optional | Leave all fields empty, click Next | Advances to Step 5 without error | | |
| 5.2 | Stakeholder group renders correctly | Observe Program Champion section | Shows Name, Title, Email, Phone, and "This stakeholder is also an ordering provider" checkbox | | |
| 5.3 | Stakeholder email validates | Enter "bad-email" in Program Champion email, click Next | Email format error shown | | |
| 5.4 | Ordering provider checkbox | Check "This stakeholder is also an ordering provider" on a stakeholder | Checkbox checked, value stored | | |

---

## Section 6: Step 5 — Lab Configuration

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.1 | Lab Partner auto-filtered by program | With P4M selected on Step 1, view Lab Partner dropdown | Only "Ambry" (AMBRY) is available | | |
| 6.2 | Lab Partner shows Helix for GRX | Go back, change program to GRX, return to Step 5 | Lab Partner dropdown shows only "Helix" (HELIX) | | |
| 6.3 | Test Panel dropdown populated | Select a Lab Partner, click Default Test Panel dropdown | Shows available test panels (e.g., CustomNext-Cancer, CancerNext-Expanded) | | |
| 6.4 | RNAInsight checkbox appears after panel selection | Select any test panel | "Include RNAInsight" checkbox appears | | |
| 6.5 | RNAInsight hidden when no panel selected | Clear test panel selection | "Include RNAInsight" checkbox disappears | | |
| 6.6 | Gene selector appears for CustomNext-Cancer | Select "CustomNext-Cancer" as Default Test Panel | Gene selector component appears with 90 available genes, ~85 pre-selected by default | | |
| 6.7 | Gene selector hidden for other panels | Select "CancerNext-Expanded" instead | Gene selector disappears | | |
| 6.8 | Gene selector — deselect a gene | With CustomNext-Cancer selected, uncheck "BRCA1" | BRCA1 is removed from selected genes, count decreases by 1 | | |
| 6.9 | Gene selector — select a gene | Check a previously unchecked gene (e.g., "CFTR") | Gene is added, count increases by 1 | | |
| 6.10 | Gene selector required | Clear all gene selections, click Next | Error: "Please select at least one gene" | | |
| 6.11 | Specimen Type renders as select-with-alternates | Observe the Default Specimen Collection Type | Shows a dropdown for default selection and an "Offer additional sample type options" checkbox | | |
| 6.12 | Specimen Type alternates checkbox | Check "Offer additional sample type options" | Additional specimen type checkboxes appear | | |
| 6.13 | Billing Method dropdown | Click the Billing Method dropdown | Shows billing method options | | |
| 6.14 | Send Kit to Patient radio | Observe "Send Kit to Patient's Home?" | Shows radio options (Yes/No or similar) | | |
| 6.15 | Indication visible for P4M/PR4M only | With P4M selected, observe | "Default Indication" dropdown is visible | | |
| 6.16 | Indication hidden for GRX | With GRX selected, observe | "Default Indication" dropdown is NOT visible | | |
| 6.17 | Criteria visible for P4M/PR4M only | With P4M selected, observe | "Default Criteria" dropdown is visible | | |
| 6.18 | All required fields validated | Leave required fields empty, click Next | Errors shown for Lab Partner, Test Panel, Specimen Type, Billing Method, Send Kit, and (if P4M) Indication, Criteria | | |

---

## Section 7: Step 6 — Additional Test Panels (Repeatable)

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.1 | Step is optional (0 min items) | Click Next without adding any panels | Advances to Step 7 without error | | |
| 7.2 | Add Test Panel button works | Click "Add Test Panel" | New panel section appears (Panel 1) with Test Panel dropdown, gene selector (conditional), and Modifications textarea | | |
| 7.3 | Panel dropdown shows all panels | Click the Test Panel dropdown in the new panel | Shows all 5 Ambry test panels (not filtered by Step 5 selection) | | |
| 7.4 | Gene selector appears for CustomNext | Select "CustomNext-Cancer" in the additional panel | Gene selector appears within that panel | | |
| 7.5 | Can add multiple panels | Click "Add Test Panel" again | Panel 2 appears | | |
| 7.6 | Can remove a panel | Click the remove/delete button on Panel 1 | Panel 1 is removed, Panel 2 renumbers to Panel 1 | | |
| 7.7 | Modifications textarea is optional | Add a panel, select a test, leave Modifications blank, click Next | No error on Modifications field | | |

---

## Section 8: Step 7 — Ordering Providers (Repeatable)

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.1 | At least 1 provider required | Remove all providers (if any), click Next | Error: "At least 1 item(s) required" | | |
| 8.2 | Provider 1 auto-populated from stakeholder | If a stakeholder was marked "also ordering provider" on Step 4, observe Provider 1 | Provider 1 is pre-filled with stakeholder name, email, and phone | | |
| 8.3 | Provider required fields validated | Leave Provider Name, Email, Phone, NPI, and Office Address blank, click Next | Errors on all required fields | | |
| 8.4 | Provider email validates | Enter "bademail" in provider email | Email format error shown | | |
| 8.5 | Provider phone validates | Enter "123" in provider phone | Phone format error shown (10 digits required) | | |
| 8.6 | NPI validates 10 digits | Enter "12345" in NPI, click Next | Error: NPI must be 10 digits | | |
| 8.7 | NPI accepts valid 10 digits | Enter "1234567890" in NPI | No error | | |
| 8.8 | Office Address composite renders | Observe Provider Office Address | Shows Street, City, State dropdown, ZIP grouped together | | |
| 8.9 | Specialty dropdown is optional | Leave Specialty blank, fill all required fields, click Next | Advances without error | | |
| 8.10 | Can add multiple providers | Click "Add Provider" | Provider 2 section appears | | |
| 8.11 | Can remove a provider | Click remove on Provider 2 | Provider 2 removed, only Provider 1 remains | | |

---

## Section 9: Step 8 — Extract Filtering

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.1 | Patient Status Filter required | Leave empty, click Next | Error shown | | |
| 9.2 | Procedure Type Filter required | Leave empty, click Next | Error shown | | |
| 9.3 | Custom procedures textarea hidden initially | Observe without checking custom procedures | "Custom Procedure Filter Details" textarea is NOT visible | | |
| 9.4 | Custom procedures checkbox reveals textarea | Check "Use customized procedure filtering" | Textarea appears | | |
| 9.5 | Provider filter list hidden initially | Observe without checking provider filter | "Providers to Include in Extract" is NOT visible | | |
| 9.6 | Provider filter checkbox reveals list | Check "Filter extracts to specific provider(s)" | Provider filter list appears with first/last name inputs | | |
| 9.7 | Provider filter requires at least 1 | Check the filter checkbox, leave the provider list empty, click Next | Error: at least 1 provider required | | |
| 9.8 | Can add/remove filter providers | Add a provider (first: "Jane", last: "Smith"), click "Add Another Provider", then remove the second | Correctly adds and removes entries | | |

---

## Section 10: Step 9 — Review & Download

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.1 | Review page shows all entered data | Complete all steps with valid data, arrive at Review | All sections displayed with entered values, each with an "Edit" button | | |
| 10.2 | Conditional fields hidden in review | For GRX program (no Indication/Criteria), check review | "Default Indication" and "Default Criteria" fields are NOT shown | | |
| 10.3 | Repeatable items displayed | With 2 ordering providers entered, check review | Both providers shown with all field values | | |
| 10.4 | Contact group displays correctly | Check review for Clinic Champion | Shows "Jane Smith (jane@clinic.org)" format | | |
| 10.5 | Address displays correctly | Check review for Clinic Address | Shows "123 Main St, Portland, OR 97201" format | | |
| 10.6 | Gene selector displays in review | With CustomNext-Cancer, check review | Shows gene count and first ~10 genes with "...and X more" | | |
| 10.7 | Specimen type displays correctly | With select_with_alternates, check review | Shows default and any additional options | | |
| 10.8 | Edit button navigates to correct step | Click "Edit" on the Contacts section | Navigates to Step 3 (Contacts) | | |
| 10.9 | After editing, returns to review | Make a change on Step 3, click "Save & Return to Summary" | Returns to Review page with updated data | | |
| 10.10 | Submit button sends to Supabase | Click "Submit to Propel Health" | Loading spinner shows, then success message: "Submission Received!" | | |
| 10.11 | Success state shows after submit | After successful submission | Green success box with checkmark, "Thank you" message, and download links | | |
| 10.12 | Download JSON works | Click "Download JSON" | JSON file downloads with filename like `onboarding-P4M-20260204T...json` | | |
| 10.13 | Download Word works | Click "Download Word" | DOCX file downloads with formatted sections matching the form data | | |
| 10.14 | JSON output structure correct | Open the downloaded JSON | Contains: schema_version, program, clinic_information, contacts, lab_order_configuration (with test_panel), ordering_providers, extract_filtering, metadata | | |

---

## Section 11: Navigation & Progress

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.1 | Progress indicator shows all steps | Observe the step indicator bar | Shows all 9 steps with titles, current step highlighted | | |
| 11.2 | Cannot skip ahead | Click on Step 5 when only on Step 1 | Nothing happens (step is not clickable) | | |
| 11.3 | Can go back to completed steps | Complete Steps 1-3, click on Step 1 in the progress bar | Navigates back to Step 1 with data preserved | | |
| 11.4 | Previous button works | Click "Previous" on Step 3 | Returns to Step 2 with all data intact | | |
| 11.5 | Previous button disabled on Step 1 | Observe on Step 1 | Previous button is grayed out / disabled | | |
| 11.6 | Page scrolls to top on navigation | Navigate from a long step to the next | Page scrolls to top of the form | | |

---

## Section 12: Auto-Save & Resume

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 12.1 | Auto-save to Supabase triggers | Fill in clinic champion email, wait 3+ seconds | Save status bar shows "Saving..." then "Saved" briefly | | |
| 12.2 | Resume button visible | Observe the form header area | "Resume Your Onboarding Form" button is visible | | |
| 12.3 | Resume modal shows drafts | Click "Resume Your Onboarding Form" | Modal opens showing recent drafts (clinic names, programs, dates) | | |
| 12.4 | Resume modal — no drafts | If no drafts exist | Shows "No recent drafts found" message | | |
| 12.5 | Selecting a draft prompts verification | Click on a clinic name in the draft list | Shows "Verify Your Identity" screen with email input | | |
| 12.6 | Correct email restores draft | Enter an email that matches a contact in the draft, click Continue | Form restores with all saved data, navigates to the saved step | | |
| 12.7 | Incorrect email shows error | Enter an email that does NOT match any contact | Error: "Email not recognized for this clinic..." | | |
| 12.8 | Case-insensitive email verification | Enter the correct email but with different casing (e.g., "JANE@CLINIC.ORG") | Verification succeeds | | |
| 12.9 | Close button on resume modal | Click X or "Start New Form Instead" | Modal closes, form remains as-is | | |
| 12.10 | Save Draft to file | Click "Save Draft" in the save status bar | JSON file downloads named `propel-draft-YYYY-MM-DD.json` | | |
| 12.11 | Load Draft from file | Click "Load Draft", select a previously saved draft JSON | Form restores with data from the file | | |
| 12.12 | Start Over clears everything | Click "Start Over", confirm the dialog | Form resets to Step 1 with all fields empty, localStorage cleared | | |

---

## Section 13: Responsive / Mobile

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 13.1 | Login page responsive | View on mobile viewport (375px wide) | Login card stacks vertically, inputs full-width, button accessible | | |
| 13.2 | Form wizard responsive | View form on mobile viewport | Progress indicator adapts, form fields stack vertically, buttons full-width | | |
| 13.3 | Contact group responsive | View a contact group on mobile | Name/Title, Email/Phone, Channel/Time rows stack instead of side-by-side | | |
| 13.4 | Address group responsive | View address on mobile | Street full-width, City/State/ZIP stack vertically | | |
| 13.5 | Review page responsive | View review on mobile | Sections readable, Edit buttons accessible, Download/Submit buttons accessible | | |
| 13.6 | Resume modal responsive | Open resume modal on mobile | Modal fits screen, draft list scrollable, email input accessible | | |

---

## Section 14: Edge Cases & Error Handling

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 14.1 | Refreshing preserves data | Fill in several steps, refresh the browser | Data may be restored from localStorage auto-save | | |
| 14.2 | Tab switch doesn't cause issues | Switch away from the tab for 30+ seconds, return | Form still functional, no errors | | |
| 14.3 | Empty optional composite fields | Leave Secondary Contact completely empty through all steps | No errors anywhere; review shows "Not provided" | | |
| 14.4 | Long text in fields | Enter 200+ characters in Clinic Name | Field accepts up to max_length (200), truncates beyond | | |
| 14.5 | Special characters in text fields | Enter "O'Brien & Associates — Test Clinic" | Characters displayed correctly, no XSS or encoding issues | | |
| 14.6 | Submit fails gracefully | (Simulate by disconnecting network before submitting) | Error message: "Failed to submit to database. Please try downloading the JSON and emailing it manually." | | |
| 14.7 | Multiple rapid Next clicks | Rapidly click Next 5 times | Form advances one step at a time, no double-jumps or errors | | |

---

## Section 15: Champion-is-Primary Logic (Output Verification)

| # | Test Case | Steps | Expected Result | Result | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 15.1 | champion_is_primary = true in output | Check "Champion is also primary", complete form, download JSON | `contacts.champion_is_primary` is `true`, `contacts.primary` copies champion data with `is_also_champion: true` | | |
| 15.2 | champion_is_primary = false in output | Uncheck "Champion is also primary", fill separate Primary Contact, download JSON | `contacts.champion_is_primary` is `false`, `contacts.primary` has the separate contact data | | |

---

## Summary

| Section | Total Tests | Pass | Fail | Skip |
|---------|-----------|------|------|------|
| 1. Authentication | 5 | | | |
| 2. Program Selection | 4 | | | |
| 3. Clinic Information | 17 | | | |
| 4. Contacts | 12 | | | |
| 5. Key Stakeholders | 4 | | | |
| 6. Lab Configuration | 18 | | | |
| 7. Additional Test Panels | 7 | | | |
| 8. Ordering Providers | 11 | | | |
| 9. Extract Filtering | 8 | | | |
| 10. Review & Download | 14 | | | |
| 11. Navigation & Progress | 6 | | | |
| 12. Auto-Save & Resume | 12 | | | |
| 13. Responsive / Mobile | 6 | | | |
| 14. Edge Cases | 7 | | | |
| 15. Champion-is-Primary | 2 | | | |
| **TOTAL** | **133** | | | |

---

**Sign-off**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Developer | | | |
| Product Owner | | | |
