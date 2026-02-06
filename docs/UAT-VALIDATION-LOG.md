# UAT Validation Log — Propel Onboarding Form

## UAT Round 3

- **Date**: 2026-02-06
- **Tester**: Glen Lewis
- **Environment**: Production (propel-onboarding-form.vercel.app)
- **Focus**: Retest of Round 2 fixes, full form walkthrough through submission (GRX program), draft resume flow

---

### Bugs Found & Fixed (2 items)

#### BUG 1 — Login Email Focus Jump (Regression)
| Field | Detail |
|-------|--------|
| **Observed** | Round 2 fix (hasAutoFocused ref with >=2 char domain check) still triggered prematurely — focus jumped to code field after typing ~3 characters into the domain (e.g., after "gma" in "gmail.com"). User had to click back to finish typing. |
| **Root Cause** | The `hasAutoFocused` ref with `>= 2` domain length check was still too aggressive. Any auto-focus behavior on the email field is unreliable because there's no way to know when the user is "done" typing. |
| **Fix Applied** | Removed all auto-focus logic entirely — deleted `useRef` imports, `codeInputRef`, `hasAutoFocused` ref, and `handleEmailChange` handler. Email onChange now uses inline `setEmail()`. User tabs or clicks to the code field naturally. |
| **Files Changed** | `src/components/auth/LoginPage.jsx` |

#### BUG 2 — Resume Modal Shows No Drafts Despite DB Records
| Field | Detail |
|-------|--------|
| **Observed** | "Resume Assessment" modal opened but showed "No recent drafts found" despite 2 draft records in DB for `glenlewis05@gmail.com`. |
| **Root Cause** | Three compounding issues: (1) `fetchRecentDrafts()` fetched ALL drafts, then `ResumeModal` filtered client-side by calling `verifyEmailForDraft()` which checks if the user's email matches a **contact email inside `form_data`**. But the logged-in user's email (`glenlewis05@gmail.com`) was the **submitter**, not a contact — contacts had different emails (`jane.smith@prov.org`, etc.). (2) The `submitter_email` column had the correct email, but it was never checked at the right level. (3) `verifyEmailForDraft` also checked `form_data.submitter_email` which was `null`. |
| **Fix Applied** | Redesigned the entire draft resume flow per spec: (1) `fetchRecentDrafts(email)` now takes an email param and filters by `submitter_email` at the DB level using `.ilike()`. (2) Removed client-side `verifyEmailForDraft` filtering from the modal's useEffect. (3) Removed auto-restore bypass — all draft selections now require contact email verification. (4) `verifyEmailForDraft(formData, email, submitterEmail?)` now accepts an optional `submitterEmail` param and **rejects** if the user enters their own sign-in email (verification = knowing a contact email you entered into the form). (5) Updated UI copy to clarify the verification expectation. |
| **Files Changed** | `src/services/supabase.js`, `src/components/ResumeModal.jsx` |

---

### Full Form Walkthrough Completed

A complete end-to-end submission was performed:
- **Program**: GenoRx (GRXP)
- **Clinic**: SoCal GenoRx Clinic
- **Lab Partner**: Ambry, CancerNext-Expanded test panel
- **Submission**: Successfully submitted, JSON downloaded (`onboarding-GRXP-20260206T211956.json`)
- **Output verified**: JSON structure correct with all sections populated

---

### All Files Modified in UAT Round 3

| File | Changes |
|------|---------|
| `src/components/auth/LoginPage.jsx` | Removed all auto-focus logic (useRef, codeInputRef, hasAutoFocused, handleEmailChange) |
| `src/components/ResumeModal.jsx` | DB-level draft filtering by submitter_email, removed auto-restore bypass, updated verification to pass submitterEmail, updated UI copy |
| `src/services/supabase.js` | `fetchRecentDrafts(email)` with `.ilike()` filter, `verifyEmailForDraft` rejects submitter's own email, includes `submitter_email` in response |

---

### Retest Checklist (UAT Round 4)

- [ ] Login page — focus stays in email field for entire email entry (no jumps at all)
- [ ] Resume modal — shows drafts for authenticated user's email
- [ ] Resume modal — identity verification rejects submitter's own email
- [ ] Resume modal — identity verification accepts a valid contact email from the draft
- [ ] Full form walkthrough for P4M program (Round 3 tested GRX)
- [ ] Word document download after submission

