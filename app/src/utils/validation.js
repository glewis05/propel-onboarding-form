import { debugLog } from './debug';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Evaluate a "show_when" condition to determine if a question should be visible.
 *
 * @param {Object} condition - The show_when condition object from the question definition
 * @param {Object} formData - Current form data to check against
 * @returns {boolean} - Whether the question should be shown
 *
 * Supported operators:
 * - "equals": value === target
 * - "not_equals": value !== target
 * - "in": target array includes value
 * - "not_in": target array does not include value
 * - "not_empty": value exists and is not empty
 * - "empty": value is empty or doesn't exist
 */
export function evaluateCondition(condition, formData) {
    if (!condition) return true; // No condition = always show

    const { question_id, operator, value: targetValue } = condition;
    const currentValue = formData[question_id];

    debugLog(`[Condition] Evaluating: ${question_id} ${operator} ${JSON.stringify(targetValue)}, current=${currentValue}`);

    switch (operator) {
        case 'equals':
            return currentValue === targetValue;
        case 'not_equals':
            return currentValue !== targetValue;
        case 'in':
            return Array.isArray(targetValue) && targetValue.includes(currentValue);
        case 'not_in':
            return Array.isArray(targetValue) && !targetValue.includes(currentValue);
        case 'not_empty':
            // Check if value exists and is not empty (handles strings, arrays, objects)
            if (currentValue === undefined || currentValue === null || currentValue === '') return false;
            if (Array.isArray(currentValue)) return currentValue.length > 0;
            if (typeof currentValue === 'object') return Object.keys(currentValue).length > 0;
            return true;
        case 'empty':
            // Opposite of not_empty
            if (currentValue === undefined || currentValue === null || currentValue === '') return true;
            if (Array.isArray(currentValue)) return currentValue.length === 0;
            if (typeof currentValue === 'object') return Object.keys(currentValue).length === 0;
            return false;
        default:
            console.warn(`[Condition] Unknown operator: ${operator}`);
            return true;
    }
}

/**
 * Filter options based on conditional_options configuration.
 * Used when dropdown options depend on another field's value.
 *
 * @param {Array} options - Full list of options from reference data
 * @param {Object} conditionalConfig - The conditional_options config from question
 * @param {Object} formData - Current form data
 * @returns {Array} - Filtered options
 */
export function filterConditionalOptions(options, conditionalConfig, formData) {
    if (!conditionalConfig) return options;

    const { depends_on, mapping } = conditionalConfig;
    const dependentValue = formData[depends_on];

    if (!dependentValue || !mapping || !mapping[dependentValue]) {
        debugLog(`[Options] No mapping for ${depends_on}=${dependentValue}`);
        return options;
    }

    const allowedValues = mapping[dependentValue];
    debugLog(`[Options] Filtering by ${depends_on}=${dependentValue}, allowed=${JSON.stringify(allowedValues)}`);

    return options.filter(opt => allowedValues.includes(opt.value));
}

/**
 * Validate a single field value against the question definition.
 *
 * @param {*} value - Current field value
 * @param {Object} question - Question definition
 * @returns {string|null} - Error message or null if valid
 */
