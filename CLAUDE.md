# Propel Onboarding Form — Project Notes

## Testing

### Unit Tests
- Framework: Vitest + React Testing Library + jsdom
- Run: `npm test` from `/app`
- 151 tests across 11 files

### UAT Test Cases
- **Location**: `docs/UAT-TEST-SET.xlsx` and `docs/UAT-TEST-SET.md`
- **Format: Always generate UAT test cases as Excel (.xlsx), not Markdown.**
  - Excel is human-friendly for testers to fill in results, track pass/fail, and sign off.
  - Use dropdowns for Result columns (PASS/FAIL/SKIP) and conditional formatting (green=PASS, red=FAIL).
  - Include sheets: Test Cases, Summary (with SUM formulas), Sign-off.

### UAT Validation
- **Location**: `docs/UAT-VALIDATION-LOG.md`
- Single source of truth for all UAT findings, root cause analysis, fixes applied, files changed, and retest requirements.
- When performing validation or retesting, always read the validation log first to understand what was fixed and what needs retesting.
- After each UAT round, update the validation log with new results, adding a new "UAT Round N" section.

## Architecture Notes

### Authentication
- **Admin-generated codes** — bypasses email delivery issues with enterprise security
- Flow: Admin generates code via SQL → shares via Slack/Teams → user enters email + code
- `manual_login_codes` table stores codes with expiry (default 24 hours)
- Generate code: `SELECT generate_login_code('user@example.com');`
- Auth state stored in localStorage (24 hour session)
- Cloud sync uses `user_id = null` for manual auth users (RLS allows this)

### Auto-Save
- **Local**: localStorage, 2-second debounce, always active
- **Cloud**: Supabase `onboarding_submissions` table, 2-second debounce, requires authenticated user
- Cloud save requires `user_id` (from `auth.uid()`) to satisfy RLS INSERT policy
- Cloud sync failures persist in UI with a Retry button

### Supabase Project
- Project ID: `royctwjkewpnrcqdyhzd` (propel-operations)
- Key tables: `programs`, `onboarding_submissions`, `manual_login_codes`
- RLS is enabled on `onboarding_submissions` — INSERT/SELECT policies require `auth.uid() = user_id`

### Test Panel Configuration
- Test panels have a `lab` field (AMBRY or HELIX) for filtering
- Lab partner selection filters available test panels automatically
- Default test panel on Lab Config page is excluded from Additional Test Panels
- P4M/PR4M → Ambry Genetics tests
- GRX → Helix PGx tests

### Resume Modal
- Only shows drafts (not submitted forms)
- Filters by authenticated user's email
- Auto-restores without verification if user's email matches a contact in the draft
- Submitted forms protected from accidental overwrite

### Review Page & Word Document
- Contacts/stakeholders display formatted (not JSON)
- Checkboxes display "Yes" or "No"
- Gene lists are expandable (show more/less toggle)
- Word document has styled tables with borders, shading, and proper spacing
- Ordering provider auto-populates from stakeholder on any navigation method
