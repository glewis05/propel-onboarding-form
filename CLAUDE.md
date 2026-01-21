# Propel Onboarding Form

## Project Purpose
Client-facing React questionnaire form for onboarding new clinics to Propel Health programs. Clinics fill out a multi-step form, data auto-saves to Supabase, and they can resume incomplete forms by verifying their email.

## Owner Context
- Solo developer (no separate front-end/back-end team)
- Familiar with R, learning Python — explain Python concepts with R comparisons where helpful
- Aviation background — aviation analogies work well for complex concepts
- This form is used by external clinic staff — keep it simple and user-friendly
- Prefers detailed explanations with heavy inline comments

## Tech Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| UI Framework | React 18 | Via CDN, no build step |
| Styling | Tailwind CSS | Via CDN |
| JSX Transpilation | Babel Standalone | In-browser transpilation |
| Database | Supabase (PostgreSQL) | Draft storage and submissions |
| Document Export | docx.js | Word document generation |
| Hosting | GitHub Pages | Static file hosting |

**No build step required** - Everything runs directly in the browser via CDN.

## Programs Supported

| Value | Display Name | Description | Lab Partner |
|-------|--------------|-------------|-------------|
| P4M | Prevention4ME | Cancer prevention genetic testing | Ambry Genetics |
| PR4M | Precision4ME | Precision medicine | Ambry Genetics |
| GRX | GenoRx | Pharmacogenomics | Helix |

## File Organization

```
propel-onboarding-form/
├── index.html                    # Entry point, loads React app
├── README.md                     # User documentation
├── CLAUDE.md                     # This file - AI assistant instructions
├── src/
│   ├── js/
│   │   └── app.js               # Main React application (~4200 lines)
│   ├── css/
│   │   └── styles.css           # Custom styles beyond Tailwind
│   └── data/
│       ├── form-definition.json  # Form structure (steps, questions)
│       ├── reference-data.json   # Dropdown options (states, timezones, etc.)
│       ├── test-catalog.json     # Lab test products by provider
│       └── schema.json           # JSON Schema for validation
├── docs/
│   ├── FORM-DEFINITION.md       # How to modify form questions
│   └── SCHEMA.md                # Data schema documentation
└── src/samples/
    ├── sample-p4m.json          # Prevention4ME example
    └── sample-grx.json          # GenoRx example
```

## Architecture Overview

### Form-Driven Design

The form structure is defined in `form-definition.json`, NOT hardcoded:
- Steps and questions are JSON-defined
- Adding/modifying questions requires NO code changes
- Conditional visibility is declarative (`show_when` property)
- Composite types (address, contact_group) are reusable

### Key Components in app.js

| Component | Purpose |
|-----------|---------|
| `App` | Root component, loads config files |
| `FormWizard` | Multi-step form controller |
| `ProgressIndicator` | Step navigation with completion status |
| `StepRenderer` | Renders questions for current step |
| `ReviewStep` | Summary page with edit and submit |
| `ResumeModal` | Draft selection and email verification |
| `RestorePrompt` | (DISABLED) Auto-restore prompt |

### State Management

Key state in FormWizard:
- `formData` - All form field values
- `currentStep` - Current step index
- `highestCompletedStep` - For navigation restrictions
- `supabaseDraftId` - ID for auto-save updates
- `showResumeModal` - Controls resume modal visibility

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User fills     │     │  Auto-save to   │     │  On submit:     │
│  form fields    │────▶│  Supabase       │────▶│  - Save final   │
│                 │     │  (debounced)    │     │  - Download doc │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Supabase Integration

### Table: onboarding_submissions

| Column | Type | Description |
|--------|------|-------------|
| submission_id | uuid | Primary key (auto-generated) |
| submitter_email | text | Email for resume lookup |
| submitter_name | text | Name of person filling form |
| program_prefix | text | P4M, PR4M, or GRX |
| clinic_name | text | Extracted for draft list display |
| form_data | jsonb | Full form data object |
| submission_status | text | 'draft' or 'submitted' |
| created_at | timestamptz | Auto-set on create |
| updated_at | timestamptz | Auto-updated on change |

### Key Functions

| Function | Purpose |
|----------|---------|
| `saveOnboardingSubmission()` | Upsert draft to Supabase |
| `fetchRecentDrafts()` | Get drafts from last 14 days |
| `loadDraftByEmail()` | Find draft by submitter email |
| `verifyEmailForDraft()` | Check if email matches any contact |

## Resume Flow (User-Initiated Only)

**IMPORTANT**: Auto-resume has been DISABLED. Users must explicitly click "Resume Your Onboarding Form" button.

1. User clicks "Resume Your Onboarding Form" button
2. `ResumeModal` opens showing drafts from last 14 days
3. User selects their clinic from list
4. User enters email to verify identity
5. Email is checked against all contacts in saved form
6. If verified, `handleResumeRestore()` loads the draft

### Why Auto-Resume is Disabled

The following were disabled to ensure fresh starts:
- localStorage auto-restore on page load (lines 3474-3501)
- Email-based draft detection (lines 3617-3659)

Form always starts blank. Resume is user-initiated only.

## Form Validation

### Per-Step Validation
- Required fields checked before advancing
- Format validation (email, phone, NPI patterns)
- Composite types validate all sub-fields

### Validation Functions

| Function | Purpose |
|----------|---------|
| `validateStep()` | Validate all fields in current step |
| `validateField()` | Validate single field |
| `evaluateCondition()` | Check show_when conditions |

## Word Document Export

Uses `docx.js` library to generate formatted Word document:
- Providence Health branding header
- Organized sections matching form structure
- Tables for contacts, providers, locations
- Downloaded on submission

## Security Features

### Content Security Policy
Defined in `index.html` `<meta>` tag:
- Scripts only from trusted CDNs
- Styles allow inline (Tailwind)
- Images from Providence CDN
- Connections to Supabase only

### Subresource Integrity (SRI)
CDN libraries verified with SHA-384 hashes:
- React 18.3.1
- ReactDOM 18.3.1
- Babel 7.28.5
- docx 8.5.0

## Common Tasks

### Adding a New Question

1. Open `src/data/form-definition.json`
2. Find the appropriate step
3. Add question object to `questions` array:

```json
{
  "question_id": "new_field",
  "type": "text",
  "label": "New Field Label",
  "required": true,
  "help_text": "Explanation for users"
}
```

### Adding Conditional Visibility

```json
{
  "question_id": "field_for_p4m_only",
  "type": "text",
  "label": "P4M-Specific Field",
  "show_when": {
    "question_id": "program",
    "operator": "equals",
    "value": "P4M"
  }
}
```

### Adding Dropdown Options

1. Open `src/data/reference-data.json`
2. Add or modify options array
3. Reference in question with `options_ref`

## Debugging

Enable debug logging by uncommenting in app.js:
```javascript
const DEBUG = true;
```

Logs prefixed with `[Component]` for easy filtering:
- `[FormWizard]` - Main wizard events
- `[Supabase]` - Database operations
- `[Resume]` - Resume/restore operations
- `[Validation]` - Field validation

## Do NOT

- Add auto-resume behavior (explicitly disabled for security)
- Store sensitive data in localStorage long-term
- Modify CDN URLs without updating SRI hashes
- Add fields without updating form-definition.json
- Skip email verification for resume flow
- Remove the explicit resume button requirement

## Version

**v1.0** | Designed and maintained by Glen Lewis
