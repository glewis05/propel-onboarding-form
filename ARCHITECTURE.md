# Propel Onboarding Form — Architecture Reference

> **Purpose**: Comprehensive architecture doc to provide context at the start of new Claude Code sessions.
> **Last updated**: 2026-02-06
>
> See also: [README.md](./README.md) for quick start, [CLAUDE.md](./CLAUDE.md) for AI working conventions.

## Overview

A **React 19 + Vite 7** single-page application for onboarding clinics to PICI Programs (Prevention4ME, Precision4ME, GenoRx). The form is **data-driven** — a JSON definition (`form-definition.json`) defines steps, questions, types, and conditional logic. The app renders them dynamically via a `QuestionRenderer` switch.

**Tech stack**: React 19, Vite 7, Tailwind CSS 4, Supabase (PostgreSQL + Auth + Edge Functions), Vercel deployment, `docx` library for Word export.

**Repo**: `glewis05/propel-onboarding-form` — monorepo with `app/` (Vite SPA), `supabase/` (functions + migrations), `docs/` (UAT, schemas).

---

## Component Tree

```
main.jsx
└── React.StrictMode
    └── ErrorBoundary
        └── AuthProvider (context: user, session, verifyManualCode, signOut, isAuthenticated)
            └── App
                ├── [!isAuthenticated] → LoginPage
                └── [isAuthenticated] → FormContext.Provider (referenceData, testCatalog, formDefinition)
                    └── FormWizard (orchestrator — all state lives here)
                        ├── RestorePrompt (modal — restore localStorage draft?)
                        ├── ResumeModal (modal — pick a Supabase draft to resume)
                        ├── SaveStatusBar (auto-save indicator, draft file I/O, start over)
                        ├── ProgressIndicator (clickable step dots)
                        ├── [isReviewStep] → ReviewStep (summary, submit, JSON/Word download)
                        └── [!isReviewStep] → StepRenderer
                            ├── [step.repeatable] → RepeatableSection → QuestionRenderer[]
                            └── [!step.repeatable] → QuestionRenderer[]
                                └── (switch on question.type) →
                                    TextField | TextArea | SelectField | RadioGroup |
                                    CheckboxField | SelectWithAlternates | GeneSelector |
                                    TestPanelSelector | AddressGroup | ContactGroup |
                                    StakeholderGroup | ProviderFilterList
```

---

## Data Flow

### 1. Configuration Loading (App.jsx)
On mount (after auth), App fetches 4 data sources in parallel:
- `public/data/form-definition.json` → steps, questions, composite_types
- `public/data/reference-data.json` → dropdown options (programs, states, specialties, genes, etc.)
- `public/data/test-catalog.json` → lab-specific test panels (AMBRY, HELIX)
- `fetchProgramsFromSupabase()` → live programs from `programs` table (falls back to reference-data.json)

These are passed via `FormContext.Provider` as `{ formDefinition, referenceData, testCatalog }`.

### 2. Form State (FormWizard.jsx — ALL state lives here)
```
formData: {}           // flat key-value map of all answers
currentStep: number    // current wizard step index
errors: {}             // validation errors keyed by question_id
highestCompletedStep   // enables back-navigation up to this point
supabaseDraftId        // tracks current draft's submission_id for updates
returnToSummary        // flag: after edit, jump back to review step
```

### 3. Auto-Save (dual persistence)
- **localStorage**: 2-second debounce, saves `{ formData, currentStep, savedAt }` under key `propel_onboarding_draft`
- **Supabase cloud**: 2-second debounce, upserts to `onboarding_submissions` table (requires email)
  - Finds existing draft by `submission_id` > `user_id` > `submitter_email`
  - Protects submitted forms from overwrite
  - Both skip when tab is hidden (`document.hidden`)

### 4. Question Rendering Pipeline
```
FormWizard → StepRenderer → QuestionRenderer
```
- `StepRenderer`: iterates `step.questions[]`, delegates each to `QuestionRenderer`
  - Repeatable steps wrap in `RepeatableSection` (add/remove items)
- `QuestionRenderer`: the core switch — evaluates `show_when` conditions, resolves `options_ref` from referenceData/testCatalog, filters by `conditional_options` and `lab_partner`, then renders the type-specific component

