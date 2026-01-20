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
 * - select_with_alternates: Default selection with optional alternate choices
 * - gene_selector: Multi-select searchable gene panel (for CustomNext-Cancer)
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
    if (DEBUG) console.log('[DEBUG]', ...args);
}

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================
// LocalStorage key for auto-save functionality

const STORAGE_KEY = 'propel_onboarding_draft';

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================
// Supabase client for database operations:
// - Fetching programs from the database
// - Saving onboarding submissions
// - Auto-saving drafts by email
// - Restoring sessions by email

const SUPABASE_URL = 'https://royctwjkewpnrcqdyhzd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_qKFxQag4D0amycXOM8pQTg_VAVpPcVo';

// Initialize Supabase client (available via CDN as window.supabase)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

debugLog('[Supabase] Client initialized');

// ============================================================================
// SUPABASE HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch active programs from Supabase for the dropdown.
 * Falls back to reference-data.json if Supabase fails.
 *
 * @returns {Promise<Array>} Array of program objects {value, display_name, program_id}
 */
async function fetchProgramsFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('programs')
            .select('program_id, name, prefix')
            .eq('status', 'Active')
            .order('name');

        if (error) throw error;

        // Transform to match reference-data format
        const programs = data.map(p => ({
            value: p.prefix || p.program_id,
            display_name: p.name,
            program_id: p.program_id
        }));

        debugLog('[Supabase] Fetched programs:', programs.length);
        return programs;
    } catch (error) {
        console.error('[Supabase] Error fetching programs:', error);
        return null; // Will trigger fallback to reference-data.json
    }
}

/**
 * Save or update an onboarding submission to Supabase.
 *
 * @param {Object} params - Submission parameters
 * @param {string} params.submitter_email - Email of the submitter
 * @param {string} params.submitter_name - Name of the submitter
 * @param {string} params.program_id - Selected program ID
 * @param {Object} params.form_data - Complete form data as JSON
 * @param {string} params.status - 'draft' or 'submitted'
 * @returns {Promise<Object>} The saved submission record
 */
async function saveOnboardingSubmission({ submitter_email, submitter_name, program_id, form_data, status }) {
    try {
        // Check if a draft already exists for this email
        const { data: existing } = await supabase
            .from('onboarding_submissions')
            .select('submission_id')
            .eq('submitter_email', submitter_email)
            .eq('submission_status', 'draft')
            .single();

        const submissionData = {
            submitter_email,
            submitter_name,
            program_prefix: program_id,
            form_data,
            submission_status: status,
            updated_at: new Date().toISOString()
        };

        if (status === 'submitted') {
            submissionData.submitted_at = new Date().toISOString();
        }

        let result;

        if (existing?.submission_id) {
            // Update existing draft
            const { data, error } = await supabase
                .from('onboarding_submissions')
                .update(submissionData)
                .eq('submission_id', existing.submission_id)
                .select()
                .single();

            if (error) throw error;
            result = data;
            debugLog('[Supabase] Updated submission:', result.submission_id);
        } else {
            // Insert new submission
            const { data, error } = await supabase
                .from('onboarding_submissions')
                .insert(submissionData)
                .select()
                .single();

            if (error) throw error;
            result = data;
            debugLog('[Supabase] Created submission:', result.submission_id);
        }

        return result;
    } catch (error) {
        console.error('[Supabase] Error saving submission:', error);
        throw error;
    }
}

/**
 * Load an existing draft by submitter email.
 *
 * @param {string} email - Submitter's email
 * @returns {Promise<Object|null>} The draft submission or null if not found
 */
async function loadDraftByEmail(email) {
    try {
        const { data, error } = await supabase
            .from('onboarding_submissions')
            .select('*')
            .eq('submitter_email', email)
            .eq('submission_status', 'draft')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        if (data) {
            debugLog('[Supabase] Found draft for email:', email);
            return data;
        }

        return null;
    } catch (error) {
        console.error('[Supabase] Error loading draft:', error);
        return null;
    }
}

// ============================================================================
// REACT CONTEXT
// ============================================================================
// We use React Context to share form definition and reference data across components
// without prop drilling through every level.

const FormContext = React.createContext(null);

