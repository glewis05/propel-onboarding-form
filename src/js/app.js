/**
 * PROPEL HEALTH ONBOARDING QUESTIONNAIRE
 * =======================================
 * Form-Driven Architecture
 *
 * This application renders a multi-step questionnaire based on a JSON form definition.
 * The form structure is NOT hardcoded - it's read from form-definition.json.
 * This allows MCP tools to modify questions without changing code.
 *
 * Key Components:
 * - App: Root component, loads data, provides context
 * - FormWizard: Manages step navigation
 * - StepRenderer: Renders all questions for a step
 * - QuestionRenderer: Renders individual questions by type
 * - RepeatableSection: Handles add/remove for repeatable groups
 * - ReviewStep: Summary and JSON download
 *
 * Question Types:
 * - text, textarea, select, radio, checkbox
 * - Composite types: address, contact_group, stakeholder_group
 */

// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================
// Enable debug mode via query parameter: ?debug=true
// Or by setting window.PROPEL_DEBUG = true in console

const DEBUG = (() => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('debug') === 'true' || window.PROPEL_DEBUG === true;
    }
    return false;
})();

function debugLog(...args) {
    if (DEBUG) debugLog(...args);
}

// ============================================================================
// REACT CONTEXT
// ============================================================================
// We use React Context to share form definition and reference data across components
// without prop drilling through every level.

const FormContext = React.createContext(null);

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
 */