---

## UAT Round 2

- **Date**: 2026-02-05
- **Tester**: Glen Lewis
- **Environment**: Production (propel-onboarding-form.vercel.app)
- **Focus**: Full form walkthrough, Review page, Word document export, Resume functionality

---

### Bugs Fixed (14 items)

#### BUG 1 — Login Page Focus Jump
| Field | Detail |
|-------|--------|
| **Observed** | After typing "@" in email field, each additional keystroke caused focus to jump to code field |
| **Root Cause** | `useEffect` ran on every email change, re-triggering focus when email contained "@" |
| **Fix Applied** | Added `hasAutoFocused` ref to only trigger focus once when email looks complete (contains @ + 2+ char domain) |
| **Files Changed** | `src/components/auth/LoginPage.jsx` |

#### BUG 2 — Page 8 (Filtering) Next Button Non-Functional
| Field | Detail |
|-------|--------|
| **Observed** | Next button wouldn't work despite all required fields filled |
| **Root Cause** | `provider_filter_list` validation treated array as object, causing false errors. `validateField` didn't handle array types properly. |
| **Fix Applied** | Added proper `provider_filter_list` validation in `validateField()`. Excluded from generic composite validation. |
| **Files Changed** | `src/utils/validation.js` |

#### BUG 3 — Review Page Shows Raw JSON
| Field | Detail |
|-------|--------|
| **Observed** | IT Contact, Program Champion, Providers in Filter displayed as `{"name":"Lance Anderson"}` |
| **Root Cause** | `getDisplayValue()` only handled objects with both `name` AND `email`; fell through to `JSON.stringify` |
| **Fix Applied** | Updated `getDisplayValue()` to handle objects with just `name`, arrays of `{first_name, last_name}`, and booleans |
| **Files Changed** | `src/components/ReviewStep.jsx` |

#### BUG 4 — Review Page Checkbox Shows Blank
| Field | Detail |
|-------|--------|
| **Observed** | "Clinic Champion is also Primary Contact" field blank on Review page |
| **Root Cause** | `if (!value)` check treated `false` as "Not provided" |
| **Fix Applied** | Changed to `if (value === null || value === undefined || value === '')` and added boolean handling |
| **Files Changed** | `src/components/ReviewStep.jsx` |

#### BUG 5 — Word Document Shows Raw JSON
| Field | Detail |
|-------|--------|
| **Observed** | Same JSON display issue in Word export |
| **Fix Applied** | Updated `formatValue()` helper with same fixes as `getDisplayValue()` |
| **Files Changed** | `src/components/ReviewStep.jsx` |

#### BUG 6 — Resume Modal Shows All Drafts
| Field | Detail |
|-------|--------|
| **Observed** | Resume modal showed all saved forms regardless of logged-in user |
| **Fix Applied** | Filter drafts by authenticated user's email using `verifyEmailForDraft()` |
| **Files Changed** | `src/components/ResumeModal.jsx` |

#### BUG 7 — Final Submit Used Wrong Email
| Field | Detail |
|-------|--------|
| **Observed** | Submit created new record instead of updating draft (email mismatch) |
| **Root Cause** | `ReviewStep` didn't prioritize `user?.email`, fell back to `clinic_champion.email` |
| **Fix Applied** | Added `user?.email` as first priority in submitter email lookup |
| **Files Changed** | `src/components/ReviewStep.jsx` |

---

### Features Added

#### Feature 1 — Remove Providence Branding
| Field | Detail |
|-------|--------|
| **Changes** | Removed Providence logo from header, removed subtitle, changed title to "Propel Clinic Onboarding" |
| **Files Changed** | `src/components/FormWizard.jsx`, `public/data/form-definition.json`, `src/components/ReviewStep.jsx` |

#### Feature 2 — Test-to-Lab Vendor Filtering
| Field | Detail |
|-------|--------|
| **Changes** | Added `lab` field to test panels. Test options filter by selected `lab_partner`. Added Helix PGx Panel. |
| **Files Changed** | `public/data/reference-data.json`, `src/components/QuestionRenderer.jsx` |

