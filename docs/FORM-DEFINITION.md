# Form Definition Architecture

## Overview

The Providence Propel Onboarding Form uses a JSON-driven architecture where the form structure, questions, validation rules, and conditional logic are all defined in configuration files rather than hardcoded in components.

## Key Files

| File | Purpose |
|------|---------|
| `public/data/form-definition.json` | Main form structure with steps and questions |
| `public/data/reference-data.json` | Dropdown options, program lists, lab partners |
| `public/data/test-catalog.json` | Test panels and gene lists by lab partner |

## Form Definition Structure

```json
{
  "form_id": "providence_propel_onboarding",
  "version": "2.0",
  "title": "Providence Propel Program Onboarding",
  "steps": [
    {
      "step_id": "step_identifier",
      "title": "Step Title",
      "description": "Optional step description",
      "questions": [...],
      "repeatable": false,
      "is_review_step": false
    }
  ]
}
```

## Question Types

### Basic Types

| Type | Component | Description |
|------|-----------|-------------|
| `text` | TextField | Single-line text input |
| `textarea` | TextArea | Multi-line text input |
| `select` | SelectField | Dropdown selection |
| `radio` | RadioGroup | Radio button group |
| `checkbox` | CheckboxField | Single checkbox |

### Composite Types

| Type | Component | Description |
|------|-----------|-------------|
| `address` | AddressGroup | Street, city, state, zip fields |
| `contact_group` | ContactGroup | Name, email, phone fields |
| `stakeholder_group` | StakeholderGroup | Contact + role dropdown |

### Special Types

| Type | Component | Description |
|------|-----------|-------------|
| `select_with_alternates` | SelectWithAlternates | Primary + alternate selections |
| `gene_selector` | GeneSelector | Multi-select with 90 genes |
| `provider_filter_list` | ProviderFilterList | Mini-repeatable for providers |

## Question Properties

```json
{
  "question_id": "unique_id",
  "type": "text",
  "label": "Question label",
  "placeholder": "Placeholder text",
  "help_text": "Additional guidance",
  "required": true,
  "validation": {
    "type": "email|phone|npi|pattern",
    "pattern": "regex pattern",
    "min_length": 1,
    "max_length": 100
  },
  "options_ref": "reference_data_key",
  "show_when": {
    "field": "other_question_id",
    "operator": "equals|not_equals|in|not_in|not_empty|empty",
    "value": "comparison_value"
  },
  "conditional_options": {
    "depends_on": "field_id",
    "filter_by": "property_name"
  }
}
```

## Repeatable Sections

Steps can be marked as repeatable for adding multiple items (e.g., satellite locations, ordering providers):

```json
{
  "step_id": "ordering_providers",
  "repeatable": true,
  "repeatable_config": {
    "min_items": 1,
    "max_items": 20,
    "add_button_text": "+ Add Another Provider",
    "item_title_template": "Provider #{{index}}"
  },
  "questions": [...]
}
```

## Conditional Visibility (show_when)

Questions can be shown/hidden based on other field values:

```json
{
  "show_when": {
    "field": "lab_partner",
    "operator": "equals",
    "value": "invitae"
  }
}
```

**Supported Operators:**
- `equals` - Exact match
- `not_equals` - Not matching
- `in` - Value in array
- `not_in` - Value not in array
- `not_empty` - Has any value
- `empty` - Has no value

## Conditional Options Filtering

Dropdown options can be filtered based on other selections:

```json
{
  "question_id": "test_panel",
  "type": "select",
  "options_ref": "test_catalog",
  "conditional_options": {
    "depends_on": "lab_partner"
  }
}
```

## Reference Data Structure

```json
{
  "programs": [
    { "value": "program_code", "display_name": "Program Name" }
  ],
  "lab_partners": [
    { "value": "lab_code", "display_name": "Lab Name" }
  ],
  "states": [
    { "value": "WA", "display_name": "Washington" }
  ]
}
```

## Test Catalog Structure

```json
{
  "invitae": {
    "lab_name": "Invitae",
    "tests": [
      {
        "test_code": "TEST001",
        "test_name": "Test Name",
        "genes": ["GENE1", "GENE2"]
      }
    ]
  }
}
```

## Adding New Question Types

1. Create component in `src/components/question-types/`
2. Export from `src/components/question-types/index.js`
3. Add case in `QuestionRenderer.jsx`
4. Update validation in `src/utils/validation.js` if needed
