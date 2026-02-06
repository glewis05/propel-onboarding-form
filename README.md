# Propel Onboarding Form

A React-based clinic onboarding questionnaire for PICI Programs (Prevention4ME, Precision4ME, GenoRx).

## Project Structure

```
propel-onboarding-form/
├── app/                    # Vite + React application
│   ├── src/               # Source code
│   ├── public/            # Static assets (form definitions, test catalog)
│   └── dist/              # Production build
├── docs/                   # Documentation
│   ├── UAT-TEST-SET.*     # UAT test cases (Excel + Markdown)
│   ├── UAT-VALIDATION-LOG.md  # Test results and fixes
│   ├── FORM-DEFINITION.md # Form schema documentation
│   ├── MIGRATION-NOTES.md # Migration from legacy version
│   └── SCHEMA.md          # Data schema
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge functions
└── CLAUDE.md              # AI assistant instructions
```

## Quick Start

```bash
cd app
npm install
npm run dev
```

## Authentication & Draft Resume

Uses admin-generated 6-digit codes (bypasses enterprise email security issues):

1. Admin generates code: `SELECT generate_login_code('user@example.com');`
2. Admin shares code via Slack/Teams
3. User enters email + code on login page

**Resuming a draft**: User clicks "Resume Assessment" → sees their drafts (filtered by submitter email) → selects one → verifies identity by entering a contact email from the draft → draft loads.

## Deployment

Deployed to Vercel. Push to `main` branch triggers automatic deployment.

- **Production**: [propel-onboarding-form.vercel.app](https://propel-onboarding-form.vercel.app)

## Supabase

- **Project**: `royctwjkewpnrcqdyhzd` (propel-operations)
- **Tables**: `programs`, `onboarding_submissions`, `manual_login_codes`

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Full architecture reference (component tree, data flow, output schema)
- [CLAUDE.md](./CLAUDE.md) - AI assistant context and instructions
- [docs/](./docs/) - UAT test cases, validation logs, schemas

## Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Deployment**: Vercel
