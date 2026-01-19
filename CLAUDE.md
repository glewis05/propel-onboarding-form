# Propel Onboarding Form

## Project Purpose
Client-facing questionnaire form for onboarding new clinics to Propel Health programs. Clinics fill out the form, download JSON, and the data is imported into the unified database via MCP tools.

## Owner Context
- Solo developer (no separate front-end/back-end team)
- Familiar with R, learning Python — explain Python concepts with R comparisons where helpful
- Aviation background — aviation analogies work well for complex concepts
- This form is used by external clinic staff — keep it simple and user-friendly

## Tech Stack
- **HTML/JavaScript**: Pure static files, no framework
- **JSON Schema**: draft-07 for validation
- **No build step**: Direct GitHub Pages deployment

## Programs Supported
| Value | Display Name | Description |
|-------|--------------|-------------|
| P4M | Prevention4ME | Cancer prevention genetic testing |
| PR4M | Precision4ME | Precision medicine |
| GRX | GenoRx | Pharmacogenomics |

## File Organization
```
propel-onboarding-form/
├── index.html              # Main questionnaire form
├── uat-tracker.html        # UAT progress tracker
├── src/
│   ├── data/
│   │   ├── reference-data.json   # Dropdown options
│   │   ├── test-catalog.json     # Lab test definitions
│   │   └── schema.json           # JSON Schema (draft-07)
│   └── samples/
│       ├── sample-p4m.json       # Prevention4ME example
│       └── sample-grx.json       # GenoRx example
├── docs/
│   └── SCHEMA.md           # Schema documentation
└── README.md               # User documentation
```

## Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Pages   │     │   JSON Export   │     │  MCP Import     │
│  Questionnaire  │────▶│   (Download)    │────▶│  Tool           │
│  Form           │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  SQLite DB      │
                                                │  - clinics      │
                                                │  - locations    │
                                                │  - providers    │
                                                │  - config_values│
                                                └─────────────────┘
```

## Form Sections

1. **Program Selection**: Which program(s) the clinic is joining
2. **Clinic Information**: Name, address, contact details
3. **Satellite Locations**: Additional sites under this clinic
4. **Contacts**: Primary, secondary, IT, clinical contacts
5. **Test Products**: Lab tests to enable, with any modifications
6. **Ordering Providers**: Providers who can order tests (NPIs required)
7. **EHR Integration**: If applicable, EHR type and credentials

## Schema Validation

The form validates against `src/data/schema.json` (JSON Schema draft-07):
- Required fields checked before download
- Format validation (email, phone, NPI)
- Conditional fields based on program selection
- Array min/max items for locations, providers

## Local Development

```bash
# Serve locally (Python 3)
python -m http.server 8000

# Or use Node
npx serve

# Then open http://localhost:8000
```

## Deployment

Hosted on GitHub Pages:
1. Push to `main` branch
2. GitHub Pages serves from root
3. URL: `https://glewis05.github.io/propel-onboarding-form/`

## Import via MCP

After clinic downloads their JSON:

```
import_onboarding_questionnaire(file_path="/path/to/questionnaire.json")
```

This creates:
- Clinic record in `clinics` table
- Location records in `locations` table
- Provider records in `providers` table
- Initial configuration values in `config_values` table

## Do NOT
- Store submitted data on the server (client downloads JSON locally)
- Include any server-side code (this is pure static)
- Add fields without updating both schema.json AND SCHEMA.md
- Remove validation — clinics depend on it catching errors early
