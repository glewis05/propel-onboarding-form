# Propel Onboarding Form — Project Notes

> For full architecture details (component tree, data flow, service layer, output schema), see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Documentation Policy

**This app is preparing for production launch.** All documentation must be kept current with every change:

- **CLAUDE.md** (this file) — Update with any architecture, auth, or workflow changes
- **ARCHITECTURE.md** — Update when components, data flow, service functions, or business logic change
- **README.md** — Update when tech stack, project structure, deployment, or quick-start instructions change
- **docs/UAT-VALIDATION-LOG.md** — Update after every UAT round with bugs found, fixes applied, and retest results
- **docs/UAT-TEST-SET.xlsx** / **docs/UAT-TEST-SET.md** — Update when new test cases are needed or existing ones change

When making code changes, always check whether any of the above documents need updating and include those updates in the same commit.

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

### Authentication & Draft Resume Flow
- **Admin-generated codes** — bypasses email delivery issues with enterprise security
- Flow: Admin generates code via SQL → shares via Slack/Teams → user enters email + code
- `manual_login_codes` table stores codes with expiry (default 24 hours)
- Generate code: `SELECT generate_login_code('user@example.com');`
- Auth state stored in localStorage (24 hour session)
- The email + code pair together identify the submitter
- No auto-focus behavior on login — user manually tabs between fields

### Draft Resume Flow
1. User clicks "Resume Assessment" → system queries drafts by `submitter_email` (DB-level filter)
2. Modal displays all matching drafts with clinic name, program, and last updated
3. User selects a draft → prompted to enter a **contact email from within that draft** (not their own)
4. This serves as lightweight identity verification: only the original creator knows which emails they entered
5. On successful verification, draft loads and user continues where they left off

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

### Review Page & Word Document
- Contacts/stakeholders display formatted (not JSON)
- Checkboxes display "Yes" or "No"
- Gene lists are expandable (show more/less toggle)
- Word document has styled tables with borders, shading, and proper spacing
- Ordering provider auto-populates from stakeholder on any navigation method