#### Feature 3 — Exclude Default Test Panel from Additional Panels
| Field | Detail |
|-------|--------|
| **Changes** | Additional Test Panels dropdown excludes the panel already selected as default |
| **Files Changed** | `src/components/QuestionRenderer.jsx` |

#### Feature 4 — Provider Filter Validation Styling
| Field | Detail |
|-------|--------|
| **Changes** | Added red border/shading to provider filter field on validation error |
| **Files Changed** | `src/components/question-types/ProviderFilterList.jsx` |

#### Feature 5 — Gene List Expand/Collapse
| Field | Detail |
|-------|--------|
| **Changes** | Added `ExpandableGeneList` component with show more/less toggle, scrollable area |
| **Files Changed** | `src/components/ReviewStep.jsx` |

#### Feature 6 — Ordering Provider Auto-Populate on Any Navigation
| Field | Detail |
|-------|--------|
| **Changes** | Extracted `autoPopulateOrderingProvider()` helper, called from `handleNext`, `handleStepClick`, `handleEditFromSummary` |
| **Files Changed** | `src/components/FormWizard.jsx` |

#### Feature 7 — Word Document Formatting Overhaul
| Field | Detail |
|-------|--------|
| **Changes** | Added horizontal divider, summary info table with shading, borders on all tables, cell padding, consistent font sizes |
| **Files Changed** | `src/components/ReviewStep.jsx` |

#### Feature 8 — Lock Submitted Forms (Partial)
| Field | Detail |
|-------|--------|
| **Changes** | Added protection against overwriting submitted forms. If draft save targets submitted form, creates new draft instead. |
| **Files Changed** | `src/services/supabase.js` |

#### Feature 9 — Resume Modal Auto-Restore
| Field | Detail |
|-------|--------|
| **Changes** | If logged-in user's email matches a contact in the draft, auto-restore without verification prompt |
| **Files Changed** | `src/components/ResumeModal.jsx` |

---

### All Files Modified in UAT Round 2

| File | Changes |
|------|---------|
| `src/components/auth/LoginPage.jsx` | Fixed focus jump bug |
| `src/utils/validation.js` | Fixed provider_filter_list validation |
| `src/components/ReviewStep.jsx` | JSON display fixes, checkbox display, expandable gene list, Word formatting |
| `src/components/FormWizard.jsx` | Removed Providence branding, ordering provider auto-populate |
| `src/components/ResumeModal.jsx` | Filter by user email, auto-restore |
| `src/components/QuestionRenderer.jsx` | Test-to-lab filtering, exclude default panel |
| `src/components/question-types/ProviderFilterList.jsx` | Validation styling |
| `src/services/supabase.js` | Submitted form protection |
| `public/data/form-definition.json` | Updated title |
| `public/data/reference-data.json` | Added lab field to test panels, Helix PGx |

---

### Retest Checklist (UAT Round 3)

- [ ] Login page — focus stays in email field while typing
- [ ] Page 8 (Filtering) — Next button works when all fields filled
- [ ] Review page — contacts/stakeholders display formatted, checkboxes show Yes/No
- [ ] Word document — formatted tables, no JSON display
- [ ] Resume modal — only shows current user's drafts, auto-restores
- [ ] Test panels — filter by selected lab partner
- [ ] Additional Test Panels — excludes default panel
- [ ] Ordering providers — auto-populate from stakeholder on direct navigation
- [ ] Gene list — expand/collapse works on Review page

---

## UAT Round 1

- **Date**: 2026-02-04
- **Tester**: Glen Lewis
- **Environment**: Production (propel-onboarding-form.vercel.app)
- **Supabase Project**: `royctwjkewpnrcqdyhzd` (propel-operations)
- **Test Set**: `UAT-TEST-SET.xlsx` (133 test cases across 12 sections)
- **Sections Tested**: 1 (Authentication), 2 (Program Selection), 4 (Contacts - partial), 5 (Stakeholders - partial), 12 (Save/Restore)

---

## Failures

### FAIL 1.4 — Magic Link First-Time Sign-Up