### 5. Validation (validation.js)
- `evaluateCondition(condition, formData)` — operators: `equals`, `not_equals`, `in`, `not_in`, `not_empty`, `empty`
- `filterConditionalOptions(options, config, formData)` — filters dropdowns by dependent field
- `validateField(value, question)` — required, pattern (regex), max_length, composite sub-fields
- `validateStep(step, formData, compositeTypes)` — validates all questions in a step, handles repeatable sections with indexed error keys (`${index}_${questionId}`)

### 6. Submission (ReviewStep.jsx)
On submit:
1. Generates structured output JSON via `generateOutputJson()`
2. Saves to Supabase with `status: 'submitted'`
3. Sends backup email via Formspree
4. Clears localStorage draft
5. Offers JSON download and Word document generation (via `docx` library)

---

## Authentication

**Dual-mode auth via AuthProvider:**

| Mode | Flow | Session |
|------|------|---------|
| Manual codes | Admin runs `SELECT generate_login_code('email')` → shares code → user enters email + 6-digit code on LoginPage → verified against `manual_login_codes` table | localStorage, 24hr TTL |
| Supabase Auth | Magic link / OAuth redirect → `exchangeCodeForSession` | Supabase session |

**AuthProvider exports**: `{ user, session, loading, verifyManualCode, signOut, isAuthenticated }`

Manual auth user: `{ email, id: null, isManualAuth: true }`

---

## Form Definition Schema (form-definition.json)

```
{
  form_id, version, title, description,
  steps: [
    {
      step_id, title, description,
      repeatable?: boolean,
      repeatable_config?: { min_items, max_items, add_label, item_label },
      is_review_step?: boolean,
      questions: [
        {
          question_id, label, type, required?,
          options_ref?: string,          // key in referenceData
          conditional_options?: { depends_on, mapping },
          show_when?: { question_id, operator, value },
          pattern?, pattern_error?, max_length?,
          placeholder?, help_text?, description?
        }
      ]
    }
  ],
  composite_types: {
    contact_group: { fields: [...] },
    stakeholder_group: { fields: [...] },
    address: { fields: [...] }
  }
}
```

**9 Steps**: Program Selection → Clinic Info (16 Qs) → Contacts (7 Qs) → Stakeholders (3 Qs) → Lab Config (9 Qs) → Additional Test Panels (repeatable, 3 Qs) → Ordering Providers (repeatable, 7 Qs) → Extract Filtering (6 Qs) → Review

---

## Question Types (14 components)

| Type | Component | Key Behavior |
|------|-----------|-------------|
| `text` | TextField | Standard input with pattern/maxLength validation |
| `textarea` | TextArea | Multi-line input |
| `select` | SelectField | Dropdown from `options_ref` |
| `select` (test_panel) | TestPanelSelector | Specialized — shows gene info buttons with GeneListPopup |
| `radio` | RadioGroup | Radio buttons from `options_ref` |
| `checkbox` | CheckboxField | Single boolean toggle |
| `select_with_alternates` | SelectWithAlternates | Primary select + "offer alternates?" checkbox + multi-select |
| `gene_selector` | GeneSelector | Multi-checkbox gene picker with default selections |
| `address` | AddressGroup | Composite: street, city, state (dropdown), zip |
| `contact_group` | ContactGroup | Composite: name, title, email, phone |
| `stakeholder_group` | StakeholderGroup | Composite: name, title, email, phone + is_ordering_provider checkbox |
| `provider_filter_list` | ProviderFilterList | Repeatable first_name + last_name list |

Gene-related: `GeneInfoButton` (opens popup), `GeneListPopup` (displays gene list in modal)

---

## Supabase Service Layer (services/supabase.js)

| Function | Purpose |
|----------|---------|
| `fetchProgramsFromSupabase()` | Fetch active programs for dropdown (excludes Platform, Discover) |
| `saveOnboardingSubmission({...})` | Upsert draft/submission — finds existing by submission_id > user_id > email |
| `fetchRecentDrafts(email)` | Drafts from last 14 days filtered by `submitter_email` at DB level (for ResumeModal) |
| `fetchUserDrafts()` | Current user's drafts only (RLS-filtered) |
| `verifyEmailForDraft(formData, email, submitterEmail?)` | Check if email matches a contact in form data; rejects submitter's own email |
| `loadDraftByEmail(email)` | Load most recent draft by submitter email |

