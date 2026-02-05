# Propel Onboarding Form — Project Notes

## Testing

### Unit Tests
- Framework: Vitest + React Testing Library + jsdom
- Run: `npm test` from `/app`
- 151 tests across 11 files

### UAT Test Cases
- **Format: Always generate UAT test cases as Excel (.xlsx), not Markdown.**
  - Excel is human-friendly for testers to fill in results, track pass/fail, and sign off.
  - Use dropdowns for Result columns (PASS/FAIL/SKIP) and conditional formatting (green=PASS, red=FAIL).
  - Include sheets: Test Cases, Summary (with SUM formulas), Sign-off.
- **Test set**: `UAT-TEST-SET.xlsx` (133 test cases, 12 sections)

### UAT Validation
- **Validation log**: `UAT-VALIDATION-LOG.md` — the single source of truth for all UAT findings, root cause analysis, fixes applied, files changed, and retest requirements.
- When performing validation or retesting, always read `UAT-VALIDATION-LOG.md` first to understand what was fixed and what needs retesting.
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
- Key tables: `programs`, `onboarding_submissions`
- RLS is enabled on `onboarding_submissions` — INSERT/SELECT policies require `auth.uid() = user_id`