| Field | Detail |
|-------|--------|
| **Test Case** | 1.4 — Enter a never-used email, request magic link, click link, verify account created and user lands on form |
| **Result** | FAIL |
| **Observed** | New user gets confirmation email (not magic link). Email security scanners (Microsoft Safe Links) pre-click the confirmation URL, consuming the one-time token before the user can click it. User sees "Email link is invalid or has expired." Supabase OTP emails also blocked by Providence enterprise email security. |
| **Root Cause** | Providence enterprise email security blocks both: (1) Magic link emails — Safe Links pre-clicks URLs, consuming tokens. (2) OTP code emails — blocked entirely by email filters. No email-based auth method works reliably. |
| **Evidence** | Supabase auth logs show: `user_confirmation_requested` at 21:17:16 with `mail_type: confirmation`. Token consumed by scanner IP `35.171.99.211` at 21:17:50. User IP `76.146.208.176` gets "One-time token not found" at 21:18:59. OTP emails never arrive. |
| **Fix Applied** | Implemented admin-generated code system that bypasses email entirely: (1) Created `manual_login_codes` table with `generate_login_code()` SQL function. (2) Admin generates code via Supabase SQL, shares via Slack/Teams. (3) User enters email + 6-digit code on login page. (4) Code verified against table, 24hr session stored in localStorage. (5) Added RLS policies for anonymous cloud sync. |
| **Files Changed** | `src/components/auth/AuthProvider.jsx`, `src/components/auth/LoginPage.jsx`, `src/App.jsx` |
| **Supabase Config** | Created `manual_login_codes` table. Added `generate_login_code()` function. Added UAT anonymous RLS policies on `onboarding_submissions`. |
| **Retest Required** | Yes — verify admin-generated code login flow works |

### FAIL 12.1 — Cloud Sync / Auto-Save to Supabase

| Field | Detail |
|-------|--------|
| **Test Case** | 12.1 — Fill in several steps, verify data appears in Supabase `onboarding_submissions` table |
| **Result** | FAIL |
| **Observed** | "Cloud sync failure" indicator in save status bar. No records created in `onboarding_submissions` table. |
| **Root Cause** | RLS INSERT policy on `onboarding_submissions` requires `auth.uid() = user_id`, but the app never included `user_id` in the INSERT payload. All inserts had `user_id: null`, violating the policy. Additionally, draft lookup used `.single()` which throws 406 when no rows match. |
| **Evidence** | Supabase API logs: repeated `403` on POST to `onboarding_submissions`. Postgres logs: "new row violates row-level security policy for table 'onboarding_submissions'". |
| **Fix Applied** | (1) Modified `saveOnboardingSubmission()` in `supabase.js` to always include `user_id` from auth session. (2) Changed draft lookup from `.single()` to `.maybeSingle()`. (3) Lookup existing drafts by `user_id` instead of `submitter_email`. (4) Added `user_id: user?.id` to save calls in `FormWizard.jsx` and `ReviewStep.jsx`. |
| **Files Changed** | `src/services/supabase.js`, `src/components/FormWizard.jsx`, `src/components/ReviewStep.jsx` |
| **Retest Required** | Yes — verify auto-save creates/updates records in Supabase, verify draft resume works |

---

## UX Issues Fixed (from PASS results with notes)

### UX-1: Login Page UI (Test 1.1)

| Field | Detail |
|-------|--------|
| **Observed** | Providence logo displayed (should not be); tagline said "genetic testing programs" instead of EICI |
| **Fix Applied** | Removed Providence logo. Changed tagline to "Streamlined setup for EICI program". |
| **Files Changed** | `src/components/auth/LoginPage.jsx` |
| **Retest Required** | Yes — verify no Providence logo, correct tagline |

### UX-2: Previous Button on Step 1 (Test 2.1)

| Field | Detail |
|-------|--------|
| **Observed** | Previous button visible (disabled) on Step 1 — confusing, should be hidden |
| **Fix Applied** | Changed from disabled rendering to conditional rendering: `{!isFirstStep && (...)}` |
| **Files Changed** | `src/components/FormWizard.jsx` |
| **Retest Required** | Yes — verify no Previous button on Step 1, visible on Steps 2+ |

### UX-3: Platform and Discover in Program List (Test 2.1)

| Field | Detail |
|-------|--------|
| **Observed** | Platform and Discover programs appearing in dropdown — these are not selectable for clinic onboarding |
| **Fix Applied** | Added `.not('name', 'in', '("Platform","Discover")')` filter to `fetchProgramsFromSupabase()` query |
| **Files Changed** | `src/services/supabase.js` |
| **Retest Required** | Yes — verify Platform and Discover do not appear in program dropdown |

