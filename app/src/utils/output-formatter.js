import { debugLog } from './debug';

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
export function generateOutputJson(formData, formDefinition, referenceData) {
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
            // When true, use the RNA test code and append +RNAInsight to the name
            const includeRna = formData.include_rna_insight === true;

            // Determine which test code to use based on RNA checkbox
            // Each test panel has both test_code (base) and test_code_rna (with RNA)
            const testCode = includeRna
                ? (selectedPanel.test_code_rna || selectedPanel.test_code)
                : selectedPanel.test_code;

            // Build the test name - append +RNAInsight when RNA is included
            const testName = includeRna
                ? `${selectedPanel.display_name} +RNAInsight`
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
            website_clinic: formData.website_patient_facing || null
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

            // Renamed from test_products to additional_test_panels
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
        // NCCN RULE CHANGES (P4M / PR4M only)
        // =====================================================================
        nccn_rule_changes: ['P4M', 'PR4M'].includes(formData.program)
            ? (formData.nccn_rule_changes || []).map(change => {
                const base = { change_type: change.change_type };
                if (change.change_type === 'new') {
                    return {
                        ...base,
                        new_rule_content: change.new_rule_content || null,
                        new_rule_description: change.new_rule_description || null
                    };
                }
                const rule = referenceData?.nccn_rules?.find(r => r.id === change.target_rule);
                if (change.change_type === 'modified') {
                    return {
                        ...base,
                        target_rule_id: change.target_rule,
                        target_rule_title: rule?.title || null,
                        original_rule_text: rule?.rule_text || null,
                        modified_rule_text: change.modified_rule_content || null
                    };
                }
                // deprecated
                return {
                    ...base,
                    target_rule_id: change.target_rule,
                    target_rule_title: rule?.title || null,
                    original_rule_text: rule?.rule_text || null,
                    deprecation_reason: change.deprecation_reason || null
                };
            })
            : [],

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