// ============================================================================
// ERROR BOUNDARY
// ============================================================================
// React Error Boundaries catch JavaScript errors in child components and display
// a fallback UI instead of crashing the entire application.
// Note: Error boundaries must be class components (React limitation).

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        this.setState({ error, errorInfo });
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
    }

    handleReset = () => {
        // Clear saved form data and reload
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // Ignore localStorage errors
        }
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
                        <div className="text-center">
                            <div className="text-red-500 text-5xl mb-4">⚠️</div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-gray-600 mb-4">
                                We encountered an unexpected error. Your progress has been saved
                                and you can try reloading the page.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full bg-propel-teal text-white py-2 px-4 rounded hover:bg-propel-navy transition-colors"
                                >
                                    Reload Page
                                </button>
                                <button
                                    onClick={this.handleReset}
                                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
                                >
                                    Clear Data & Start Over
                                </button>
                            </div>
                            {DEBUG && this.state.error && (
                                <details className="mt-4 text-left">
                                    <summary className="cursor-pointer text-sm text-gray-500">
                                        Technical Details (Debug Mode)
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

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
        // =====================================================================
        // GENE SELECTOR VALIDATION
        // =====================================================================
        // For gene_selector, value is an array - check that at least one gene is selected
        if (question.type === 'gene_selector') {
            if (!Array.isArray(value) || value.length === 0) {
                return `${question.label}: Please select at least one gene`;
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
            if (compositeTypes[question.type]) {
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

/**
 * Generate the final JSON output matching the expected schema.
 *
 * This function transforms the raw form data into a structured output format
 * suitable for downstream systems. It handles special cases like:
 * - Test panel with conditional gene selection (CustomNext-Cancer)
 * - Contact groupings including genetic counselor
 * - Select-with-alternates specimen type configuration
 *
 * @param {Object} formData - Raw form data from user inputs
 * @param {Object} formDefinition - Form structure definition
 * @param {Object} referenceData - Reference data for lookups (test panels, etc.)
 * @returns {Object} - Structured output JSON
 */
function generateOutputJson(formData, formDefinition, referenceData) {
    debugLog('[Output] Generating JSON from form data:', formData);

    // =========================================================================
    // BUILD TEST PANEL OUTPUT STRUCTURE
    // =========================================================================
    // The test_panel field needs to include test_code and test_name from
    // reference data, plus handle:
    // 1. The RNAInsight checkbox - uses test_code_rna instead of test_code
    // 2. The special case of CustomNext-Cancer which includes selected genes.
    let testPanelOutput = null;

    if (formData.test_panel && referenceData?.test_panels) {
        // Look up the selected test panel in reference data to get test codes and display_name
        const selectedPanel = referenceData.test_panels.find(
            p => p.value === formData.test_panel
        );

        if (selectedPanel) {
            // Check if this is the custom panel (has selected genes)
            const isCustomPanel = selectedPanel.is_custom === true;
            const selectedGenes = isCustomPanel ? (formData.custom_genes || []) : null;

            // Check if RNAInsight is included
            // When true, use the RNA test code and append +RNAInsight® to the name
            const includeRna = formData.include_rna_insight === true;

            // Determine which test code to use based on RNA checkbox
            // Each test panel has both test_code (base) and test_code_rna (with RNA)
            const testCode = includeRna
                ? (selectedPanel.test_code_rna || selectedPanel.test_code)
                : selectedPanel.test_code;

            // Build the test name - append +RNAInsight® when RNA is included
            // Example: "CancerNext-Expanded®" becomes "CancerNext-Expanded® +RNAInsight®"
            const testName = includeRna
                ? `${selectedPanel.display_name} +RNAInsight®`
                : selectedPanel.display_name;

            // Build the test_panel output object
            // For CustomNext-Cancer: includes selected_genes array and gene_count
            // For pre-defined panels: selected_genes is null, gene_count is from reference data
            testPanelOutput = {
                test_name: testName,
                test_code: testCode,
                // Track whether RNA analysis was included for downstream processing
                include_rna_insight: includeRna,
                selected_genes: selectedGenes,
                gene_count: isCustomPanel
                    ? (selectedGenes ? selectedGenes.length : 0)
                    : selectedPanel.gene_count
            };

            debugLog('[Output] Test panel output:', testPanelOutput);
        }
    }

    // =========================================================================
    // BUILD MAIN OUTPUT STRUCTURE
    // =========================================================================
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

        // =====================================================================
        // CONTACTS SECTION
        // =====================================================================
        // Handles the clinic_champion and champion_is_primary logic:
        // - If champion_is_primary is checked, copy clinic_champion data to primary
        // - Otherwise, use the separate contact_primary data
        contacts: {
            // Clinic champion is the decision maker for implementation
            clinic_champion: formData.clinic_champion || null,
            // Track if champion is also the primary contact
            champion_is_primary: formData.champion_is_primary || false,
            // Primary contact: either copied from champion or separate entry
            // If champion_is_primary is true, copy champion data with a flag
            primary: formData.champion_is_primary
                ? {
                    ...formData.clinic_champion,
                    is_also_champion: true
                }
                : (formData.contact_primary || null),
            genetic_counselor: formData.genetic_counselor || null,
            secondary: formData.contact_secondary || null,
            it: formData.contact_it || null,
            lab: formData.contact_lab || null
        },

        stakeholders: [
            formData.stakeholder_champion,
            formData.stakeholder_executive,
            formData.stakeholder_it_director
        ].filter(s => s && s.name),

        // =====================================================================
        // LAB ORDER CONFIGURATION
        // =====================================================================
        // Now includes test_panel with proper structure instead of test_products
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

            // New test_panel structure with test_code, test_name, selected_genes, gene_count
            test_panel: testPanelOutput,

            // FIX 4: Renamed from test_products to additional_test_panels
            // These are optional additional panels beyond the default selected above
            additional_test_panels: (formData.additional_test_panels || []).map(panel => ({
                test_code: panel.test_code,
                // Include selected genes if this is a CustomNext-Cancer panel
                selected_genes: panel.panel_custom_genes || null,
                modifications: panel.test_modifications || null
            }))
        },

        // =====================================================================
        // ORDERING PROVIDERS
        // =====================================================================
        // Each provider now includes an optional office_address composite field.
        // The office_address contains street, city, state, zip from the address
        // composite type added to the ordering_providers repeatable section.
        ordering_providers: (formData.ordering_providers || []).map(provider => ({
            name: provider.provider_name,
            title: provider.provider_title || null,
            email: provider.provider_email,
            phone: provider.provider_phone || null,
            npi: provider.provider_npi,
            specialty: provider.provider_specialty || null,
            // Office address is an address composite type (street, city, state, zip)
            // Returns null if not provided, otherwise returns the full address object
            office_address: provider.provider_office_address || null
        })),

        // =====================================================================
        // HELPDESK CONFIGURATION
        // =====================================================================
        // Clinic-specific helpdesk phone number that can optionally be included
        // in patient communications. The helpdesk_phone_in_emails checkbox
        // controls whether this number appears in automated emails to patients.
        helpdesk: {
            // Direct phone line for patients to call with questions
            phone: formData.helpdesk_phone || null,
            // When true, the helpdesk phone will be included in patient-facing
            // email templates. When false, emails use default contact info.
            include_in_emails: formData.helpdesk_phone_in_emails || false
        },

        // =====================================================================
        // EXTRACT FILTERING CONFIGURATION
        // =====================================================================
        // Controls how patient data is filtered when extracting from the EHR.
        // These settings determine which patients are included in the extract
        // based on their status, procedure type, and ordering provider.
        extract_filtering: {
            // Patient status filter:
            // - "new_only": Only include patients new to the program
            // - "all": Include all patients regardless of status
            patient_status: formData.extract_patient_status || null,

            // Procedure type filter:
            // - "screening_only": Only screening procedures
            // - "screening_diagnostic": Both screening and diagnostic
            // - "all": All procedure types included
            procedure_type: formData.extract_procedure_type || null,

            // When true, enables provider-based filtering using the list below
            filter_by_provider: formData.extract_filter_by_provider || false,

            // Array of provider objects with first_name and last_name.
            // Only used when filter_by_provider is true.
            // This allows clinics to limit extracts to specific ordering providers
            // rather than including all providers at the clinic.
            // Format: [{first_name: "Jane", last_name: "Smith"}, ...]
            provider_list: formData.extract_filter_by_provider
                ? (formData.extract_filter_providers || null)
                : null
        },

        metadata: {
            form_version: formDefinition.version,
            generated_by: "propel-onboarding-form"
        }
    };

    return output;
}

// ============================================================================
// SAVE/RESTORE COMPONENTS
// ============================================================================
// Components for auto-save status and restore prompt

/**
 * RestorePrompt - Modal shown when saved data is found on load
 */
function RestorePrompt({ savedData, onRestore, onDiscard }) {
    const savedDate = savedData?.savedAt ? new Date(savedData.savedAt) : null;
    const formattedDate = savedDate ? savedDate.toLocaleString() : 'Unknown';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-propel-light rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-propel-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-propel-navy mb-2">
                        Resume Previous Session?
                    </h3>
                    <p className="text-gray-600">
                        We found a saved draft from {formattedDate}. Would you like to continue where you left off?
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onDiscard}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Start Fresh
                    </button>
                    <button
                        onClick={onRestore}
                        className="flex-1 px-4 py-2 bg-propel-teal text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                        Resume Draft
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * SaveStatusBar - Shows auto-save status with save/load/clear buttons and help section
 */
function SaveStatusBar({ lastSaved, onSaveDraft, onLoadDraft, onStartOver, supabaseSaveStatus }) {
    const [showHelp, setShowHelp] = React.useState(false);

    const formatTime = (date) => {
        if (!date) return null;
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 sm:mb-6">
            {/* Main status bar - stack on mobile, row on desktop */}
            <div className="px-3 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                {/* Auto-save status - always visible */}
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
                    {/* Local save status */}
                    <div className="flex items-center gap-2">
                        {lastSaved ? (
                            <>
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Auto-saved at {formatTime(lastSaved)}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                <span className="hidden sm:inline">Your progress will be saved automatically</span>
                                <span className="sm:hidden">Auto-save enabled</span>
                            </>
                        )}
                    </div>

                    {/* Cloud save status (Supabase) */}
                    {supabaseSaveStatus && (
                        <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
                            {supabaseSaveStatus === 'saving' && (
                                <>
                                    <svg className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="hidden sm:inline text-blue-600">Syncing to cloud...</span>
                                </>
                            )}
                            {supabaseSaveStatus === 'saved' && (
                                <>
                                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                    </svg>
                                    <span className="hidden sm:inline text-green-600">Cloud saved</span>
                                </>
                            )}
                            {supabaseSaveStatus === 'error' && (
                                <>
                                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="hidden sm:inline text-amber-600">Cloud sync failed</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Action buttons - wrap on mobile, smaller sizing */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={onSaveDraft}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                        title="Download draft as file"
                    >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden xs:inline">Save</span>
                        <span className="hidden sm:inline"> Draft</span>
                    </button>

                    <label className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 cursor-pointer">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="hidden xs:inline">Load</span>
                        <span className="hidden sm:inline"> Draft</span>
                        <input
                            type="file"
                            accept=".json"
                            onChange={onLoadDraft}
                            className="hidden"
                        />
                    </label>

                    <button
                        onClick={onStartOver}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-red-200 rounded-md text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                        title="Clear all data and start over"
                    >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">Start Over</span>
                        <span className="sm:hidden">Reset</span>
                    </button>

                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Help with saving"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Help section (expandable) - full width */}
            {showHelp && (
                <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-t border-gray-200 text-xs sm:text-sm text-gray-600">
                    <h4 className="font-medium text-gray-700 mb-2">Saving Your Progress</h4>
                    <ul className="space-y-1.5">
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Auto-save:</span>
                            <span>Your responses are automatically saved to this browser. Resume later on the same device.</span>
                        </li>
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Save Draft:</span>
                            <span>Downloads a file to transfer to another device or share with a colleague.</span>
                        </li>
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Load Draft:</span>
                            <span>Upload a previously saved draft file to continue editing.</span>
                        </li>
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Start Over:</span>
                            <span>Clears all saved data and starts fresh. This cannot be undone.</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
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
 * GeneSelector - Custom gene selection component for CustomNext-Cancer panel
 *
 * This component provides a sophisticated UI for selecting genes from the 90
 * available CustomNext-Cancer genes. It includes:
 * - Searchable filter input to find specific genes
 * - Checkbox list with all genes (filtered by search)
 * - "Selected Genes" chip display for easy removal
 * - Running count of selected genes
 * - Select All / Clear All bulk actions
 *
 * Value structure: Array of selected gene strings, e.g., ["BRCA1", "BRCA2", "ATM"]
 *
 * Mobile responsive:
 * - Gene list scrolls when too many genes (max-height with overflow)
 * - Chips wrap naturally on smaller screens
 * - Touch-friendly chip removal buttons
 */
const GeneSelector = React.memo(function GeneSelector({ question, value, onChange, options, error }) {
    // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------
    // searchTerm: The current filter text entered by the user
    // Genes are displayed in alphabetical order (already sorted in reference-data.json)
    const [searchTerm, setSearchTerm] = React.useState('');

    // Ensure value is always an array (handles initial undefined state)
    const selectedGenes = value || [];

    // Total number of available genes for the "X of Y" counter display
    const totalGenes = options.length;

    // -------------------------------------------------------------------------
    // FILTERED GENE LIST
    // -------------------------------------------------------------------------
    // Filter genes based on search term (case-insensitive matching)
    // The options array contains gene strings like "BRCA1", "ATM", etc.
    const filteredGenes = React.useMemo(() => {
        if (!searchTerm.trim()) {
            // No search term - return all genes
            return options;
        }
        // Filter genes that contain the search term (case-insensitive)
        const term = searchTerm.toLowerCase();
        return options.filter(gene =>
            gene.toLowerCase().includes(term)
        );
    }, [options, searchTerm]);

    // -------------------------------------------------------------------------
    // EVENT HANDLERS
    // -------------------------------------------------------------------------

    /**
     * Handle toggling a single gene's selection state
     * If currently selected, remove it; if not selected, add it
     */
    const handleGeneToggle = (gene) => {
        if (selectedGenes.includes(gene)) {
            // Remove the gene from selection
            onChange(selectedGenes.filter(g => g !== gene));
        } else {
            // Add the gene to selection (maintain alphabetical order)
            const newSelection = [...selectedGenes, gene].sort();
            onChange(newSelection);
        }
    };

    /**
     * Handle removing a gene chip (called when user clicks X on a chip)
     * This is separate from toggle to make the intent clearer
     */
    const handleRemoveGene = (gene) => {
        onChange(selectedGenes.filter(g => g !== gene));
    };

    /**
     * Select All - Add all currently filtered genes to the selection
     * Note: Only selects genes visible in the current filter view
     */
    const handleSelectAll = () => {
        // Merge current selection with filtered genes, avoiding duplicates
        const combined = [...new Set([...selectedGenes, ...filteredGenes])];
        // Sort alphabetically for consistent ordering
        onChange(combined.sort());
    };

    /**
     * Clear All - Remove all selected genes
     * This clears the entire selection, not just filtered genes
     */
    const handleClearAll = () => {
        onChange([]);
    };

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="mb-4">
            {/* Question Label with required indicator */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Help text explaining the selector */}
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-3">{question.help_text}</p>
            )}

            {/* Main container with border and rounded corners */}
            <div className={`border rounded-lg ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>

                {/* ============================================================
                    SEARCH AND BULK ACTIONS BAR
                    Contains the search input and Select All/Clear All buttons
                    ============================================================ */}
                <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        {/* Search input with magnifying glass icon */}
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search genes..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                            />
                        </div>

                        {/* Bulk action buttons - smaller on mobile */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="px-3 py-2 text-xs sm:text-sm font-medium text-propel-teal border border-propel-teal rounded-md hover:bg-propel-light transition-colors whitespace-nowrap"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Gene count display - shows "X of Y genes selected" */}
                    <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-propel-teal">{selectedGenes.length}</span>
                        {' '}of{' '}
                        <span className="font-medium">{totalGenes}</span>
                        {' '}genes selected
                    </div>
                </div>

                {/* ============================================================
                    SELECTED GENES CHIPS AREA
                    Shows removable chips for all currently selected genes
                    Only visible when at least one gene is selected
                    ============================================================ */}
                {selectedGenes.length > 0 && (
                    <div className="p-3 border-b border-gray-200 bg-blue-50">
                        <p className="text-xs font-medium text-gray-600 mb-2">Selected Genes:</p>
                        {/* Flex wrap container for gene chips */}
                        <div className="flex flex-wrap gap-1.5">
                            {selectedGenes.map(gene => (
                                <span
                                    key={gene}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md"
                                >
                                    {gene}
                                    {/* Remove button (X) - larger touch target for mobile */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveGene(gene)}
                                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full transition-colors"
                                        aria-label={`Remove ${gene}`}
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ============================================================
                    GENE CHECKBOX LIST
                    Scrollable list of all genes with checkboxes
                    Filtered based on search term
                    Max height prevents the list from taking over the page
                    ============================================================ */}
                <div className="max-h-64 sm:max-h-80 overflow-y-auto p-3">
                    {filteredGenes.length === 0 ? (
                        /* No results message when search doesn't match any genes */
                        <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">No genes match "{searchTerm}"</p>
                        </div>
                    ) : (
                        /* Grid of gene checkboxes - 2 columns on mobile, 3 on desktop */
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {filteredGenes.map(gene => {
                                const isSelected = selectedGenes.includes(gene);
                                return (
                                    <label
                                        key={gene}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-propel-light border border-propel-teal'
                                                : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleGeneToggle(gene)}
                                            className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                                        />
                                        {/* Gene name - uses monospace for consistent width */}
                                        <span className={`ml-2 text-sm font-mono ${isSelected ? 'font-medium text-propel-navy' : 'text-gray-700'}`}>
                                            {gene}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Error message display */}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
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
            <div className={`space-y-3 p-3 sm:p-4 bg-gray-50 rounded-lg border ${hasAnyError ? 'border-red-500' : 'border-gray-200'}`}>
                {/* Street - always full width */}
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
                {/* City/State/ZIP - stack on mobile, row on desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <div className="sm:col-span-3">
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
                    <div className="sm:col-span-1">
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
                    <div className="sm:col-span-2">
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
 * FIX 3: Now renders name, title, email, phone, and "is_ordering_provider" checkbox
 * When is_ordering_provider is checked, this stakeholder's info will be used to
 * auto-populate the first ordering provider on Page 8.
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
                {/* Row 1: Name and Title */}
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
                {/* Row 2: Email and Phone - FIX 3: Added phone field */}
                <div className="grid grid-cols-2 gap-3">
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
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={stakeholderValue.phone || ''}
                            onChange={(e) => handleFieldChange('phone', e.target.value)}
                            placeholder="406-555-1234"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                </div>
                {/* FIX 3: "Is Ordering Provider" checkbox - hidden for IT Director */}
                {question.question_id !== 'stakeholder_it_director' && (
                    <div className="pt-2 border-t border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={stakeholderValue.is_ordering_provider || false}
                                onChange={(e) => handleFieldChange('is_ordering_provider', e.target.checked)}
                                className="w-4 h-4 text-propel-teal border-gray-300 rounded focus:ring-propel-teal"
                            />
                            <span className="text-sm text-gray-700">
                                This stakeholder is also an ordering provider
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                            If checked, this person will be added as Ordering Provider #1 on Page 8
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// PROVIDER FILTER LIST
// ============================================================================
// UAT ITEM 5: Repeatable list of providers with first/last name for extract filtering.
// Renders as a mini-repeatable within a non-repeatable step.

function ProviderFilterList({ question, value, onChange, errors }) {
    // Value is an array of {first_name, last_name} objects
    const providers = value || [];

    const handleAddProvider = () => {
        onChange([...providers, { first_name: '', last_name: '' }]);
    };

    const handleRemoveProvider = (index) => {
        if (providers.length > (question.repeatable_config?.min_items || 0)) {
            onChange(providers.filter((_, i) => i !== index));
        }
    };

    const handleProviderChange = (index, field, fieldValue) => {
        const newProviders = [...providers];
        newProviders[index] = {
            ...newProviders[index],
            [field]: fieldValue
        };
        onChange(newProviders);
    };

    const config = question.repeatable_config || {};
    const minItems = config.min_items || 0;
    const maxItems = config.max_items || 20;

    return (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-3">{question.help_text}</p>
            )}

            {/* List of providers */}
            <div className="space-y-3">
                {providers.map((provider, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={provider.first_name || ''}
                                    onChange={(e) => handleProviderChange(index, 'first_name', e.target.value)}
                                    placeholder="Jane"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={provider.last_name || ''}
                                    onChange={(e) => handleProviderChange(index, 'last_name', e.target.value)}
                                    placeholder="Smith"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal text-sm"
                                />
                            </div>
                        </div>
                        {providers.length > minItems && (
                            <button
                                type="button"
                                onClick={() => handleRemoveProvider(index)}
                                className="px-2 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove provider"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}

                {/* Empty state */}
                {providers.length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        No providers added yet. Click below to add one.
                    </div>
                )}

                {/* Add button */}
                {providers.length < maxItems && (
                    <button
                        type="button"
                        onClick={handleAddProvider}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-propel-teal hover:text-propel-teal hover:bg-propel-light transition-colors text-sm"
                    >
                        <span className="flex items-center justify-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {config.add_button_text || 'Add Provider'}
                        </span>
                    </button>
                )}
            </div>

            {/* Validation error */}
            {errors[question.question_id] && (
                <p className="mt-2 text-sm text-red-600">{errors[question.question_id]}</p>
            )}
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

        // =====================================================================
        // PROVIDER FILTER LIST TYPE (UAT ITEM 5)
        // =====================================================================
        // Repeatable list of providers with first/last name for extract filtering.
        // Used within non-repeatable steps to allow adding multiple providers.
        case 'provider_filter_list':
            return (
                <ProviderFilterList
                    question={question}
                    value={value}
                    onChange={onChange}
                    errors={errors}
                />
            );

        // =====================================================================
        // GENE SELECTOR TYPE
        // =====================================================================
        // Used for the CustomNext-Cancer panel gene selection.
        // The options array contains gene name strings (not objects).
        // Value is an array of selected gene strings.
        case 'gene_selector':
            return (
                <GeneSelector
                    question={question}
                    value={value}
                    onChange={onChange}
                    options={options}
                    error={errors[question.question_id]}
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

    // =========================================================================
    // FIX 3: Check if first provider was pre-filled from stakeholder
    // =========================================================================
    // If the first item has _pre_filled_from_stakeholder=true, show a helpful
    // note telling the user that some info was auto-populated and they need
    // to add the NPI and office address.
    const firstItemPreFilled = items.length > 0 && items[0]?._pre_filled_from_stakeholder === true;
    const isOrderingProvidersStep = step.step_id === 'ordering_providers';

    return (
        <div className="space-y-4">
            {errors._section && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{errors._section}</p>
                </div>
            )}

            {/* FIX 3: Show note when first provider was pre-filled from stakeholder */}
            {isOrderingProvidersStep && firstItemPreFilled && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                Provider #1 was pre-filled from your stakeholder entry
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                                Please add their <strong>NPI</strong> and <strong>Office Address</strong> to complete the entry.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {items.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                    <p className="text-sm sm:text-base">No items added yet. Tap the button below to add one.</p>
                </div>
            )}

            {items.map((item, index) => (
                <div key={index} className="relative p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    {/* Header with title and remove button */}
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <h4 className="font-medium text-gray-700 text-sm sm:text-base">{getItemTitle(index)}</h4>
                        {items.length > min_items && (
                            <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="hidden sm:inline">Remove</span>
                            </button>
                        )}
                    </div>

                    {/* Question fields */}
                    {/* ================================================================
                        FIX 6: Transform errors for repeatable sections
                        ================================================================
                        Validation creates error keys with index prefix:
                          "0_provider_phone" or "0_provider_office_address_street"
                        But QuestionRenderer/AddressGroup look for keys without index:
                          "provider_phone" or "provider_office_address_street"

                        Solution: Create item-specific errors object by stripping
                        the index prefix from matching error keys.
                    */}
                    <div className="space-y-3">
                        {questions.map(question => {
                            // Transform errors: filter to this item's errors and strip index prefix
                            const itemErrors = {};
                            const prefix = `${index}_`;
                            Object.keys(errors).forEach(key => {
                                if (key.startsWith(prefix)) {
                                    // Strip the index prefix (e.g., "0_provider_phone" -> "provider_phone")
                                    itemErrors[key.substring(prefix.length)] = errors[key];
                                }
                            });

                            return (
                                <QuestionRenderer
                                    key={question.question_id}
                                    question={question}
                                    value={item[question.question_id]}
                                    onChange={(value) => handleItemChange(index, question.question_id, value)}
                                    errors={itemErrors}
                                    formData={{ ...formData, ...item }}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Add button - full width */}
            {items.length < max_items && (
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-3 sm:py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-propel-teal hover:text-propel-teal hover:bg-propel-light transition-colors"
                >
                    <span className="flex items-center justify-center text-sm sm:text-base">
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
// Displays a summary of all entered data, submits to Supabase, and allows JSON download
//
// Supabase Integration:
//   - Primary action: Submit to Supabase onboarding_submissions table
//   - Secondary action: Download JSON backup for records
//   - Success state: Shows confirmation message after successful submit
//
// Legacy Formspree endpoint (kept for fallback)
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzddpdwg";

function ReviewStep({ formData, formDefinition, onEdit }) {
    const { referenceData } = React.useContext(FormContext);

    // =========================================================================
    // SUBMISSION STATE
    // =========================================================================
    // submitting: true while POST request is in flight
    // submitted: true after successful submission (shows success message)
    // submitError: error message if submission fails
    const [submitting, setSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);
    const [submitError, setSubmitError] = React.useState(null);

    // =========================================================================
    // HONEYPOT SPAM PROTECTION
    // =========================================================================
    // Bots auto-fill all form fields including hidden ones
    // Humans never see or fill this field (it's hidden via CSS)
    // Formspree rejects any submission where _gotcha has a value
    const [honeypot, setHoneypot] = React.useState('');

    // =========================================================================
    // GENERATE OUTPUT DATA
    // =========================================================================
    // Creates the final JSON structure that will be submitted/downloaded
    const getOutputData = () => {
        const output = generateOutputJson(formData, formDefinition, referenceData);
        return {
            submitted_at: new Date().toISOString(),
            clinic_name: formData.clinic_name || 'Unknown',
            clinic_epic_id: formData.clinic_epic_id || '',
            program: formData.program || '',
            ...output
        };
    };

    // =========================================================================
    // SUPABASE SUBMISSION HANDLER
    // =========================================================================
    // Submits the form data to Supabase onboarding_submissions table
    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);

        const outputData = getOutputData();
        debugLog('[ReviewStep] Submitting to Supabase:', outputData.clinic_name);

        // Get submitter info from available contact fields
        // Falls back to generic Propel Health email if no contact email is found
        const submitterEmail = formData.submitter_email
            || formData.clinic_champion?.email
            || formData.contact_primary?.email
            || formData.genetic_counselor?.email
            || 'onboarding@propelhealth.com';  // Fallback for submissions without contact email
        const submitterName = formData.submitter_name
            || formData.clinic_champion?.name
            || formData.contact_primary?.name
            || outputData.clinic_name
            || 'Unknown Clinic';

        try {
            // Save to Supabase
            await saveOnboardingSubmission({
                submitter_email: submitterEmail,
                submitter_name: submitterName,
                program_id: formData.program || '',
                form_data: outputData,
                status: 'submitted'
            });

            setSubmitted(true);
            // Clear saved draft from localStorage after successful submit
            localStorage.removeItem(STORAGE_KEY);
            debugLog('[ReviewStep] Submission successful to Supabase');

            // Also send to Formspree as backup notification (non-blocking)
            fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    _subject: `New Onboarding Submission: ${outputData.clinic_name}`,
                    _gotcha: honeypot,
                    clinic_name: outputData.clinic_name,
                    program: outputData.program,
                    submitted_at: outputData.submitted_at,
                    note: 'Data saved to Supabase. This is a backup notification.'
                })
            }).catch(e => debugLog('[ReviewStep] Formspree backup notification failed (non-critical):', e));

        } catch (error) {
            console.error('[ReviewStep] Submit error:', error);
            setSubmitError('Failed to submit to database. Please try downloading the JSON and emailing it manually.');
        } finally {
            setSubmitting(false);
        }
    };

    // =========================================================================
    // JSON DOWNLOAD HANDLER
    // =========================================================================
    // Downloads the form data as a JSON file (backup/offline submission)
    const handleDownload = () => {
        const output = getOutputData();
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

    // =========================================================================
    // WORD DOCUMENT DOWNLOAD HANDLER (UAT ITEM 7)
    // =========================================================================
    // Downloads the form data as a Word document (.docx) for easier sharing
    const handleWordDownload = async () => {
        const output = getOutputData();

        // Import docx components from global window.docx
        const {
            Document, Packer, Paragraph, TextRun, HeadingLevel,
            Table, TableRow, TableCell, WidthType, BorderStyle
        } = window.docx;

        // Helper to format a value for display
        const formatValue = (val) => {
            if (val === null || val === undefined || val === '') return 'Not provided';
            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
            if (Array.isArray(val)) {
                if (val.length === 0) return 'None';
                // Check if it's an array of objects (like providers)
                if (typeof val[0] === 'object') {
                    return val.map((item, i) => {
                        if (item.first_name && item.last_name) {
                            return `${i + 1}. ${item.first_name} ${item.last_name}`;
                        }
                        return `${i + 1}. ${JSON.stringify(item)}`;
                    }).join('\n');
                }
                return val.join(', ');
            }
            if (typeof val === 'object') {
                // Address object
                if (val.street) {
                    return `${val.street}, ${val.city}, ${val.state} ${val.zip}`;
                }
                // Contact object
                if (val.name && val.email) {
                    const parts = [val.name, val.email];
                    if (val.phone) parts.push(val.phone);
                    return parts.join(' | ');
                }
                // Select with alternates
                if ('default' in val) {
                    let result = val.default || 'Not selected';
                    if (val.alternates && val.alternates.length > 0) {
                        result += ` (Also: ${val.alternates.join(', ')})`;
                    }
                    return result;
                }
                return JSON.stringify(val, null, 2);
            }
            return String(val);
        };

        // Create document sections
        const docChildren = [];

        // Title
        docChildren.push(
            new Paragraph({
                text: 'Providence Health Onboarding Questionnaire',
                heading: HeadingLevel.TITLE,
                spacing: { after: 400 }
            })
        );

        // Subtitle with clinic info
        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Clinic: ', bold: true }),
                    new TextRun(output.clinic_name || 'Unknown'),
                    new TextRun({ text: '  |  Program: ', bold: true }),
                    new TextRun(output.program || 'Unknown'),
                ],
                spacing: { after: 200 }
            })
        );

        docChildren.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Submitted: ', bold: true }),
                    new TextRun(new Date(output.submitted_at).toLocaleString()),
                ],
                spacing: { after: 400 }
            })
        );

        // Process each step from form definition
        formDefinition.steps.forEach(step => {
            if (step.is_review_step) return;

            // Section heading
            docChildren.push(
                new Paragraph({
                    text: step.title,
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                })
            );

            if (step.repeatable) {
                // Repeatable section (providers, locations, etc.)
                const items = formData[step.step_id] || [];
                if (items.length === 0) {
                    docChildren.push(
                        new Paragraph({
                            text: 'None added',
                            spacing: { after: 200 }
                        })
                    );
                } else {
                    items.forEach((item, idx) => {
                        // Item header
                        const itemTitle = step.repeatable_config.item_title_template
                            .replace('{{index}}', idx + 1);
                        docChildren.push(
                            new Paragraph({
                                text: itemTitle,
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 200, after: 100 }
                            })
                        );

                        // Item fields as table
                        const rows = step.questions.map(q => {
                            return new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: q.label, bold: true })] })],
                                        width: { size: 35, type: WidthType.PERCENTAGE }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph(formatValue(item[q.question_id]))],
                                        width: { size: 65, type: WidthType.PERCENTAGE }
                                    })
                                ]
                            });
                        });

                        docChildren.push(
                            new Table({
                                rows: rows,
                                width: { size: 100, type: WidthType.PERCENTAGE }
                            })
                        );
                    });
                }
            } else {
                // Regular section - create table of fields
                const rows = [];
                step.questions.forEach(q => {
                    // Check show_when conditions
                    if (q.show_when && !evaluateCondition(q.show_when, formData)) {
                        return;
                    }

                    rows.push(new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ children: [new TextRun({ text: q.label, bold: true })] })],
                                width: { size: 35, type: WidthType.PERCENTAGE }
                            }),
                            new TableCell({
                                children: [new Paragraph(formatValue(formData[q.question_id]))],
                                width: { size: 65, type: WidthType.PERCENTAGE }
                            })
                        ]
                    }));
                });

                if (rows.length > 0) {
                    docChildren.push(
                        new Table({
                            rows: rows,
                            width: { size: 100, type: WidthType.PERCENTAGE }
                        })
                    );
                }
            }
        });

        // Create document
        const doc = new Document({
            sections: [{
                children: docChildren
            }]
        });

        // Generate and download
        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `onboarding-${formData.program || 'unknown'}-${timestamp}.docx`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        debugLog('[ReviewStep] Downloaded Word doc:', filename);
    };

    const getDisplayValue = (value, optionsRef, questionType) => {
        if (!value) return <span className="text-gray-400">Not provided</span>;

        // =====================================================================
        // GENE SELECTOR TYPE
        // =====================================================================
        // gene_selector returns an array of gene names, display as comma-separated
        // with a count indicator for better readability
        if (questionType === 'gene_selector' && Array.isArray(value)) {
            if (value.length === 0) {
                return <span className="text-gray-400">No genes selected</span>;
            }
            // Show gene count and first few genes with ellipsis if too many
            const maxDisplay = 10;
            const displayGenes = value.slice(0, maxDisplay).join(', ');
            const remaining = value.length - maxDisplay;
            return (
                <span>
                    <span className="font-medium">{value.length} genes:</span>{' '}
                    {displayGenes}
                    {remaining > 0 && <span className="text-gray-500"> ...and {remaining} more</span>}
                </span>
            );
        }

        // =====================================================================
        // SELECT WITH ALTERNATES TYPE
        // =====================================================================
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

        // =====================================================================
        // STANDARD SELECT/RADIO WITH OPTIONS_REF
        // =====================================================================
        if (optionsRef && referenceData[optionsRef]) {
            const option = referenceData[optionsRef].find(o => o.value === value);
            return option ? option.display_name : value;
        }

        // =====================================================================
        // COMPOSITE OBJECT TYPES
        // =====================================================================
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
            <div key={step.step_id} className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-200 last:border-0">
                <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <h3 className="text-base sm:text-lg font-semibold text-propel-navy">{step.title}</h3>
                    <button
                        type="button"
                        onClick={() => onEdit(index)}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-propel-teal hover:text-propel-navy font-medium border border-propel-teal rounded hover:bg-propel-light transition-colors"
                    >
                        Edit
                    </button>
                </div>

                {step.repeatable ? (
                    <div className="space-y-2 sm:space-y-3">
                        {(formData[step.step_id] || []).map((item, itemIndex) => (
                            <div key={itemIndex} className="p-2 sm:p-3 bg-gray-50 rounded">
                                <p className="font-medium text-gray-700 mb-2 text-sm sm:text-base">
                                    {step.repeatable_config.item_title_template.replace('{{index}}', itemIndex + 1)}
                                </p>
                                {step.questions.map(q => (
                                    <div key={q.question_id} className="flex flex-col sm:flex-row sm:gap-x-6 py-1">
                                        <span className="sm:w-1/3 sm:flex-shrink-0 text-xs sm:text-sm text-gray-500">{q.label}:</span>
                                        <span className="sm:w-2/3 text-xs sm:text-sm text-gray-900 mt-0.5 sm:mt-0">
                                            {getDisplayValue(item[q.question_id], q.options_ref, q.type)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ))}
                        {(formData[step.step_id] || []).length === 0 && (
                            <p className="text-gray-400 text-xs sm:text-sm">None added</p>
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
                                <div key={q.question_id} className="flex flex-col sm:flex-row sm:gap-x-6 py-1">
                                    <span className="sm:w-1/3 sm:flex-shrink-0 text-xs sm:text-sm text-gray-500">{q.label}:</span>
                                    <span className="sm:w-2/3 text-xs sm:text-sm text-gray-900 mt-0.5 sm:mt-0">
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

    // =========================================================================
    // RENDER
    // =========================================================================
    return (
        <div className="step-content">
            {/* ================================================================
                HEADER MESSAGE - Changes based on submission state
                ================================================================ */}
            {!submitted && (
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-medium text-sm sm:text-base">
                        Ready to submit! Review your responses below, then submit to Providence Health.
                    </p>
                </div>
            )}

            {/* ================================================================
                FORM DATA REVIEW SECTIONS
                ================================================================ */}
            {formDefinition.steps.map((step, index) => renderSection(step, index))}

            {/* ================================================================
                SUBMISSION UI
                - Before submit: Show submit button + download backup
                - After submit: Show success message + download option
                ================================================================ */}
            {!submitted ? (
                <div className="mt-6 sm:mt-8 space-y-4">
                    {/* ============================================================
                        HONEYPOT SPAM PROTECTION
                        ============================================================
                        This hidden field catches bots that auto-fill all inputs.
                        - Hidden via inline style (display: none)
                        - tabIndex=-1 prevents keyboard navigation to it
                        - autoComplete=off prevents browser from filling it
                        - Humans never see it, but bots fill it automatically
                        - Formspree rejects submissions where _gotcha has a value
                    */}
                    <input
                        type="text"
                        name="_gotcha"
                        style={{ display: 'none' }}
                        tabIndex="-1"
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                    />

                    {/* Primary action: Submit to Propel Health */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-3 px-4 bg-propel-teal text-white rounded-lg font-medium
                                   hover:bg-propel-teal-dark disabled:bg-gray-400 disabled:cursor-not-allowed
                                   transition-colors"
                    >
                        {submitting ? (
                            <span className="flex items-center justify-center gap-2">
                                {/* Spinner animation */}
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4" fill="none"/>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                                Submitting...
                            </span>
                        ) : (
                            'Submit to Propel Health'
                        )}
                    </button>

                    {/* Secondary actions: Download options */}
                    <div className="flex gap-2">
                        {/* Download Word document (UAT ITEM 7) */}
                        <button
                            type="button"
                            onClick={handleWordDownload}
                            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg
                                       hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download Word
                            </span>
                        </button>

                        {/* Download JSON backup */}
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg
                                       hover:bg-gray-50 transition-colors"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download JSON
                            </span>
                        </button>
                    </div>

                    {/* Error message if submission failed */}
                    {submitError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {submitError}
                        </div>
                    )}
                </div>
            ) : (
                /* SUCCESS STATE - Shown after successful submission */
                <div className="mt-6 sm:mt-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                    {/* Checkmark icon */}
                    <div className="text-green-600 text-4xl mb-3">✓</div>

                    <h3 className="text-xl font-semibold text-green-800 mb-2">
                        Submission Received!
                    </h3>

                    <p className="text-green-700">
                        Thank you! The Providence Health team will review your information
                        and contact you within 2 business days.
                    </p>

                    <p className="text-sm text-green-600 mt-4">
                        A copy of your submission has been sent to our team.
                    </p>

                    {/* Still allow downloads after successful submit */}
                    <div className="mt-4 flex justify-center gap-4">
                        <button
                            type="button"
                            onClick={handleWordDownload}
                            className="text-sm text-propel-teal hover:underline"
                        >
                            Download Word
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="text-sm text-propel-teal hover:underline"
                        >
                            Download JSON
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PROGRESS INDICATOR
// ============================================================================
// Shows the current step and overall progress
//
// FIX: Added proper text spacing and wrapping for step labels
// - Uses abbreviated titles on smaller screens
// - Proper word-break and whitespace handling
// - Adequate spacing between step items

function ProgressIndicator({ steps, currentStep, onStepClick }) {
    const currentStepTitle = steps[currentStep]?.title || '';

    // =========================================================================
    // STEP ABBREVIATIONS
    // =========================================================================
    // Shorter versions of step titles for the progress indicator
    // Prevents text from running together (e.g., "KeyStakeholders")
    const stepAbbreviations = {
        "Program Selection": "Program",
        "Clinic Information": "Clinic",
        "Satellite Locations": "Locations",
        "Contacts": "Contacts",
        "Key Stakeholders": "Stake-holders",
        "Lab Configuration": "Lab Config",
        "Additional Test Panels": "Add'l Tests",
        "Ordering Providers": "Providers",
        "Extract Filtering": "Filtering",
        "Review & Download": "Review"
    };

    // Get abbreviated title for compact display
    const getShortTitle = (title) => stepAbbreviations[title] || title;

    return (
        <div className="mb-4 sm:mb-8">
            {/* Mobile: Simple text indicator with current step title */}
            <div className="sm:hidden text-center py-3 px-4 bg-gray-50 rounded-lg mb-3">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Step {currentStep + 1} of {steps.length}
                </span>
                <h2 className="text-base font-semibold text-propel-navy mt-1">{currentStepTitle}</h2>
            </div>

            {/* Desktop: Step counter above progress bar */}
            <div className="hidden sm:block text-center mb-4">
                <span className="text-sm text-gray-500">
                    Step {currentStep + 1} of {steps.length}
                </span>
            </div>

            {/* Progress bar - visible on all sizes */}
            <div className="relative">
                <div className="overflow-hidden h-2 mb-2 sm:mb-4 text-xs flex rounded bg-gray-200">
                    <div
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-propel-teal transition-all duration-300"
                    />
                </div>
            </div>

            {/* ================================================================
                STEP LABELS - Desktop only (md+)
                ================================================================
                FIX: Improved text spacing and wrapping:
                - flex-1 and min-w-0 allow items to shrink properly
                - gap-1 adds spacing between items
                - break-words and whitespace-normal enable word wrapping
                - leading-tight reduces line height for multi-line labels
                - Uses abbreviated titles to prevent overflow
            */}
            <div className="hidden md:flex justify-between items-start gap-1">
                {steps.map((step, index) => (
                    <button
                        key={step.step_id}
                        onClick={() => onStepClick(index)}
                        disabled={index > currentStep}
                        className={`flex flex-col items-center text-center flex-1 min-w-0 px-1 ${
                            index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                    >
                        {/* Step circle with number or checkmark */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 flex-shrink-0 ${
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

                        {/* Step label - with proper text handling */}
                        <span className={`text-xs leading-tight whitespace-normal break-words w-full ${
                            index === currentStep ? 'text-propel-teal font-medium' : 'text-gray-500'
                        }`}>
                            {getShortTitle(step.title)}
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

    // Save/restore state
    const [lastSaved, setLastSaved] = React.useState(null);
    const [showRestorePrompt, setShowRestorePrompt] = React.useState(false);
    const [pendingSavedData, setPendingSavedData] = React.useState(null);

    // =========================================================================
    // SUPABASE DRAFT MANAGEMENT
    // =========================================================================
    // Track submitter email for auto-save and session restore
    const [supabaseDraftId, setSupabaseDraftId] = React.useState(null);
    const [supabaseSaveStatus, setSupabaseSaveStatus] = React.useState(null); // 'saving', 'saved', 'error'
    const [showEmailRestoreModal, setShowEmailRestoreModal] = React.useState(false);
    const [restoreEmail, setRestoreEmail] = React.useState('');

    // =========================================================================
    // RETURN TO SUMMARY FLAG
    // =========================================================================
    // When user clicks Edit from the Summary page, this flag is set to true.
    // After completing the edited step, navigation returns directly to Summary
    // instead of advancing to the next sequential step.
    const [returnToSummary, setReturnToSummary] = React.useState(false);

    const { steps, composite_types } = formDefinition;
    const currentStepDef = steps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === steps.length - 1;
    const isReviewStep = currentStepDef.is_review_step;

    debugLog(`[FormWizard] Current step: ${currentStep} (${currentStepDef.title})`);

    // =========================================================================
    // FIX 4: TAB VISIBILITY STATE
    // =========================================================================
    // Track whether the tab is visible. When hidden, we pause expensive operations
    // like auto-save to prevent the page from freezing when the user returns.
    // This is a common cause of "page freeze" issues after periods of inactivity.
    const [isTabVisible, setIsTabVisible] = React.useState(!document.hidden);

    React.useEffect(() => {
        const handleVisibilityChange = () => {
            const visible = !document.hidden;
            setIsTabVisible(visible);
            debugLog(`[FIX 4] Tab visibility changed: ${visible ? 'visible' : 'hidden'}`);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // =========================================================================
    // FIX 4: ACTIVITY TRACKING
    // =========================================================================
    // Track user activity to detect potential freezes. If no activity is detected
    // for an extended period while the form is open, we log a warning.
    // This helps diagnose issues where the form becomes unresponsive.
    const [lastActivity, setLastActivity] = React.useState(Date.now());

    React.useEffect(() => {
        const handleActivity = () => setLastActivity(Date.now());

        // Track user interactions
        window.addEventListener('mousemove', handleActivity, { passive: true });
        window.addEventListener('keydown', handleActivity, { passive: true });
        window.addEventListener('touchstart', handleActivity, { passive: true });
        window.addEventListener('scroll', handleActivity, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, []);

    // Warn if form appears frozen (no activity for 10+ minutes while tab is visible)
    React.useEffect(() => {
        // Only check when tab is visible
        if (!isTabVisible) return;

        const checkInterval = setInterval(() => {
            const inactiveMinutes = (Date.now() - lastActivity) / 1000 / 60;
            if (inactiveMinutes > 10) {
                console.warn(`[FIX 4] User inactive for ${Math.round(inactiveMinutes)} minutes`);
            }
        }, 60000); // Check every minute

        return () => clearInterval(checkInterval);
    }, [lastActivity, isTabVisible]);

    // Check for saved data on mount
    React.useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.formData && Object.keys(parsed.formData).length > 0) {
                    setPendingSavedData(parsed);
                    setShowRestorePrompt(true);
                }
            }
        } catch (e) {
            console.error('[FormWizard] Error loading saved data:', e);
        }
    }, []);

    // =========================================================================
    // FIX 4: DEBOUNCED AUTO-SAVE
    // =========================================================================
    // The previous implementation saved on EVERY change to formData, which could
    // cause performance issues and potential freezes:
    // 1. Rapid state changes trigger rapid localStorage writes
    // 2. localStorage is synchronous and blocks the main thread
    // 3. Large formData objects take longer to serialize
    //
    // Solution: Debounce the save operation - wait 2 seconds after the last
    // change before saving. This batches rapid changes into a single save.
    // Also:
    // - Don't save when tab is hidden (no point, and could cause issues)
    // - Handle QuotaExceededError gracefully
    // - Clear old data if quota is exceeded
    React.useEffect(() => {
        // Don't save if form is empty or tab is hidden
        if (Object.keys(formData).length === 0) return;
        if (!isTabVisible) {
            debugLog('[FIX 4] Tab hidden, skipping auto-save');
            return;
        }

        // Debounce: Save 2 seconds after last change
        const timeoutId = setTimeout(() => {
            try {
                const saveData = {
                    formData,
                    currentStep,
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
                setLastSaved(saveData.savedAt);
                debugLog('[FormWizard] Auto-saved:', saveData.savedAt);
            } catch (e) {
                // Handle QuotaExceededError
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    console.warn('[FIX 4] LocalStorage quota exceeded, attempting cleanup...');
                    try {
                        // Try to clear old draft and save again
                        localStorage.removeItem(STORAGE_KEY);
                        const saveData = {
                            formData,
                            currentStep,
                            savedAt: new Date().toISOString()
                        };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
                        setLastSaved(saveData.savedAt);
                        debugLog('[FormWizard] Auto-saved after cleanup');
                    } catch (retryError) {
                        console.error('[FIX 4] Auto-save failed even after cleanup:', retryError);
                    }
                } else {
                    console.error('[FormWizard] Error auto-saving:', e);
                }
            }
        }, 2000); // 2 second debounce

        // Cleanup: Cancel pending save if formData changes again
        return () => clearTimeout(timeoutId);
    }, [formData, currentStep, isTabVisible]);

    // =========================================================================
    // SUPABASE AUTO-SAVE (Draft to database)
    // =========================================================================
    // Also save to Supabase when user has provided an email address
    // This enables cross-device session restore
    React.useEffect(() => {
        // Get submitter email from form data (clinic champion, primary contact, or genetic counselor)
        const submitterEmail = formData.submitter_email
            || formData.clinic_champion?.email
            || formData.contact_primary?.email
            || formData.genetic_counselor?.email;

        // Don't save if no email or form is empty or tab is hidden
        if (!submitterEmail || Object.keys(formData).length === 0 || !isTabVisible) {
            return;
        }

        // Debounce: Save 2 seconds after last change
        const timeoutId = setTimeout(async () => {
            setSupabaseSaveStatus('saving');

            try {
                const submitterName = formData.submitter_name
                    || formData.clinic_champion?.name
                    || formData.contact_primary?.name
                    || '';

                const result = await saveOnboardingSubmission({
                    submitter_email: submitterEmail,
                    submitter_name: submitterName,
                    program_id: formData.program || '',
                    form_data: { formData, currentStep },
                    status: 'draft'
                });

                setSupabaseDraftId(result.submission_id);
                setSupabaseSaveStatus('saved');
                debugLog('[Supabase] Draft auto-saved:', result.submission_id);

                // Clear status after 2 seconds
                setTimeout(() => setSupabaseSaveStatus(null), 2000);
            } catch (error) {
                console.error('[Supabase] Draft auto-save failed:', error);
                setSupabaseSaveStatus('error');
                // Clear error status after 3 seconds
                setTimeout(() => setSupabaseSaveStatus(null), 3000);
            }
        }, 2000); // 2 second debounce

        return () => clearTimeout(timeoutId);
    }, [formData, currentStep, isTabVisible]);

    // =========================================================================
    // EMAIL-BASED SESSION RESTORE
    // =========================================================================
    // Check for existing draft when submitter_email changes
    const checkForExistingDraft = React.useCallback(async (email) => {
        if (!email || supabaseDraftId) return; // Don't check if we already have a draft

        const draft = await loadDraftByEmail(email);
        if (draft && draft.form_data) {
            setPendingSavedData({
                formData: draft.form_data.formData || draft.form_data,
                currentStep: draft.form_data.currentStep || 0,
                savedAt: draft.updated_at,
                source: 'supabase'
            });
            setShowRestorePrompt(true);
            debugLog('[Supabase] Found existing draft for:', email);
        }
    }, [supabaseDraftId]);

    // Watch for email field changes to check for existing draft
    React.useEffect(() => {
        const email = formData.submitter_email
            || formData.clinic_champion?.email
            || formData.contact_primary?.email
            || formData.genetic_counselor?.email;
        if (email && !supabaseDraftId && !showRestorePrompt) {
            // Debounce the check
            const timeoutId = setTimeout(() => {
                checkForExistingDraft(email);
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [formData.submitter_email, formData.clinic_champion?.email, formData.contact_primary?.email, formData.genetic_counselor?.email, checkForExistingDraft, supabaseDraftId, showRestorePrompt]);

    // Restore handlers
    const handleRestore = () => {
        if (pendingSavedData) {
            setFormData(pendingSavedData.formData || {});
            setCurrentStep(pendingSavedData.currentStep || 0);
            setLastSaved(pendingSavedData.savedAt);

            // If restored from Supabase, set the draft ID to enable future saves
            if (pendingSavedData.source === 'supabase' && pendingSavedData.submission_id) {
                setSupabaseDraftId(pendingSavedData.submission_id);
            }
        }
        setShowRestorePrompt(false);
        setPendingSavedData(null);
    };

    const handleDiscard = () => {
        localStorage.removeItem(STORAGE_KEY);
        setShowRestorePrompt(false);
        setPendingSavedData(null);
    };

    // Save draft to file
    const handleSaveDraft = () => {
        const saveData = {
            formData,
            currentStep,
            savedAt: new Date().toISOString(),
            version: formDefinition.version
        };
        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `propel-draft-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Load draft from file
    const handleLoadDraft = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.formData) {
                    setFormData(data.formData);
                    setCurrentStep(data.currentStep || 0);
                    setLastSaved(new Date().toISOString());
                    setAttemptedNext(false);
                    setErrors({});
                }
            } catch (err) {
                alert('Invalid draft file. Please select a valid JSON file.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    // Start over - clear all data
    const handleStartOver = () => {
        if (confirm('Are you sure you want to start over? All your progress will be lost.')) {
            localStorage.removeItem(STORAGE_KEY);
            setFormData({});
            setCurrentStep(0);
            setLastSaved(null);
            setAttemptedNext(false);
            setErrors({});
        }
    };

    const handleNext = () => {
        setAttemptedNext(true);

        // Validate current step
        const validation = validateStep(currentStepDef, formData, composite_types);
        setErrors(validation.errors);

        if (validation.isValid) {
            debugLog('[FormWizard] Step valid, moving to next');

            // =================================================================
            // RETURN TO SUMMARY AFTER EDIT
            // =================================================================
            // If user clicked Edit from Summary page, return directly to Summary
            // (last step) instead of advancing to the next sequential step.
            if (returnToSummary) {
                debugLog('[FormWizard] Returning to Summary after edit');
                setReturnToSummary(false); // Clear the flag
                setCurrentStep(steps.length - 1); // Go to last step (Summary)
                setAttemptedNext(false);
                setErrors({});
                window.scrollTo(0, 0);
                return; // Exit early - skip normal next step logic
            }

            const nextStep = Math.min(currentStep + 1, steps.length - 1);
            const nextStepDef = steps[nextStep];

            // =====================================================================
            // FIX 3: AUTO-POPULATE ORDERING PROVIDER FROM STAKEHOLDER
            // =====================================================================
            // When navigating TO the ordering_providers step (Page 8), check if any
            // stakeholder was marked as "is_ordering_provider". If so, and the first
            // provider entry is empty or was previously auto-populated, fill it with
            // the stakeholder's info.
            //
            // We only auto-populate if:
            // 1. We're moving to the ordering_providers step
            // 2. A stakeholder has is_ordering_provider checked
            // 3. The first provider entry is empty OR was previously auto-filled
            //    (prevents overwriting user's manual entries)
            if (nextStepDef.step_id === 'ordering_providers') {
                const stakeholderProvider = getStakeholderOrderingProvider(formData);

                if (stakeholderProvider) {
                    const existingProviders = formData.ordering_providers || [];
                    const firstProvider = existingProviders[0];

                    // Check if we should auto-populate:
                    // - First provider doesn't exist, OR
                    // - First provider has no name (empty), OR
                    // - First provider was previously auto-populated from a stakeholder
                    const shouldAutoPopulate = (
                        !firstProvider ||
                        !firstProvider.provider_name ||
                        firstProvider._pre_filled_from_stakeholder === true
                    );

                    if (shouldAutoPopulate) {
                        debugLog('[FIX 3] Auto-populating first provider from stakeholder');

                        // Create new providers array with stakeholder as first entry
                        // Keep any other existing providers (indices 1+)
                        const newProviders = [
                            stakeholderProvider,
                            ...existingProviders.slice(1)
                        ];

                        // Update form data with the auto-populated provider
                        setFormData(prev => ({
                            ...prev,
                            ordering_providers: newProviders
                        }));
                    } else {
                        debugLog('[FIX 3] First provider already has data, skipping auto-populate');
                    }
                }
            }

            setCurrentStep(nextStep);
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

    // =========================================================================
    // EDIT FROM SUMMARY - RETURN TO SUMMARY AFTER CHANGES
    // =========================================================================
    // When user clicks Edit on the Summary page, we navigate to that step and
    // set a flag so that clicking Next returns them directly to Summary instead
    // of advancing through all subsequent steps.
    const handleEditFromSummary = (index) => {
        setReturnToSummary(true);
        setCurrentStep(index);
        setAttemptedNext(false);
        setErrors({});
        window.scrollTo(0, 0);
    };

    // =========================================================================
    // FIX 3: STAKEHOLDER TO ORDERING PROVIDER AUTO-POPULATE
    // =========================================================================
    // This helper finds the first stakeholder marked as "is_ordering_provider"
    // and returns their info formatted for the ordering_providers section.
    // Used when navigating to Page 8 (Ordering Providers) to pre-fill the first entry.
    //
    // We check all three stakeholder fields: stakeholder_champion, stakeholder_executive,
    // and stakeholder_it_director. The first one with is_ordering_provider=true is used.
    const getStakeholderOrderingProvider = (data) => {
        // List of stakeholder question IDs to check (in priority order)
        const stakeholderFields = [
            'stakeholder_champion',
            'stakeholder_executive',
            'stakeholder_it_director'
        ];

        // Find the first stakeholder with is_ordering_provider checked
        for (const fieldId of stakeholderFields) {
            const stakeholder = data[fieldId];
            if (stakeholder && stakeholder.is_ordering_provider === true && stakeholder.name) {
                debugLog(`[FIX 3] Found stakeholder ordering provider: ${stakeholder.name}`);
                return {
                    provider_name: stakeholder.name,
                    provider_title: stakeholder.title || '',
                    provider_email: stakeholder.email || '',
                    provider_phone: stakeholder.phone || '',
                    provider_npi: '',           // User must fill this in
                    provider_office_address: {}, // User must fill this in
                    provider_specialty: '',      // Optional
                    _pre_filled_from_stakeholder: true,  // Flag to show note on Page 8
                    _stakeholder_source: fieldId         // Track which stakeholder this came from
                };
            }
        }
        return null;
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
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
            {/* Restore prompt modal */}
            {showRestorePrompt && (
                <RestorePrompt
                    savedData={pendingSavedData}
                    onRestore={handleRestore}
                    onDiscard={handleDiscard}
                />
            )}

            {/* Header - Providence branded with logo */}
            <div className="bg-propel-navy rounded-lg p-4 sm:p-6 mb-4 sm:mb-8">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                    {/* Providence Logo */}
                    <img
                        src="https://cdn.providence.org/asset/GtV28qX0x6P0DfEBf7sJ7w10/project/psjh/providence/socal/images/logos/providence-logo-svg/svg"
                        alt="Providence Health"
                        className="h-8 sm:h-10"
                    />
                    <div className="text-center sm:text-left">
                        <h1 className="text-lg sm:text-2xl font-bold text-white mb-0 sm:mb-1">
                            {formDefinition.title}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-300 hidden sm:block">{formDefinition.description}</p>
                    </div>
                </div>
            </div>

            {/* Save status bar */}
            <SaveStatusBar
                lastSaved={lastSaved}
                onSaveDraft={handleSaveDraft}
                onLoadDraft={handleLoadDraft}
                onStartOver={handleStartOver}
                supabaseSaveStatus={supabaseSaveStatus}
            />

            {/* Progress indicator */}
            <ProgressIndicator
                steps={steps}
                currentStep={currentStep}
                onStepClick={handleStepClick}
            />

            {/* Current step card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8 mobile-content-padding">
                {/* Step header - hidden on mobile since ProgressIndicator shows it */}
                <div className="hidden sm:block mb-6">
                    <h2 className="text-xl font-semibold text-propel-navy">
                        {currentStepDef.title}
                    </h2>
                    {currentStepDef.description && (
                        <p className="text-gray-600 mt-1">{currentStepDef.description}</p>
                    )}
                </div>
                {/* Mobile: Show description only (title shown in progress indicator) */}
                {currentStepDef.description && (
                    <div className="sm:hidden mb-4">
                        <p className="text-sm text-gray-600">{currentStepDef.description}</p>
                    </div>
                )}

                {/* Step content */}
                {isReviewStep ? (
                    <ReviewStep
                        formData={formData}
                        formDefinition={formDefinition}
                        onEdit={handleEditFromSummary}
                    />
                ) : (
                    <StepRenderer
                        step={currentStepDef}
                        formData={formData}
                        onChange={handleFormChange}
                        errors={errors}
                    />
                )}
            </div>

            {/* Navigation buttons - fixed on mobile, relative on desktop */}
            <div className="mobile-bottom-nav">
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handlePrevious}
                        disabled={isFirstStep}
                        className={`flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2 rounded-lg font-medium text-base sm:text-sm transition-colors ${
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
                            className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2 bg-propel-teal text-white rounded-lg font-medium text-base sm:text-sm hover:bg-opacity-90 transition-colors"
                        >
                            {returnToSummary ? 'Save & Return to Summary' : (isLastStep ? 'Review' : 'Next')}
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

        // Load local config files and Supabase programs in parallel
        Promise.all([
            fetch('src/data/form-definition.json').then(r => r.json()),
            fetch('src/data/reference-data.json').then(r => r.json()),
            fetch('src/data/test-catalog.json').then(r => r.json()),
            fetchProgramsFromSupabase() // Fetch programs from Supabase
        ])
            .then(([formDef, refData, testCat, supabasePrograms]) => {
                debugLog('[App] Configuration loaded successfully');
                debugLog('[App] Form definition:', formDef.form_id, 'v' + formDef.version);
                debugLog('[App] Reference data keys:', Object.keys(refData));
                debugLog('[App] Test catalog labs:', Object.keys(testCat));

                // If Supabase programs loaded successfully, use them instead of local data
                if (supabasePrograms && supabasePrograms.length > 0) {
                    debugLog('[App] Using programs from Supabase:', supabasePrograms.length);
                    refData.programs = supabasePrograms;
                } else {
                    debugLog('[App] Using fallback programs from reference-data.json');
                }

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

                {/* Footer - Providence branded */}
                <div className="bg-propel-navy rounded-lg p-4 mt-8 text-center">
                    <p className="text-sm text-white">Providence Health Clinic Onboarding v{formDefinition.version}</p>
                    <p className="text-xs text-gray-400 mt-1">© {new Date().getFullYear()} Providence Health & Services</p>
                </div>
            </div>
        </FormContext.Provider>
    );
}

// ============================================================================
// MOUNT THE APP
// ============================================================================
// Render the React app to the DOM, wrapped in ErrorBoundary for graceful error handling

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

debugLog('[Providence Onboarding] App initialized');