### UX-4: Phone Validation Error Indicator (Tests 4.5, 5.3)

| Field | Detail |
|-------|--------|
| **Observed** | Phone field showed no visual error indicator when invalid (unlike name/email fields which had red borders) |
| **Fix Applied** | Added `getFieldError()` helper, error border styling (red border + red background), and error message display for phone fields in both `ContactGroup.jsx` and `StakeholderGroup.jsx`. Also added error styling to name and email fields in StakeholderGroup (which were missing entirely). |
| **Files Changed** | `src/components/question-types/ContactGroup.jsx`, `src/components/question-types/StakeholderGroup.jsx` |
| **Retest Required** | Yes — verify red border/background on invalid phone numbers in contact and stakeholder groups |

### UX-5: Auto-Save Status Messaging (Test 12.1 notes)

| Field | Detail |
|-------|--------|
| **Observed** | Cloud sync failure message disappeared after 3 seconds with no way to retry. No distinction between local and cloud save status. |
| **Fix Applied** | (1) Cloud sync error now persists until next successful sync. (2) Added "Retry" button next to failure message. (3) Changed "Auto-saved at" to "Saved locally at" for clarity. (4) Added "Cloud sync" entry to help section. |
| **Files Changed** | `src/components/FormWizard.jsx`, `src/components/SaveStatusBar.jsx` |
| **Retest Required** | Yes — verify error persists, Retry button works, local/cloud distinction clear |

---

## All Files Modified in UAT Round 1

| File | Changes |
|------|---------|
| `src/components/auth/LoginPage.jsx` | Admin-generated code entry (email + 6-digit code), removed Providence logo, updated tagline |
| `src/components/auth/AuthProvider.jsx` | Added `verifyManualCode()` for admin code auth, localStorage session persistence (24hr) |
| `src/App.jsx` | Re-enabled authentication with admin code flow |
| `src/components/FormWizard.jsx` | Added `useAuth()` + `user_id` to saves, hidden Previous on Step 1, added cloud sync retry handler |
| `src/components/ReviewStep.jsx` | Added `useAuth()` + `user_id` to final submission save |
| `src/components/SaveStatusBar.jsx` | Persistent error state, Retry button, local/cloud messaging, help text |
| `src/components/question-types/ContactGroup.jsx` | Phone error styling and message |
| `src/components/question-types/StakeholderGroup.jsx` | Added full error handling (name, email, phone) with styling and messages |
| `src/services/supabase.js` | `user_id` in saves, `.maybeSingle()`, draft lookup by `user_id`, Platform/Discover filter |

---

## Unit Test Status

- **Framework**: Vitest 4.x + React Testing Library + jsdom
- **Total Tests**: 151 across 11 files
- **Status**: ALL PASSING after all changes
- **Last Run**: 2026-02-04

---

## Retest Checklist (UAT Round 2)

All items below require retesting in the next UAT round:

- [ ] **1.1-1.7** — Admin-generated code login (email + code entry, invalid code error, session persistence)
- [ ] **1.1** — Login page UI (no Providence logo, correct tagline, code entry field)
- [ ] **2.1** — No Previous button on Step 1; Platform/Discover not in program list
- [ ] **4.5** — Phone validation error indicator in Contact groups
- [ ] **5.3** — Phone/email validation error indicator in Stakeholder groups
- [ ] **12.1** — Cloud sync auto-save creates records in Supabase; error persists with Retry button; "Saved locally" vs "Cloud saved" distinction
- [ ] **12.1** — Draft resume from Supabase works after cloud sync fix

---

## Sections Not Yet Tested

The following UAT sections were not covered in Round 1 and need testing:

- Section 3: Clinic Information
- Section 4: Contacts (partially tested — 4.1-4.5 only)
- Section 5: Stakeholders (partially tested — 5.1-5.3 only)
- Section 6: Test Panel Configuration
- Section 7: Ordering Provider Extraction
- Section 8: Ordering Providers
- Section 9: Specimen & Logistics
- Section 10: Review & Submit
- Section 11: Output JSON Validation
