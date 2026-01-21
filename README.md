# Providence Health Clinic Onboarding Form

A React-based multi-step questionnaire for onboarding new clinics to Propel Health programs.

**Version:** 1.0
**Designed and maintained by:** Glen Lewis

## Overview

This application provides a user-friendly questionnaire that clinics complete when joining Propel Health programs. The form collects clinic information, contacts, test configurations, and ordering provider details.

### Key Features

- **Multi-step wizard** with progress indicator and navigation
- **Auto-save to Supabase** - drafts saved automatically as users fill out the form
- **Resume functionality** - users can resume incomplete forms by verifying their email
- **Form-driven architecture** - questions defined in JSON, no code changes needed to modify
- **Conditional logic** - fields show/hide based on program selection
- **Word document export** - generate formatted submission document
- **Mobile-responsive** - works on desktop, tablet, and mobile devices

## Programs Supported

| Program | Description | Lab Partner |
|---------|-------------|-------------|
| **Prevention4ME (P4M)** | Cancer prevention genetic testing | Ambry Genetics |
| **Precision4ME (PR4M)** | Precision medicine | Ambry Genetics |
| **GenoRx (GRX)** | Pharmacogenomics | Helix |

## How It Works

### New Clinic Flow
1. Clinic staff opens the form (starts blank)
2. Fills out multi-step questionnaire
3. Form auto-saves to Supabase as they progress
4. Reviews all entries on summary page
5. Submits form and downloads Word document

### Resume Flow
1. User clicks "Resume Your Onboarding Form" button
2. Selects their clinic from list of in-progress drafts
3. Verifies identity with email address used in form
4. Form loads at last saved position

## Tech Stack

- **React 18** - UI framework (via CDN, no build step)
- **Tailwind CSS** - Styling (via CDN)
- **Babel** - JSX transpilation in browser
- **Supabase** - Database for draft storage and submission
- **docx.js** - Word document generation
- **GitHub Pages** - Static hosting

## Project Structure

```
propel-onboarding-form/
├── index.html                    # Main entry point
├── README.md                     # This file
├── CLAUDE.md                     # Instructions for Claude AI
├── src/
│   ├── js/
│   │   └── app.js               # React application (4000+ lines)
│   ├── css/
│   │   └── styles.css           # Custom styles
│   └── data/
│       ├── form-definition.json  # Form structure and questions
│       ├── reference-data.json   # Dropdown options
│       ├── test-catalog.json     # Lab test definitions
│       └── schema.json           # JSON Schema for validation
├── docs/
│   ├── FORM-DEFINITION.md       # How to modify form questions
│   └── SCHEMA.md                # Data schema documentation
└── src/samples/
    ├── sample-p4m.json          # Prevention4ME example
    └── sample-grx.json          # GenoRx example
```

## Form Sections

1. **Program Selection** - Which Propel Health program
2. **Clinic Information** - Name, address, hours, Epic ID
3. **Satellite Locations** - Additional clinic sites (repeatable)
4. **Clinic Champion** - Primary contact for onboarding
5. **Additional Contacts** - Secondary, IT, lab contacts
6. **Stakeholders** - Executive sponsors and leadership
7. **Program Customization** - Modules, helpdesk, branding
8. **Lab Configuration** - Test products, specimens, billing
9. **Ordering Providers** - NPIs and credentials (repeatable)
10. **Review & Submit** - Summary and submission

## Local Development

```bash
# Serve locally (Python 3)
python -m http.server 8000

# Or use Node
npx serve

# Then open http://localhost:8000
```

## Deployment

Hosted on GitHub Pages. Push to `main` branch to deploy automatically.

**Live URL:** https://glewis05.github.io/propel-onboarding-form/

## Configuration

### Environment Variables

Supabase credentials are configured in `src/js/app.js`:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Modifying the Form

See [docs/FORM-DEFINITION.md](docs/FORM-DEFINITION.md) for how to:
- Add/remove/modify questions
- Add new steps
- Configure conditional visibility
- Add dropdown options

### Schema Documentation

See [docs/SCHEMA.md](docs/SCHEMA.md) for:
- Field descriptions and requirements
- Program-conditional fields
- Validation rules
- Database mapping

## Database Schema (Supabase)

### onboarding_submissions

| Column | Type | Description |
|--------|------|-------------|
| submission_id | uuid | Primary key |
| submitter_email | text | Email for resume verification |
| submitter_name | text | Name of person filling form |
| program_prefix | text | P4M, PR4M, or GRX |
| clinic_name | text | Extracted clinic name |
| form_data | jsonb | Full form data |
| submission_status | text | draft, submitted, approved |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

## Security Features

- **Content Security Policy** - Restricts script/style sources
- **Subresource Integrity** - CDN files verified with SRI hashes
- **Email verification** - Required to resume drafts
- **No server-side storage of sensitive data** - Clinic downloads their own copy

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Make changes to form definition or code
2. Test locally with `python -m http.server 8000`
3. Verify form loads and saves correctly
4. Update documentation if schema changes
5. Commit and push to main

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01 | Initial release with React form wizard, Supabase integration, resume functionality |

## License

Proprietary - Propel Health

---

*v1.0 | Designed and maintained by Glen Lewis*
