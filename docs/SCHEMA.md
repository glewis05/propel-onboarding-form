# Onboarding Questionnaire Schema Documentation

## Overview
This document describes the JSON schema for the Propel Health Onboarding Questionnaire.

## Schema Version
Current version: 1.0

## Programs
- **P4M** (Prevention4ME) - Cancer prevention genetic testing
- **PR4M** (Precision4ME) - Precision medicine
- **GRX** (GenoRx) - Pharmacogenomics

## Section Descriptions

### program
The Propel Health program being onboarded. Determines which lab/tests are available and which fields are required.

### clinic_information
Basic clinic details including name, address, and hours.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| clinic_name | string | Yes | Official clinic name |
| epic_department_id | string | No | Epic department identifier |
| address | object | No | Street, city, state, zip |
| timezone | enum | No | PT, MT, CT, ET |
| hours_of_operation | string | Yes | Operating hours description |
| website_main | string | No | Main website URL |
| website_patient_facing | string | No | Patient portal URL |

### contacts
Key personnel for the onboarding process. Primary contact is required.

| Contact Type | Required | Description |
|--------------|----------|-------------|
| primary | Yes | Main point of contact (name + email required) |
| secondary | No | Backup contact |
| marketing | No | Marketing/communications contact |
| project_manager | No | IT/Project management contact |
| workflow_lead | No | Clinical workflow lead |

Each contact can include:
- name, title, email, phone
- preferred_channel (EMAIL, TEAMS, SLACK, ZOOM)
- preferred_time (MORNING, AFTERNOON)
- notes

### stakeholders
Additional personnel who should be informed but aren't primary contacts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Stakeholder name |
| title | string | No | Job title |
| email | string | Yes | Email address |
| display_name | string | No | Name with credentials (e.g., "Dr. Smith, MD") |

### program_customization
Program-specific settings including modules (P4M/PR4M only), helpdesk info, and invitation signature.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| modules.tc_enabled | boolean | P4M/PR4M only | Enable Tyrer-Cuzick scoring |
| modules.nccn_enabled | boolean | P4M/PR4M only | Enable NCCN guidelines |
| helpdesk.email | string | No | Helpdesk email |
| helpdesk.phone | string | Yes | Helpdesk phone number |
| invitation_signature | string | No | Signature for patient invitations |

### lab_order_configuration
Lab and testing configuration including test products, specimen types, and defaults.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| test_provider | enum | Yes | AMBRY or HELIX |
| test_products | array | Yes | At least 1, exactly 1 must be default |
| specimen_type | option_config | No | Available specimen types and default |
| send_kit_to_patient | option_config | No | Kit shipping options |
| billing_method | option_config | No | Billing method options |
| indication | option_config | P4M/PR4M only | Testing indication |
| criteria_for_testing | option_config | P4M/PR4M only | Testing criteria |

#### Test Product Structure
```json
{
  "test_code": "8874",
  "test_name": "CancerNext-Expanded",
  "is_default": true,
  "modifications": {
    "type": "LIMITED_EVIDENCE_GENES",
    "option": "STANDARD",
    "genes_removed": null
  }
}
```

### ordering_providers
Healthcare providers authorized to order tests. At least one required with valid NPI.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Provider full name |
| title | string | No | Professional title |
| email | string | Yes | Email address |
| phone | string | No | Phone number |
| npi | string | Yes | 10-digit National Provider Identifier |
| display_name | string | No | Name with credentials |
| locations | array | No | Location names where provider practices |

### branding
Flags indicating which branding assets have been received.

| Field | Type | Description |
|-------|------|-------------|
| style_guide_received | boolean | Style guide received |
| logo_received | boolean | Logo files received |
| compliance_docs_received | boolean | Compliance documentation received |
| notes | string | Additional notes |

### metadata
Form submission metadata including version and responder info.

| Field | Type | Description |
|-------|------|-------------|
| form_version | string | Version of questionnaire form |
| responder_name | string | Person completing the form |
| responder_email | string | Email of person completing form |

## Program-Conditional Fields

| Field | P4M | PR4M | GRX |
|-------|-----|------|-----|
| modules.tc_enabled | Required | Required | Not used |
| modules.nccn_enabled | Required | Required | Not used |
| indication | Required | Required | Not used |
| criteria_for_testing | Required | Required | Not used |
| test_provider options | AMBRY | AMBRY | HELIX |

## Database Mapping

When the JSON is imported via MCP tool, data maps to these database tables:

| JSON Section | Database Table(s) |
|--------------|-------------------|
| clinic_information | clinics |
| contacts | (future: onboarding_contacts) |
| stakeholders | (future: onboarding_contacts) |
| program_customization | config_values |
| lab_order_configuration | config_values |
| ordering_providers | providers |
| Full JSON | (future: onboarding_projects.questionnaire_data) |

## Validation Rules

### Required Fields (All Programs)
- `program` - Must be P4M, PR4M, or GRX
- `clinic_information.clinic_name` - Non-empty string
- `clinic_information.hours_of_operation` - Non-empty string
- `contacts.primary.name` - Non-empty string
- `contacts.primary.email` - Valid email format
- `program_customization.helpdesk.phone` - Non-empty string
- `lab_order_configuration.test_provider` - AMBRY or HELIX
- `lab_order_configuration.test_products` - Array with at least 1 item
- `lab_order_configuration.test_products` - Exactly one item with `is_default: true`
- `ordering_providers` - Array with at least 1 item
- `ordering_providers[].name` - Non-empty string
- `ordering_providers[].email` - Valid email format
- `ordering_providers[].npi` - Exactly 10 digits

### Additional Required Fields (P4M/PR4M Only)
- `program_customization.modules.tc_enabled` - Boolean
- `program_customization.modules.nccn_enabled` - Boolean
- `lab_order_configuration.indication.default` - Non-empty string
- `lab_order_configuration.criteria_for_testing.default` - Non-empty string

### Format Validations
- Email fields must be valid email format (contains @)
- NPI must be exactly 10 digits (regex: `^[0-9]{10}$`)
- State codes must be 2 uppercase letters (regex: `^[A-Z]{2}$`)
- ZIP codes must be 5 or 9 digits (regex: `^[0-9]{5}(-[0-9]{4})?$`)

## Example Files

See the sample files for complete, valid examples:
- `src/samples/sample-p4m.json` - Prevention4ME example with full configuration
- `src/samples/sample-grx.json` - GenoRx example (simpler, no indication/criteria)

## Changelog

### Version 1.0 (2025-01-05)
- Initial schema release
- Support for P4M, PR4M, GRX programs
- AMBRY and HELIX lab integrations
