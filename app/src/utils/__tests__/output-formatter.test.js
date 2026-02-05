import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateOutputJson } from '../output-formatter';

// Mock debug.js to silence logs during tests
vi.mock('../debug', () => ({
    debugLog: vi.fn(),
}));

// =============================================================================
// generateOutputJson()
// =============================================================================
describe('generateOutputJson', () => {
    const FIXED_DATE = '2025-01-15T12:00:00.000Z';

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(FIXED_DATE));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const baseFormData = {
        program: 'P4M',
        clinic_name: 'Portland Clinic',
        clinic_address: { street: '123 Main', city: 'Portland', state: 'OR', zip: '97201' },
        timezone: 'America/Los_Angeles',
        hours_of_operation: '9am-5pm',
        hours_in_emails: true,
        website_main: 'https://example.com',
        website_patient_facing: 'https://patients.example.com',
        epic_department_id: 'DEP123',
        clinic_champion: { name: 'Jane', email: 'jane@clinic.org' },
        champion_is_primary: false,
        contact_primary: { name: 'Bob', email: 'bob@clinic.org' },
        genetic_counselor: { name: 'Alice', email: 'alice@clinic.org' },
        contact_secondary: null,
        contact_it: null,
        contact_lab: null,
        stakeholder_champion: { name: 'Jane' },
        stakeholder_executive: { name: 'CEO' },
        stakeholder_it_director: null,
        lab_partner: 'ambry',
        specimen_type: { default: 'blood', offer_alternates: true, alternates: ['saliva'] },
        billing_method: 'insurance',
        send_kit_to_patient: true,
        indication: 'screening',
        criteria_for_testing: 'NCCN guidelines',
        test_panel: 'customnext_cancer',
        include_rna_insight: false,
        custom_genes: ['BRCA1', 'BRCA2'],
        additional_test_panels: [],
        ordering_providers: [
            {
                provider_name: 'Dr. Smith',
                provider_title: 'MD',
                provider_email: 'smith@clinic.org',
                provider_phone: '555-1234',
                provider_npi: '1234567890',
                provider_specialty: 'Oncology',
                provider_office_address: { street: '456 Elm', city: 'Portland', state: 'OR', zip: '97201' },
            },
        ],
        helpdesk_phone: '800-555-1234',
        helpdesk_phone_in_emails: true,
        extract_patient_status: 'new_only',
        extract_procedure_type: 'screening_only',
        extract_filter_by_provider: false,
    };

    const formDefinition = { version: '1.0' };

    const referenceData = {
        test_panels: [
            {
                value: 'customnext_cancer',
                display_name: 'CustomNext-Cancer',
                test_code: 'CNC',
                test_code_rna: 'CNC-RNA',
                is_custom: true,
                gene_count: 90,
            },
            {
                value: 'breastovarian',
                display_name: 'BreastOvarian Panel',
                test_code: 'BOP',
                test_code_rna: 'BOP-RNA',
                is_custom: false,
                gene_count: 25,
            },
        ],
    };

    it('generates full output structure with all sections', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);

        expect(output.schema_version).toBe('1.0');
        expect(output.submitted_at).toBe(FIXED_DATE);
        expect(output.program).toBe('P4M');
    });

    it('includes clinic_information', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);
        const clinic = output.clinic_information;

        expect(clinic.clinic_name).toBe('Portland Clinic');
        expect(clinic.epic_department_id).toBe('DEP123');
        expect(clinic.timezone).toBe('America/Los_Angeles');
        expect(clinic.hours_of_operation).toBe('9am-5pm');
        expect(clinic.use_hours_in_emails).toBe(true);
        expect(clinic.website_main).toBe('https://example.com');
        expect(clinic.website_clinic).toBe('https://patients.example.com');
    });

    // Test panel — custom panel without RNA
    it('builds test_panel for custom panel without RNA', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);
        const panel = output.lab_order_configuration.test_panel;

        expect(panel.test_name).toBe('CustomNext-Cancer');
        expect(panel.test_code).toBe('CNC');
        expect(panel.include_rna_insight).toBe(false);
        expect(panel.selected_genes).toEqual(['BRCA1', 'BRCA2']);
        expect(panel.gene_count).toBe(2);
    });

    // Test panel — custom panel with RNA
    it('builds test_panel for custom panel with RNA', () => {
        const formData = { ...baseFormData, include_rna_insight: true };
        const output = generateOutputJson(formData, formDefinition, referenceData);
        const panel = output.lab_order_configuration.test_panel;

        expect(panel.test_name).toBe('CustomNext-Cancer +RNAInsight');
        expect(panel.test_code).toBe('CNC-RNA');
        expect(panel.include_rna_insight).toBe(true);
    });

    // Test panel — pre-defined panel (not custom)
    it('builds test_panel for pre-defined (non-custom) panel', () => {
        const formData = { ...baseFormData, test_panel: 'breastovarian', custom_genes: [] };
        const output = generateOutputJson(formData, formDefinition, referenceData);
        const panel = output.lab_order_configuration.test_panel;

        expect(panel.test_name).toBe('BreastOvarian Panel');
        expect(panel.test_code).toBe('BOP');
        expect(panel.selected_genes).toBeNull();
        expect(panel.gene_count).toBe(25);
    });

    // Test panel — null when no test_panel selected
    it('returns null test_panel when no test_panel in form data', () => {
        const formData = { ...baseFormData, test_panel: null };
        const output = generateOutputJson(formData, formDefinition, referenceData);
        expect(output.lab_order_configuration.test_panel).toBeNull();
    });

    // champion_is_primary logic
    it('copies champion to primary when champion_is_primary is true', () => {
        const formData = { ...baseFormData, champion_is_primary: true };
        const output = generateOutputJson(formData, formDefinition, referenceData);

        expect(output.contacts.champion_is_primary).toBe(true);
        expect(output.contacts.primary.name).toBe('Jane');
        expect(output.contacts.primary.is_also_champion).toBe(true);
    });

    it('uses separate contact_primary when champion_is_primary is false', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);

        expect(output.contacts.champion_is_primary).toBe(false);
        expect(output.contacts.primary.name).toBe('Bob');
        expect(output.contacts.primary.is_also_champion).toBeUndefined();
    });

    // Ordering providers
    it('maps ordering providers correctly', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);
        const providers = output.ordering_providers;

        expect(providers).toHaveLength(1);
        expect(providers[0].name).toBe('Dr. Smith');
        expect(providers[0].npi).toBe('1234567890');
        expect(providers[0].office_address.city).toBe('Portland');
    });

    // Specimen type transform (select_with_alternates)
    it('transforms specimen_type select_with_alternates to output format', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);
        const specimen = output.lab_order_configuration.specimen_collection;

        expect(specimen.default).toBe('blood');
        expect(specimen.additional_options_enabled).toBe(true);
        expect(specimen.additional_options).toEqual(['saliva']);
    });

    // Extract filtering
    it('sets extract_filtering correctly when filter_by_provider is false', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);

        expect(output.extract_filtering.patient_status).toBe('new_only');
        expect(output.extract_filtering.filter_by_provider).toBe(false);
        expect(output.extract_filtering.provider_list).toBeNull();
    });

    it('includes provider_list when filter_by_provider is true', () => {
        const formData = {
            ...baseFormData,
            extract_filter_by_provider: true,
            extract_filter_providers: [{ first_name: 'Jane', last_name: 'Smith' }],
        };
        const output = generateOutputJson(formData, formDefinition, referenceData);

        expect(output.extract_filtering.filter_by_provider).toBe(true);
        expect(output.extract_filtering.provider_list).toEqual([
            { first_name: 'Jane', last_name: 'Smith' },
        ]);
    });

    // Stakeholders
    it('filters out empty stakeholders', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);
        expect(output.stakeholders).toHaveLength(2);
        expect(output.stakeholders[0].name).toBe('Jane');
        expect(output.stakeholders[1].name).toBe('CEO');
    });

    // Metadata
    it('includes metadata', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);
        expect(output.metadata.form_version).toBe('1.0');
        expect(output.metadata.generated_by).toBe('propel-onboarding-form');
    });

    // Helpdesk
    it('includes helpdesk config', () => {
        const output = generateOutputJson(baseFormData, formDefinition, referenceData);
        expect(output.helpdesk.phone).toBe('800-555-1234');
        expect(output.helpdesk.include_in_emails).toBe(true);
    });
});
