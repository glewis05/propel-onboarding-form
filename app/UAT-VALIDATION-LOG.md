# UAT Validation Log — Propel Onboarding Form

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
| **Observed** | New user gets confirmation email (not magic link). Email security scanners (Microsoft Safe Links) pre-click the confirmation URL, consuming the one-time token before the user can click it. User sees "Email link is invalid or has expired." Must request another link (which now sends a magic_link type since account exists). |
| **Root Cause** | Two issues: (1) Supabase sends `mail_type: confirmation` for new users instead of `magic_link` — this requires a second email to actually sign in. (2) Microsoft Safe Links (IPs `35.171.99.211`, `104.47.58.254`, `134.199.66.170`, `209.50.249.181`) pre-click links in emails, consuming one-time tokens before users can use them. |
| **Evidence** | Supabase auth logs show: `user_confirmation_requested` at 21:17:16 with `mail_type: confirmation`. Token consumed by scanner IP `35.171.99.211` at 21:17:50. User IP `76.146.208.176` gets "One-time token not found" at 21:18:59. |
| **Fix Applied** | Rewrote `LoginPage.jsx` to use OTP code entry instead of relying on magic link clicks. Two-step flow: (1) enter email, (2) enter 6-digit code from email. Uses `supabase.auth.verifyOtp()` which is immune to link scanners since it requires manual code entry. Magic links still work as a fallback. |
| **Files Changed** | `src/components/auth/LoginPage.jsx` |
| **Retest Required** | Yes — verify both new and existing users can sign in using the 6-digit code flow |

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
| `src/components/auth/LoginPage.jsx` | OTP code entry flow (replaces magic-link-only), removed Providence logo, updated tagline |
| `src/components/auth/AuthProvider.jsx` | No changes (verified flow) |
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

- [ ] **1.4** — New user sign-up via 6-digit OTP code (both new and existing users)
- [ ] **1.1** — Login page UI (no Providence logo, correct tagline)
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