**Tables**: `programs`, `onboarding_submissions`, `manual_login_codes`
**RLS**: `onboarding_submissions` requires `auth.uid() = user_id` for INSERT/SELECT
**Edge Function**: `cleanup-old-drafts` — deletes drafts >30 days, scheduled weekly via pg_cron

---

## Output Schema (output-formatter.js → generateOutputJson)

```json
{
  "schema_version": "1.0",
  "submitted_at": "ISO8601",
  "program": "P4M|PR4M|GRX",
  "clinic_information": { "clinic_name": "", "epic_department_id": "", "address": {}, "timezone": "", "hours_of_operation": "", "websites": {} },
  "contacts": { "clinic_champion": {}, "champion_is_primary": false, "primary": {}, "genetic_counselor": {}, "secondary": {}, "it": {}, "lab": {} },
  "stakeholders": [{ "name": "", "title": "", "email": "", "phone": "", "is_ordering_provider": false }],
  "lab_order_configuration": {
    "test_provider": "AMBRY|HELIX",
    "specimen_collection": { "default": "", "additional_options_enabled": false, "additional_options": [] },
    "test_panel": { "test_name": "", "test_code": "", "include_rna_insight": false, "selected_genes": [], "gene_count": 0 },
    "additional_test_panels": [{ "test_code": "", "selected_genes": [], "modifications": "" }],
    "billing_method": "", "send_kit_to_patient": "", "indication": "", "criteria_for_testing": ""
  },
  "ordering_providers": [{ "name": "", "title": "", "email": "", "phone": "", "npi": "", "specialty": "", "office_address": {} }],
  "helpdesk": { "phone": "", "include_in_emails": false },
  "extract_filtering": { "patient_status": "", "procedure_type": "", "filter_by_provider": false, "provider_list": [] },
  "metadata": { "form_version": "", "generated_by": "propel-onboarding-form" }
}
```

---

## Reference Data (public/data/)

| File | Contents |
|------|----------|
| `form-definition.json` | 9 steps, ~52 questions, composite_types for address/contact/stakeholder |
| `reference-data.json` | 25 lookup lists: programs (3), test_panels (4), all_test_panels (6), customnext_cancer_genes (90), labs (2), specimen_types (3), billing_methods, states (51), specialties (16), timezones, etc. |
| `test-catalog.json` | Lab-specific tests: AMBRY (2 tests), HELIX (1 test) |
| `schema.json` | JSON schema for the form output |

---

## Key Patterns & Business Logic

1. **Ordering provider auto-populate**: When a stakeholder has `is_ordering_provider: true`, their data auto-fills the first ordering provider on navigation to that step
2. **Lab filtering**: `lab_partner` selection filters `test_panels` and `test_code` options by `lab` field
3. **CustomNext-Cancer genes**: 90 genes total, 85 pre-selected by default (from `DEFAULT_CUSTOMNEXT_GENES` constant), user can toggle individual genes
4. **RNAInsight**: checkbox toggles test_code between base and RNA variant, appends "+RNAInsight" to name
5. **Champion-is-primary**: checkbox copies clinic_champion data to primary contact
6. **Submitted form protection**: submitted forms cannot be overwritten by draft auto-save
7. **Tab visibility**: auto-save pauses when tab is hidden
8. **Draft resume verification**: Resume modal queries by `submitter_email` at DB level; identity verification requires entering a contact email from the draft (not the submitter's own email)

---

## Infrastructure

| Concern | Technology |
|---------|-----------|
| Build | Vite 7 |
| Hosting | Vercel (auto-deploy on push to `main`) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + manual login codes |
| Edge Functions | Deno (Supabase Functions) |
| Styling | Tailwind CSS 4 |
| Testing | Vitest 4 + React Testing Library + jsdom (151 tests, 11 files) |
| Word Export | `docx` library |
| Backup Email | Formspree |

**Dependencies**: react 19, react-dom 19, @supabase/supabase-js 2.94, docx 9.5, tailwindcss 4
**Supabase Project**: `royctwjkewpnrcqdyhzd` (propel-operations)
**Production URL**: propel-onboarding-form.vercel.app