export function validateField(value, question) {
    // Check required
    if (question.required) {
        if (value === undefined || value === null || value === '') {
            return `${question.label} is required`;
        }
        // For gene_selector, value is an array - check that at least one gene is selected
        if (question.type === 'gene_selector') {
            if (!Array.isArray(value) || value.length === 0) {
                return `${question.label}: Please select at least one gene`;
            }
        }
        // For provider_filter_list, check array has items with valid first/last name
        if (question.type === 'provider_filter_list') {
            const minItems = question.repeatable_config?.min_items || 1;
            if (!Array.isArray(value) || value.length < minItems) {
                return `${question.label}: Please add at least ${minItems} provider(s)`;
            }
            // Check that each item has required fields filled
            const invalidItems = value.filter(item =>
                !item.first_name?.trim() || !item.last_name?.trim()
            );
            if (invalidItems.length > 0) {
                return `${question.label}: Please fill in first and last name for all providers`;
            }
        }
        // For select_with_alternates, check if default value is selected
        if (question.type === 'select_with_alternates') {
            if (typeof value === 'object' && !value.default) {
                return `${question.label} default selection is required`;
            }
        }
        // For composite types, check if at least required sub-fields are filled
        if (typeof value === 'object' && !Array.isArray(value)) {
            // This is handled by composite type validators
        }
    }

    // Check pattern (regex validation)
    if (question.pattern && value) {
        const regex = new RegExp(question.pattern);
        if (!regex.test(value)) {
            return question.pattern_error || `${question.label} format is invalid`;
        }
    }

    // Check max_length
    if (question.max_length && value && value.length > question.max_length) {
        return `${question.label} must be ${question.max_length} characters or less`;
    }

    return null;
}

/**
 * Validate all questions in a step.
 *
 * @param {Object} step - Step definition
 * @param {Object} formData - Current form data
 * @param {Object} compositeTypes - Composite type definitions
 * @returns {Object} - { isValid: boolean, errors: { questionId: errorMessage } }
 */
export function validateStep(step, formData, compositeTypes) {
    const errors = {};

    if (step.is_review_step) {
        return { isValid: true, errors: {} };
    }

    // For repeatable steps, validate each item
    if (step.repeatable) {
        const items = formData[step.step_id] || [];
        const minItems = step.repeatable_config?.min_items || 0;

        if (items.length < minItems) {
            errors._section = `At least ${minItems} item(s) required`;
        }

        items.forEach((item, index) => {
            step.questions.forEach(question => {
                // Check show_when condition (merge item data for local lookups)
                const mergedData = { ...formData, ...item };
                if (!evaluateCondition(question.show_when, mergedData)) return;

                const value = item[question.question_id];
                const error = validateField(value, question);
                if (error) {
                    errors[`${index}_${question.question_id}`] = error;
                }

                // Validate composite type fields
                if (compositeTypes[question.type]) {
                    const compositeValue = item[question.question_id] || {};
                    compositeTypes[question.type].fields.forEach(field => {
                        if (field.required && !compositeValue[field.field_id]) {
                            if (question.required) { // Only if parent is required
                                errors[`${index}_${question.question_id}_${field.field_id}`] = `${field.label} is required`;
                            }
                        }
                        // Check pattern (regex validation) for composite fields
                        if (field.pattern && compositeValue[field.field_id]) {
                            const regex = new RegExp(field.pattern);
                            if (!regex.test(compositeValue[field.field_id])) {
                                errors[`${index}_${question.question_id}_${field.field_id}`] = `${field.label} format is invalid`;
                            }
                        }
                    });
                }
            });
        });
    } else {
        // Regular step - validate each question
        step.questions.forEach(question => {
            // Check show_when condition
            if (!evaluateCondition(question.show_when, formData)) return;

            const value = formData[question.question_id];
            const error = validateField(value, question);
            if (error) {
                errors[question.question_id] = error;
            }

            // Validate composite type fields
            // Skip for provider_filter_list - it uses array structure and is validated in validateField
            if (compositeTypes[question.type] && question.type !== 'provider_filter_list') {
                const compositeValue = formData[question.question_id] || {};
                compositeTypes[question.type].fields.forEach(field => {
                    if (field.required && !compositeValue[field.field_id]) {
                        if (question.required) { // Only if parent is required
                            errors[`${question.question_id}_${field.field_id}`] = `${field.label} is required`;
                        }
                    }
                    // Check pattern (regex validation) for composite fields
                    if (field.pattern && compositeValue[field.field_id]) {
                        const regex = new RegExp(field.pattern);
                        if (!regex.test(compositeValue[field.field_id])) {
                            errors[`${question.question_id}_${field.field_id}`] = `${field.label} format is invalid`;
                        }
                    }
                });
            }
        });
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}
