# Form Definition Schema

This document describes how `form-definition.json` works and how to modify it.

## Overview

The form-driven architecture allows the questionnaire structure to be defined entirely in JSON. This means:

- **No code changes required** to add, remove, or modify questions
- **MCP tools can update** the form definition programmatically
- **Validation rules** are defined alongside questions
- **Conditional logic** (show/hide) is declarative

## File Structure

```
src/data/form-definition.json
```

## Top-Level Properties

| Property | Type | Description |
|----------|------|-------------|
| `form_id` | string | Unique identifier for the form |
| `version` | string | Schema version (e.g., "1.0") |
| `title` | string | Form title displayed in header |
| `description` | string | Form description |
| `steps` | array | Array of step definitions |
| `composite_types` | object | Reusable field group definitions |

## Step Definition

Each step in the `steps` array has:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `step_id` | string | Yes | Unique step identifier |
| `title` | string | Yes | Step title |
| `description` | string | No | Step description |
| `order` | number | Yes | Display order (1-based) |
| `questions` | array | Yes* | Array of question definitions |
| `repeatable` | boolean | No | If true, step allows multiple items |
| `repeatable_config` | object | No* | Configuration for repeatable steps |
| `is_review_step` | boolean | No | If true, renders the review/download step |

*Required unless `is_review_step` is true

### Repeatable Step Configuration

```json
{
  "repeatable": true,
  "repeatable_config": {
    "min_items": 0,
    "max_items": 20,
    "add_button_text": "Add Location",
    "item_title_template": "Location {{index}}"
  }
}
```

## Question Definition

Each question in a step's `questions` array has:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `question_id` | string | Yes | Unique question identifier |
| `type` | string | Yes | Question type (see below) |
| `label` | string | Yes | Display label |
| `required` | boolean | No | If true, field is required |
| `placeholder` | string | No | Placeholder text |
| `help_text` | string | No | Help text below field |
| `options_ref` | string | No | Reference to options in reference-data.json |
| `pattern` | string | No | Regex pattern for validation |
| `max_length` | number | No | Maximum character length |
| `rows` | number | No | Number of rows for textarea |
| `show_when` | object | No | Conditional visibility |
| `conditional_options` | object | No | Filter options based on another field |

## Question Types

### Basic Types

| Type | Description | Component |
|------|-------------|-----------|
| `text` | Single-line text input | TextField |
| `textarea` | Multi-line text input | TextArea |
| `select` | Dropdown select | SelectField |
| `radio` | Radio button group | RadioGroup |
| `checkbox` | Single checkbox | CheckboxField |

### Composite Types

| Type | Description | Fields |
|------|-------------|--------|
| `address` | Street, city, state, zip | 4 fields |
| `contact_group` | Name, title, email, phone, preferences | 6 fields |
| `stakeholder_group` | Name, title, email | 3 fields |

Composite types are defined in `composite_types` and automatically render grouped fields.

## Conditional Visibility (show_when)

Show a question only when another field has a specific value:

```json
{
  "question_id": "indication",
  "type": "select",
  "label": "Indication",
  "show_when": {
    "question_id": "program",
    "operator": "in",
    "value": ["P4M", "PR4M"]
  }
}
```

### Operators

| Operator | Description |
|----------|-------------|
| `equals` | Value equals target |
| `not_equals` | Value does not equal target |
| `in` | Value is in target array |
| `not_in` | Value is not in target array |

## Conditional Options (conditional_options)

Filter dropdown options based on another field:

```json
{
  "question_id": "lab_partner",
  "type": "select",
  "options_ref": "labs",
  "conditional_options": {
    "depends_on": "program",
    "mapping": {
      "P4M": ["AMBRY"],
      "PR4M": ["AMBRY"],
      "GRX": ["HELIX"]
    }
  }
}
```

## Reference Data

Options for select/radio fields come from `reference-data.json`:

```json
{
  "programs": [
    {"value": "P4M", "display_name": "Prevention4ME", "description": "..."},
    {"value": "PR4M", "display_name": "Precision4ME", "description": "..."}
  ]
}
```

Reference in question:
```json
{
  "question_id": "program",
  "type": "radio",
  "options_ref": "programs"
}
```

## Adding a New Question

1. Open `src/data/form-definition.json`
2. Find the appropriate step in the `steps` array
3. Add a new question object to the `questions` array:

```json
{
  "question_id": "new_field",
  "type": "text",
  "label": "New Field Label",
  "required": false,
  "placeholder": "Enter value...",
  "help_text": "This is a new field"
}
```

## Adding a New Step

1. Add a new step object to the `steps` array
2. Set the `order` to place it in sequence
3. Add questions to the step

```json
{
  "step_id": "new_step",
  "title": "New Step Title",
  "description": "Description of this step",
  "order": 5,
  "questions": [
    {
      "question_id": "new_question",
      "type": "text",
      "label": "Question Label",
      "required": true
    }
  ]
}
```

## Adding New Options

1. Open `src/data/reference-data.json`
2. Add a new array or modify an existing one:

```json
{
  "new_options": [
    {"value": "OPTION1", "display_name": "Option One"},
    {"value": "OPTION2", "display_name": "Option Two"}
  ]
}
```

3. Reference in form-definition.json:

```json
{
  "question_id": "my_field",
  "type": "select",
  "options_ref": "new_options"
}
```

## Validation

Validation is automatic based on question properties:

- `required: true` - Field must have a value
- `pattern: "regex"` - Value must match pattern
- `max_length: 100` - Maximum character count

## Best Practices

1. **Use descriptive question_ids** - e.g., `clinic_name` not `q1`
2. **Add help_text** for complex fields
3. **Use composite types** for repeated field patterns
4. **Test conditional logic** after changes
5. **Validate JSON syntax** before deploying

## MCP Integration

The form definition is designed for MCP tool integration:

```python
# Example MCP tool: add_question
def add_question(step_id, question):
    form_def = load_form_definition()
    step = find_step(form_def, step_id)
    step['questions'].append(question)
    save_form_definition(form_def)
```

Future MCP tools can:
- Add/remove/modify questions
- Add/remove steps
- Update conditional logic
- Modify reference data options