function evaluateCondition(condition, formData) {
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
function filterConditionalOptions(options, conditionalConfig, formData) {
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
function validateField(value, question) {
    // Check required
    if (question.required) {
        if (value === undefined || value === null || value === '') {
            return `${question.label} is required`;
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
function validateStep(step, formData, compositeTypes) {
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
            if (compositeTypes[question.type]) {
                const compositeValue = formData[question.question_id] || {};
                compositeTypes[question.type].fields.forEach(field => {
                    if (field.required && !compositeValue[field.field_id]) {
                        if (question.required) { // Only if parent is required
                            errors[`${question.question_id}_${field.field_id}`] = `${field.label} is required`;
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

/**
 * Generate the final JSON output matching the expected schema.
 */
function generateOutputJson(formData, formDefinition) {
    debugLog('[Output] Generating JSON from form data:', formData);

    // Transform form data to match the expected output schema
    const output = {
        schema_version: "1.0",
        submitted_at: new Date().toISOString(),
        program: formData.program,

        clinic_information: {
            clinic_name: formData.clinic_name,
            epic_department_id: formData.epic_department_id || null,
            address: formData.clinic_address || null,
            timezone: formData.timezone,
            hours_of_operation: formData.hours_of_operation || null,
            use_hours_in_emails: formData.hours_in_emails || false,
            website_main: formData.website_main || null,
            website_clinic: formData.website_patient_facing || null,
            satellite_locations: (formData.satellite_locations || []).map(loc => ({
                name: loc.location_name,
                epic_department_id: loc.location_epic_id || null,
                address: loc.location_address || null,
                phone: loc.location_phone || null,
                hours_of_operation: loc.location_hours || null
            }))
        },

        contacts: {
            primary: formData.contact_primary || null,
            secondary: formData.contact_secondary || null,
            it: formData.contact_it || null,
            lab: formData.contact_lab || null
        },

        stakeholders: [
            formData.stakeholder_champion,
            formData.stakeholder_executive,
            formData.stakeholder_it_director
        ].filter(s => s && s.name),

        lab_order_configuration: {
            test_provider: formData.lab_partner,
            // Transform select_with_alternates specimen_type to proper output format
            specimen_collection: formData.specimen_type ? {
                default: formData.specimen_type.default || formData.specimen_type,
                additional_options_enabled: formData.specimen_type.offer_alternates || false,
                additional_options: formData.specimen_type.alternates || []
            } : null,
            billing_method: formData.billing_method,
            send_kit_to_patient: formData.send_kit_to_patient,
            indication: formData.indication || null,
            criteria_for_testing: formData.criteria_for_testing || null,
            test_products: (formData.test_products || []).map(test => ({
                test_code: test.test_code,
                test_name: test.test_code, // Will be looked up
                is_default: test.is_default || false,
                modifications: test.test_modifications || null
            }))
        },

        ordering_providers: (formData.ordering_providers || []).map(provider => ({
            name: provider.provider_name,
            title: provider.provider_title || null,
            email: provider.provider_email,
            phone: provider.provider_phone || null,
            npi: provider.provider_npi,
            specialty: provider.provider_specialty || null
        })),

        metadata: {
            form_version: formDefinition.version,
            generated_by: "propel-onboarding-form"
        }
    };

    return output;
}

// ============================================================================
// QUESTION TYPE COMPONENTS
// ============================================================================
// Each component renders a specific input type based on the question definition.

/**
 * TextField - Single line text input (memoized)
 */
const TextField = React.memo(function TextField({ question, value, onChange, error }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={question.placeholder || ''}
                maxLength={question.max_length}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                    error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
            />
            {question.help_text && (
                <p className="mt-1 text-sm text-gray-500">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

/**
 * TextArea - Multi-line text input (memoized)
 */
const TextArea = React.memo(function TextArea({ question, value, onChange, error }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={question.placeholder || ''}
                rows={question.rows || 4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                    error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
            />
            {question.help_text && (
                <p className="mt-1 text-sm text-gray-500">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

/**
 * SelectField - Dropdown select (memoized)
 */
const SelectField = React.memo(function SelectField({ question, value, onChange, options, error }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                    error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
            >
                <option value="">Select...</option>
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.display_name}
                    </option>
                ))}
            </select>
            {question.help_text && (
                <p className="mt-1 text-sm text-gray-500">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

/**
 * RadioGroup - Radio button selection with cards (memoized)
 */
const RadioGroup = React.memo(function RadioGroup({ question, value, onChange, options, error }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={`space-y-2 ${error ? 'p-3 border-2 border-red-500 rounded-lg bg-red-50' : ''}`}>
                {options.map(opt => (
                    <label
                        key={opt.value}
                        className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                            value === opt.value
                                ? 'border-propel-teal bg-propel-light ring-2 ring-propel-teal'
                                : error
                                    ? 'border-red-300 bg-white hover:border-propel-teal hover:bg-gray-50'
                                    : 'border-gray-200 hover:border-propel-teal hover:bg-gray-50'
                        }`}
                    >
                        <input
                            type="radio"
                            name={question.question_id}
                            value={opt.value}
                            checked={value === opt.value}
                            onChange={() => onChange(opt.value)}
                            className="mt-1 h-4 w-4 text-propel-teal focus:ring-propel-teal"
                        />
                        <div className="ml-3">
                            <span className="font-medium text-gray-900">{opt.display_name}</span>
                            {opt.description && (
                                <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
                            )}
                        </div>
                    </label>
                ))}
            </div>
            {question.help_text && (
                <p className="mt-2 text-sm text-gray-500">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

/**
 * CheckboxField - Single checkbox (memoized)
 */
const CheckboxField = React.memo(function CheckboxField({ question, value, onChange, error }) {
    return (
        <div className="mb-4">
            <label className="flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={value || false}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                    {question.label}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                </span>
            </label>
            {question.help_text && (
                <p className="mt-1 text-sm text-gray-500 ml-6">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

/**
 * SelectWithAlternates - Default selection with optional alternate choices (memoized)
 *
 * Renders a default selection dropdown with optional alternate choices.
 * Used when a clinic needs to select a primary option but may want to offer
 * patients/staff additional alternatives.
 *
 * Value structure: { default: string, offer_alternates: boolean, alternates: string[] }
 */
const SelectWithAlternates = React.memo(function SelectWithAlternates({ question, value, onChange, options, error }) {
    const currentValue = value || { default: '', offer_alternates: false, alternates: [] };

    // Handler for default selection change
    const handleDefaultChange = (e) => {
        onChange({
            ...currentValue,
            default: e.target.value,
            // Remove the new default from alternates if it was selected there
            alternates: currentValue.alternates.filter(alt => alt !== e.target.value)
        });
    };

    // Handler for "offer alternates" checkbox
    const handleOfferAlternatesChange = (e) => {
        onChange({
            ...currentValue,
            offer_alternates: e.target.checked,
            // Clear alternates if unchecking
            alternates: e.target.checked ? currentValue.alternates : []
        });
    };

    // Handler for alternate option checkbox toggle
    const handleAlternateToggle = (optionValue) => {
        const newAlternates = currentValue.alternates.includes(optionValue)
            ? currentValue.alternates.filter(v => v !== optionValue)
            : [...currentValue.alternates, optionValue];

        onChange({
            ...currentValue,
            alternates: newAlternates
        });
    };

    // Filter out the default value from alternate options
    const alternateOptions = options.filter(opt => opt.value !== currentValue.default);

    return (
        <div className="mb-4 space-y-3">
            {/* Default Selection Dropdown */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {question.label} (Default)
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                    value={currentValue.default}
                    onChange={handleDefaultChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                        error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                >
                    <option value="">Select...</option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.display_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Offer Alternates Checkbox */}
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id={`${question.question_id}_offer_alternates`}
                    checked={currentValue.offer_alternates}
                    onChange={handleOfferAlternatesChange}
                    className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                />
                <label
                    htmlFor={`${question.question_id}_offer_alternates`}
                    className="ml-2 text-sm text-gray-700"
                >
                    Offer additional options to staff
                </label>
            </div>

            {/* Alternate Options (shown only if offer_alternates is checked) */}
            {currentValue.offer_alternates && alternateOptions.length > 0 && (
                <div className="ml-6 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Select additional options to offer:
                    </p>
                    <div className="space-y-2">
                        {alternateOptions.map(opt => (
                            <div key={opt.value} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`${question.question_id}_alt_${opt.value}`}
                                    checked={currentValue.alternates.includes(opt.value)}
                                    onChange={() => handleAlternateToggle(opt.value)}
                                    className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                                />
                                <label
                                    htmlFor={`${question.question_id}_alt_${opt.value}`}
                                    className="ml-2 text-sm text-gray-700"
                                >
                                    {opt.display_name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Help Text */}
            {question.help_text && (
                <p className="text-sm text-gray-500">{question.help_text}</p>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

/**
 * AddressGroup - Composite address fields
 * Renders street, city, state, zip as a group
 */
function AddressGroup({ question, value, onChange, errors, referenceData }) {
    const addressValue = value || {};

    const handleFieldChange = (fieldId, fieldValue) => {
        onChange({
            ...addressValue,
            [fieldId]: fieldValue
        });
    };

    const stateOptions = referenceData.us_states || [];

    // Check for errors using the correct key pattern: question_id_field_id
    const getFieldError = (fieldId) => errors?.[`${question.question_id}_${fieldId}`];
    const hasAnyError = ['street', 'city', 'state', 'zip'].some(f => getFieldError(f));

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={`space-y-3 p-4 bg-gray-50 rounded-lg border ${hasAnyError ? 'border-red-500' : 'border-gray-200'}`}>
                <div>
                    <input
                        type="text"
                        value={addressValue.street || ''}
                        onChange={(e) => handleFieldChange('street', e.target.value)}
                        placeholder="Street Address"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                            getFieldError('street') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                    />
                </div>
                <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-3">
                        <input
                            type="text"
                            value={addressValue.city || ''}
                            onChange={(e) => handleFieldChange('city', e.target.value)}
                            placeholder="City"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('city') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    <div className="col-span-1">
                        <select
                            value={addressValue.state || ''}
                            onChange={(e) => handleFieldChange('state', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('state') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        >
                            <option value="">State</option>
                            {stateOptions.map(s => (
                                <option key={s.value} value={s.value}>{s.value}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <input
                            type="text"
                            value={addressValue.zip || ''}
                            onChange={(e) => handleFieldChange('zip', e.target.value)}
                            placeholder="ZIP Code"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('zip') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                </div>
            </div>
            {hasAnyError && (
                <p className="mt-1 text-sm text-red-600">Please complete all required address fields</p>
            )}
        </div>
    );
}

/**
 * ContactGroup - Composite contact fields
 * Renders name, title, email, phone, preferred_channel, preferred_time
 */
function ContactGroup({ question, value, onChange, errors, referenceData }) {
    const contactValue = value || {};

    const handleFieldChange = (fieldId, fieldValue) => {
        onChange({
            ...contactValue,
            [fieldId]: fieldValue
        });
    };

    const channelOptions = referenceData.communication_channels || [];
    const timeOptions = referenceData.preferred_times || [];

    // Check for errors using the correct key pattern: question_id_field_id
    const getFieldError = (fieldId) => errors?.[`${question.question_id}_${fieldId}`];
    const hasAnyError = ['name', 'email'].some(f => getFieldError(f));

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-2">{question.help_text}</p>
            )}
            <div className={`space-y-3 p-4 bg-gray-50 rounded-lg border ${hasAnyError ? 'border-red-500' : 'border-gray-200'}`}>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Name {question.required && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={contactValue.name || ''}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="Jane Smith"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('name') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        <input
                            type="text"
                            value={contactValue.title || ''}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="Clinical Director"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Email {question.required && <span className="text-red-500">*</span>}</label>
                        <input
                            type="email"
                            value={contactValue.email || ''}
                            onChange={(e) => handleFieldChange('email', e.target.value)}
                            placeholder="jane.smith@clinic.org"
                            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                getFieldError('email') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={contactValue.phone || ''}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            placeholder="406-555-1234"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Preferred Contact Method</label>
                        <select
                            value={contactValue.preferred_channel || ''}
                            onChange={(e) => handleFieldChange('preferred_channel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        >
                            <option value="">Select...</option>
                            {channelOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.display_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Best Time to Reach</label>
                        <select
                            value={contactValue.preferred_time || ''}
                            onChange={(e) => handleFieldChange('preferred_time', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        >
                            <option value="">Select...</option>
                            {timeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.display_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            {hasAnyError && (
                <p className="mt-1 text-sm text-red-600">Please complete all required contact fields</p>
            )}
        </div>
    );
}

/**
 * StakeholderGroup - Composite stakeholder fields
 * Renders name, title, email
 */
function StakeholderGroup({ question, value, onChange, errors, referenceData }) {
    const stakeholderValue = value || {};

    const handleFieldChange = (fieldId, fieldValue) => {
        onChange({
            ...stakeholderValue,
            [fieldId]: fieldValue
        });
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-2">{question.help_text}</p>
            )}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Name {question.required && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={stakeholderValue.name || ''}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="Dr. Robert Brown"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Title</label>
                        <input
                            type="text"
                            value={stakeholderValue.title || ''}
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                            placeholder="Chief Medical Officer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Email {question.required && <span className="text-red-500">*</span>}</label>
                    <input
                        type="email"
                        value={stakeholderValue.email || ''}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        placeholder="robert.brown@clinic.org"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                    />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// QUESTION RENDERER
// ============================================================================
// This component is the heart of the form-driven architecture.
// It receives a question definition and renders the appropriate component.

function QuestionRenderer({ question, value, onChange, errors, formData }) {
    const { referenceData, testCatalog } = React.useContext(FormContext);

    // Check show_when condition - don't render if condition not met
    if (question.show_when && !evaluateCondition(question.show_when, formData)) {
        debugLog(`[QuestionRenderer] Hiding ${question.question_id} due to show_when condition`);
        return null;
    }

    // Get options for select/radio questions
    let options = [];
    if (question.options_ref) {
        // Special case for test_catalog - build options from test catalog
        if (question.options_ref === 'test_catalog') {
            const program = formData.program;
            const labPartner = formData.lab_partner;
            if (labPartner && testCatalog[labPartner]) {
                options = testCatalog[labPartner].tests.map(test => ({
                    value: test.test_code,
                    display_name: `${test.test_name} (${test.test_code})`
                }));
            }
        } else {
            options = referenceData[question.options_ref] || [];
        }

        // Apply conditional options filtering
        if (question.conditional_options) {
            options = filterConditionalOptions(options, question.conditional_options, formData);
        }
    }

    // Render based on question type
    switch (question.type) {
        case 'text':
            return (
                <TextField
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                />
            );

        case 'textarea':
            return (
                <TextArea
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                />
            );

        case 'select':
            return (
                <SelectField
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
                />
            );

        case 'select_with_alternates':
            return (
                <SelectWithAlternates
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
                />
            );

        case 'radio':
            return (
                <RadioGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
                />
            );

        case 'checkbox':
            return (
                <CheckboxField
                    question={question}
                    value={value}
                    onChange={onChange}
                    error={errors[question.question_id]}
                />
            );

        case 'address':
            return (
                <AddressGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                    referenceData={referenceData}
                />
            );

        case 'contact_group':
            return (
                <ContactGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                    referenceData={referenceData}
                />
            );

        case 'stakeholder_group':
            return (
                <StakeholderGroup
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                    referenceData={referenceData}
                />
            );

        default:
            console.warn(`[QuestionRenderer] Unknown question type: ${question.type}`);
            return (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
                    <p className="text-yellow-700">Unknown question type: {question.type}</p>
                </div>
            );
    }
}

// ============================================================================
// REPEATABLE SECTION
// ============================================================================
// Handles add/remove for repeatable groups (satellite locations, providers, etc.)

function RepeatableSection({ step, items, onChange, errors, formData }) {
    const { repeatable_config, questions } = step;
    const { min_items = 0, max_items = 100, add_button_text, item_title_template } = repeatable_config;

    const handleAddItem = () => {
        if (items.length < max_items) {
            debugLog(`[RepeatableSection] Adding item to ${step.step_id}`);
            onChange([...items, {}]);
        }
    };

    const handleRemoveItem = (index) => {
        if (items.length > min_items) {
            debugLog(`[RepeatableSection] Removing item ${index} from ${step.step_id}`);
            const newItems = items.filter((_, i) => i !== index);
            onChange(newItems);
        }
    };

    const handleItemChange = (index, questionId, value) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            [questionId]: value
        };
        onChange(newItems);
    };

    const getItemTitle = (index) => {
        return item_title_template.replace('{{index}}', index + 1);
    };

    return (
        <div>
            {errors._section && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{errors._section}</p>
                </div>
            )}

            {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p>No items added yet. Click the button below to add one.</p>
                </div>
            )}

            {items.map((item, index) => (
                <div key={index} className="relative p-4 mb-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-700">{getItemTitle(index)}</h4>
                        {items.length > min_items && (
                            <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Remove"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {questions.map(question => (
                        <QuestionRenderer
                            key={question.question_id}
                            question={question}
                            value={item[question.question_id]}
                            onChange={(value) => handleItemChange(index, question.question_id, value)}
                            errors={errors}
                            formData={{ ...formData, ...item }}
                        />
                    ))}
                </div>
            ))}

            {items.length < max_items && (
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-propel-teal hover:text-propel-teal hover:bg-propel-light transition-colors"
                >
                    <span className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {add_button_text}
                    </span>
                </button>
            )}
        </div>
    );
}

// ============================================================================
// STEP RENDERER
// ============================================================================
// Renders all questions for a single step

function StepRenderer({ step, formData, onChange, errors }) {
    // If this is the review step, we don't render it here
    // (ReviewStep is handled separately in FormWizard)
    if (step.is_review_step) {
        return null;
    }

    const handleQuestionChange = (questionId, value) => {
        debugLog(`[StepRenderer] Question ${questionId} changed:`, value);
        onChange({
            ...formData,
            [questionId]: value
        });
    };

    const handleRepeatableChange = (items) => {
        debugLog(`[StepRenderer] Repeatable section ${step.step_id} changed:`, items);
        onChange({
            ...formData,
            [step.step_id]: items
        });
    };

    return (
        <div className="step-content">
            {step.repeatable ? (
                <RepeatableSection
                    step={step}
                    items={formData[step.step_id] || []}
                    onChange={handleRepeatableChange}
                    errors={errors}
                    formData={formData}
                />
            ) : (
                step.questions.map(question => (
                    <QuestionRenderer
                        key={question.question_id}
                        question={question}
                        value={formData[question.question_id]}
                        onChange={(value) => handleQuestionChange(question.question_id, value)}
                        errors={errors}
                        formData={formData}
                    />
                ))
            )}
        </div>
    );
}

// ============================================================================
// REVIEW STEP
// ============================================================================
// Displays a summary of all entered data and allows JSON download

function ReviewStep({ formData, formDefinition, onEdit }) {
    const { referenceData } = React.useContext(FormContext);

    const handleDownload = () => {
        const output = generateOutputJson(formData, formDefinition);
        const json = JSON.stringify(output, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `onboarding-${formData.program || 'unknown'}-${timestamp}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        debugLog('[ReviewStep] Downloaded:', filename);
    };

    const getDisplayValue = (value, optionsRef, questionType) => {
        if (!value) return <span className="text-gray-400">Not provided</span>;

        // Handle select_with_alternates type
        if (questionType === 'select_with_alternates' && typeof value === 'object' && 'default' in value) {
            const options = optionsRef && referenceData[optionsRef] ? referenceData[optionsRef] : [];
            const getOptionName = (val) => {
                const opt = options.find(o => o.value === val);
                return opt ? opt.display_name : val;
            };

            const defaultName = getOptionName(value.default);
            if (!value.offer_alternates || !value.alternates || value.alternates.length === 0) {
                return defaultName || <span className="text-gray-400">Not selected</span>;
            }

            const alternateNames = value.alternates.map(getOptionName).join(', ');
            return (
                <span>
                    <span className="font-medium">Default:</span> {defaultName}
                    <br />
                    <span className="font-medium">Additional:</span> {alternateNames}
                </span>
            );
        }

        if (optionsRef && referenceData[optionsRef]) {
            const option = referenceData[optionsRef].find(o => o.value === value);
            return option ? option.display_name : value;
        }

        if (typeof value === 'object') {
            if (value.street) {
                // Address
                return `${value.street}, ${value.city}, ${value.state} ${value.zip}`;
            }
            if (value.name && value.email) {
                // Contact/Stakeholder
                return `${value.name} (${value.email})`;
            }
            return JSON.stringify(value);
        }

        return value;
    };

    const renderSection = (step, index) => {
        if (step.is_review_step) return null;

        return (
            <div key={step.step_id} className="mb-6 pb-6 border-b border-gray-200 last:border-0">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-propel-navy">{step.title}</h3>
                    <button
                        type="button"
                        onClick={() => onEdit(index)}
                        className="text-sm text-propel-teal hover:text-propel-navy font-medium"
                    >
                        Edit
                    </button>
                </div>

                {step.repeatable ? (
                    <div>
                        {(formData[step.step_id] || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="mb-3 p-3 bg-gray-50 rounded">
                                <p className="font-medium text-gray-700 mb-2">
                                    {step.repeatable_config.item_title_template.replace('{{index}}', itemIndex + 1)}
                                </p>
                                {step.questions.map(q => (
                                    <div key={q.question_id} className="flex py-1">
                                        <span className="w-1/3 text-sm text-gray-500">{q.label}:</span>
                                        <span className="w-2/3 text-sm text-gray-900">
                                            {getDisplayValue(item[q.question_id], q.options_ref, q.type)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {(formData[step.step_id] || []).length === 0 && (
                            <p className="text-gray-400 text-sm">None added</p>
                        )}
                    </div>
                ) : (
                    <div>
                        {step.questions.map(q => {
                            // Check show_when
                            if (q.show_when && !evaluateCondition(q.show_when, formData)) {
                                return null;
                            }
                            return (
                                <div key={q.question_id} className="flex py-1">
                                    <span className="w-1/3 text-sm text-gray-500">{q.label}:</span>
                                    <span className="w-2/3 text-sm text-gray-900">
                                        {getDisplayValue(formData[q.question_id], q.options_ref, q.type)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="step-content">
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 font-medium">
                    Ready to submit! Review your responses below and download the JSON file.
                </p>
            </div>

            {formDefinition.steps.map((step, index) => renderSection(step, index))}

            <div className="mt-8 text-center">
                <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center px-6 py-3 bg-propel-navy text-white font-medium rounded-lg hover:bg-opacity-90 transition-colors"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download JSON
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================
// Shows the current step and overall progress

function ProgressIndicator({ steps, currentStep, onStepClick }) {
    return (
        <div className="mb-8">
            {/* Step counter */}
            <div className="text-center mb-4">
                <span className="text-sm text-gray-500">
                    Step {currentStep + 1} of {steps.length}
                </span>
            </div>

            {/* Progress bar */}
            <div className="relative">
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                    <div
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-propel-teal transition-all duration-300"
                    />
                </div>
            </div>

            {/* Step labels - horizontal on desktop, hidden on mobile */}
            <div className="hidden md:flex justify-between">
                {steps.map((step, index) => (
                    <button
                        key={step.step_id}
                        onClick={() => onStepClick(index)}
                        disabled={index > currentStep}
                        className={`flex flex-col items-center text-center max-w-[100px] ${
                            index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                            index < currentStep
                                ? 'bg-propel-teal text-white'
                                : index === currentStep
                                    ? 'bg-propel-teal text-white ring-4 ring-propel-light'
                                    : 'bg-gray-200 text-gray-500'
                        }`}>
                            {index < currentStep ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                index + 1
                            )}
                        </div>
                        <span className={`text-xs ${
                            index === currentStep ? 'text-propel-teal font-medium' : 'text-gray-500'
                        }`}>
                            {step.title}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// FORM WIZARD
// ============================================================================
// Main component that orchestrates step navigation

function FormWizard({ formDefinition }) {
    const [currentStep, setCurrentStep] = React.useState(0);
    const [formData, setFormData] = React.useState({});
    const [errors, setErrors] = React.useState({});
    const [attemptedNext, setAttemptedNext] = React.useState(false);

    const { steps, composite_types } = formDefinition;
    const currentStepDef = steps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;
    const isReviewStep = currentStepDef.is_review_step;

    debugLog(`[FormWizard] Current step: ${currentStep} (${currentStepDef.title})`);

    const handleNext = () => {
        setAttemptedNext(true);

        // Validate current step
        const validation = validateStep(currentStepDef, formData, composite_types);
        setErrors(validation.errors);

        if (validation.isValid) {
            debugLog('[FormWizard] Step valid, moving to next');
            setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
            setAttemptedNext(false);
            setErrors({});
            window.scrollTo(0, 0);
        } else {
            debugLog('[FormWizard] Step invalid, errors:', validation.errors);
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        setAttemptedNext(false);
        setErrors({});
        window.scrollTo(0, 0);
    };

    const handleStepClick = (index) => {
        // Only allow clicking on completed steps
        if (index < currentStep) {
            setCurrentStep(index);
            setAttemptedNext(false);
            setErrors({});
            window.scrollTo(0, 0);
        }
    };

    const handleFormChange = (newData) => {
        setFormData(newData);

        // Re-validate on change if user has attempted to proceed
        if (attemptedNext) {
            const validation = validateStep(currentStepDef, newData, composite_types);
            setErrors(validation.errors);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-propel-navy mb-2">
                    {formDefinition.title}
                </h1>
                <p className="text-gray-600">{formDefinition.description}</p>
            </div>

            {/* Progress indicator */}
            <ProgressIndicator
                steps={steps}
                currentStep={currentStep}
                onStepClick={handleStepClick}
            />

            {/* Current step card */}
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                {/* Step header */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-propel-navy">
                        {currentStepDef.title}
                    </h2>
                    {currentStepDef.description && (
                        <p className="text-gray-600 mt-1">{currentStepDef.description}</p>
                    )}
                </div>

                {/* Step content */}
                {isReviewStep ? (
                    <ReviewStep
                        formData={formData}
                        formDefinition={formDefinition}
                        onEdit={handleStepClick}
                    />
                ) : (
                    <StepRenderer
                        step={currentStepDef}
                        formData={formData}
                        onChange={handleFormChange}
                        errors={errors}
                    />
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handlePrevious}
                        disabled={isFirstStep}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                            isFirstStep
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        Previous
                    </button>

                    {!isReviewStep && (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-6 py-2 bg-propel-teal text-white rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                        >
                            {isLastStep ? 'Review' : 'Next'}
                        </button>
                    )}
                </div>
            </div>

            {/* Debug panel (development only) */}
            {false && (
                <details className="mt-8 p-4 bg-gray-100 rounded-lg">
                    <summary className="cursor-pointer font-medium text-gray-700">Debug: Form Data</summary>
                    <pre className="mt-2 text-xs overflow-auto">
                        {JSON.stringify(formData, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
// Root component - loads configuration and provides context

function App() {
    const [formDefinition, setFormDefinition] = React.useState(null);
    const [referenceData, setReferenceData] = React.useState(null);
    const [testCatalog, setTestCatalog] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Load all configuration files on mount
    React.useEffect(() => {
        debugLog('[App] Loading configuration files...');

        Promise.all([
            fetch('src/data/form-definition.json').then(r => r.json()),
            fetch('src/data/reference-data.json').then(r => r.json()),
            fetch('src/data/test-catalog.json').then(r => r.json())
        ])
            .then(([formDef, refData, testCat]) => {
                debugLog('[App] Configuration loaded successfully');
                debugLog('[App] Form definition:', formDef.form_id, 'v' + formDef.version);
                debugLog('[App] Reference data keys:', Object.keys(refData));
                debugLog('[App] Test catalog labs:', Object.keys(testCat));

                setFormDefinition(formDef);
                setReferenceData(refData);
                setTestCatalog(testCat);
                setLoading(false);
            })
            .catch(err => {
                console.error('[App] Failed to load configuration:', err);
                setError(`Failed to load configuration: ${err.message}`);
                setLoading(false);
            });
    }, []);

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-propel-teal mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading questionnaire...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-red-50 rounded-lg max-w-md">
                    <div className="text-red-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-red-700 mb-2">Error Loading Form</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    // Render the form wizard with context
    return (
        <FormContext.Provider value={{ referenceData, testCatalog, formDefinition }}>
            <div className="min-h-screen bg-gray-100 py-8">
                <FormWizard formDefinition={formDefinition} />

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-gray-500">
                    <p>Propel Health Onboarding Questionnaire v{formDefinition.version}</p>
                </div>
            </div>
        </FormContext.Provider>
    );
}

// ============================================================================
// MOUNT THE APP
// ============================================================================
// Render the React app to the DOM

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

debugLog('[Propel Onboarding] App initialized');
