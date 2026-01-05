# Propel Health Onboarding Questionnaire

Client-facing questionnaire for onboarding new clinics to Propel Health programs.

## Programs Supported
- **Prevention4ME (P4M)** - Cancer prevention genetic testing
- **Precision4ME (PR4M)** - Precision medicine
- **GenoRx (GRX)** - Pharmacogenomics

## How It Works
1. Clinic fills out the questionnaire form
2. Form validates data against schema
3. User downloads JSON file
4. JSON is imported via MCP tool into Propel database

## Project Structure
```
propel-onboarding-form/
├── index.html              # Main entry point
├── README.md               # This file
├── .gitignore              # Git ignore rules
├── src/
│   ├── data/               # Reference data and schema
│   │   ├── reference-data.json   # Dropdown options
│   │   ├── test-catalog.json     # Lab test definitions
│   │   └── schema.json           # JSON Schema (draft-07)
│   └── samples/            # Example questionnaire responses
│       ├── sample-p4m.json       # Prevention4ME example
│       └── sample-grx.json       # GenoRx example
└── docs/
    └── SCHEMA.md           # Schema documentation
```

## Local Development

```bash
# Serve locally (Python 3)
python -m http.server 8000

# Or use Node
npx serve
```

Then open http://localhost:8000 in your browser.

## Deployment

This project is deployed to GitHub Pages. Push to `main` branch to deploy.

## Schema Documentation

See [docs/SCHEMA.md](docs/SCHEMA.md) for detailed schema documentation including:
- Field descriptions and requirements
- Program-conditional fields
- Database mapping
- Validation rules

## Reference Data

### Programs
| Value | Display Name | Description |
|-------|--------------|-------------|
| P4M | Prevention4ME | Cancer prevention |
| PR4M | Precision4ME | Precision medicine |
| GRX | GenoRx | Pharmacogenomics |

### Labs
| Value | Display Name | Programs |
|-------|--------------|----------|
| AMBRY | Ambry Genetics | P4M, PR4M |
| HELIX | Helix | GRX |

## Sample Files

The `src/samples/` directory contains valid example questionnaire responses:

- **sample-p4m.json** - Full Prevention4ME example with:
  - Multiple satellite locations
  - All contact types
  - Multiple test products with modifications
  - Multiple ordering providers

- **sample-grx.json** - Simpler GenoRx example with:
  - Single location
  - Primary and secondary contacts only
  - Single test product
  - Single ordering provider

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

## Contributing

1. Make changes to the form or schema
2. Validate sample files against schema
3. Update SCHEMA.md if schema changes
4. Commit and push to main

## License

Proprietary - Propel Health
