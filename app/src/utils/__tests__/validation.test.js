import { describe, it, expect, vi } from 'vitest';
import {
    evaluateCondition,
    filterConditionalOptions,
    validateField,
    validateStep,
} from '../validation';

// Mock debug.js to silence logs during tests
vi.mock('../debug', () => ({
    debugLog: vi.fn(),
}));

// =============================================================================
// evaluateCondition()
// =============================================================================
describe('evaluateCondition', () => {
    it('returns true when condition is null/undefined', () => {
        expect(evaluateCondition(null, {})).toBe(true);
        expect(evaluateCondition(undefined, {})).toBe(true);
    });

    // --- equals ---
    it('equals: returns true when values match', () => {
        const condition = { question_id: 'program', operator: 'equals', value: 'P4M' };
        expect(evaluateCondition(condition, { program: 'P4M' })).toBe(true);
    });

    it('equals: returns false when values differ', () => {
        const condition = { question_id: 'program', operator: 'equals', value: 'P4M' };
        expect(evaluateCondition(condition, { program: 'GRX' })).toBe(false);
    });

    it('equals: returns false when field is undefined', () => {
        const condition = { question_id: 'program', operator: 'equals', value: 'P4M' };
        expect(evaluateCondition(condition, {})).toBe(false);
    });

    // --- not_equals ---
    it('not_equals: returns true when values differ', () => {
        const condition = { question_id: 'program', operator: 'not_equals', value: 'P4M' };
        expect(evaluateCondition(condition, { program: 'GRX' })).toBe(true);
    });

    it('not_equals: returns false when values match', () => {
        const condition = { question_id: 'program', operator: 'not_equals', value: 'P4M' };
        expect(evaluateCondition(condition, { program: 'P4M' })).toBe(false);
    });

    // --- in ---
    it('in: returns true when value is in target array', () => {
        const condition = { question_id: 'program', operator: 'in', value: ['P4M', 'PR4M'] };
        expect(evaluateCondition(condition, { program: 'P4M' })).toBe(true);
    });

    it('in: returns false when value is not in target array', () => {
        const condition = { question_id: 'program', operator: 'in', value: ['P4M', 'PR4M'] };
        expect(evaluateCondition(condition, { program: 'GRX' })).toBe(false);
    });

    it('in: returns false when target is not an array', () => {
        const condition = { question_id: 'program', operator: 'in', value: 'P4M' };
        expect(evaluateCondition(condition, { program: 'P4M' })).toBe(false);
    });

    // --- not_in ---
    it('not_in: returns true when value is not in target array', () => {
        const condition = { question_id: 'program', operator: 'not_in', value: ['P4M', 'PR4M'] };
        expect(evaluateCondition(condition, { program: 'GRX' })).toBe(true);
    });

    it('not_in: returns false when value is in target array', () => {
        const condition = { question_id: 'program', operator: 'not_in', value: ['P4M', 'PR4M'] };
        expect(evaluateCondition(condition, { program: 'P4M' })).toBe(false);
    });

    // --- not_empty ---
    it('not_empty: returns true for non-empty string', () => {
        const condition = { question_id: 'name', operator: 'not_empty' };
        expect(evaluateCondition(condition, { name: 'Test' })).toBe(true);
    });

    it('not_empty: returns false for empty string', () => {
        const condition = { question_id: 'name', operator: 'not_empty' };
        expect(evaluateCondition(condition, { name: '' })).toBe(false);
    });

    it('not_empty: returns false for null', () => {
        const condition = { question_id: 'name', operator: 'not_empty' };
        expect(evaluateCondition(condition, { name: null })).toBe(false);
    });

    it('not_empty: returns false for undefined', () => {
        const condition = { question_id: 'name', operator: 'not_empty' };
        expect(evaluateCondition(condition, {})).toBe(false);
    });

    it('not_empty: returns true for non-empty array', () => {
        const condition = { question_id: 'genes', operator: 'not_empty' };
        expect(evaluateCondition(condition, { genes: ['BRCA1'] })).toBe(true);
    });

    it('not_empty: returns false for empty array', () => {
        const condition = { question_id: 'genes', operator: 'not_empty' };
        expect(evaluateCondition(condition, { genes: [] })).toBe(false);
    });

    it('not_empty: returns true for non-empty object', () => {
        const condition = { question_id: 'address', operator: 'not_empty' };
        expect(evaluateCondition(condition, { address: { city: 'Portland' } })).toBe(true);
    });

    it('not_empty: returns false for empty object', () => {
        const condition = { question_id: 'address', operator: 'not_empty' };
        expect(evaluateCondition(condition, { address: {} })).toBe(false);
    });

    // --- empty ---
    it('empty: returns true for empty string', () => {
        const condition = { question_id: 'name', operator: 'empty' };
        expect(evaluateCondition(condition, { name: '' })).toBe(true);
    });

    it('empty: returns true for null', () => {
        const condition = { question_id: 'name', operator: 'empty' };
        expect(evaluateCondition(condition, { name: null })).toBe(true);
    });

    it('empty: returns true for undefined', () => {
        const condition = { question_id: 'name', operator: 'empty' };
        expect(evaluateCondition(condition, {})).toBe(true);
    });

    it('empty: returns false for non-empty string', () => {
        const condition = { question_id: 'name', operator: 'empty' };
        expect(evaluateCondition(condition, { name: 'Hello' })).toBe(false);
    });

    it('empty: returns true for empty array', () => {
        const condition = { question_id: 'genes', operator: 'empty' };
        expect(evaluateCondition(condition, { genes: [] })).toBe(true);
    });

    it('empty: returns false for non-empty array', () => {
        const condition = { question_id: 'genes', operator: 'empty' };
        expect(evaluateCondition(condition, { genes: ['BRCA1'] })).toBe(false);
    });

    // --- unknown operator ---
    it('returns true for unknown operator (graceful fallback)', () => {
        const condition = { question_id: 'x', operator: 'greater_than', value: 5 };
        expect(evaluateCondition(condition, { x: 10 })).toBe(true);
    });
});

// =============================================================================
// filterConditionalOptions()
// =============================================================================
describe('filterConditionalOptions', () => {
    const options = [
        { value: 'ambry_test_1', display_name: 'Ambry Test 1' },
        { value: 'ambry_test_2', display_name: 'Ambry Test 2' },
        { value: 'helix_test_1', display_name: 'Helix Test 1' },
    ];

    it('returns all options when no conditional config', () => {
        expect(filterConditionalOptions(options, null, {})).toEqual(options);
        expect(filterConditionalOptions(options, undefined, {})).toEqual(options);
    });

    it('filters options based on mapping', () => {
        const config = {
            depends_on: 'lab_partner',
            mapping: {
                ambry: ['ambry_test_1', 'ambry_test_2'],
                helix: ['helix_test_1'],
            },
        };
        const result = filterConditionalOptions(options, config, { lab_partner: 'ambry' });
        expect(result).toHaveLength(2);
        expect(result.map(o => o.value)).toEqual(['ambry_test_1', 'ambry_test_2']);
    });

    it('returns all options when dependent value is missing', () => {
        const config = {
            depends_on: 'lab_partner',
            mapping: { ambry: ['ambry_test_1'] },
        };
        const result = filterConditionalOptions(options, config, {});
        expect(result).toEqual(options);
    });

    it('returns all options when mapping has no entry for dependent value', () => {
        const config = {
            depends_on: 'lab_partner',
            mapping: { ambry: ['ambry_test_1'] },
        };
        const result = filterConditionalOptions(options, config, { lab_partner: 'unknown_lab' });
        expect(result).toEqual(options);
    });
});

// =============================================================================
// validateField()
// =============================================================================
describe('validateField', () => {
    it('returns error for required empty field', () => {
        const question = { label: 'Clinic Name', required: true };
        expect(validateField('', question)).toBe('Clinic Name is required');
        expect(validateField(null, question)).toBe('Clinic Name is required');
        expect(validateField(undefined, question)).toBe('Clinic Name is required');
    });

    it('returns null for required non-empty field', () => {
        const question = { label: 'Clinic Name', required: true };
        expect(validateField('Portland Clinic', question)).toBeNull();
    });

    it('returns null for non-required empty field', () => {
        const question = { label: 'Optional', required: false };
        expect(validateField('', question)).toBeNull();
    });

    // gene_selector type
    it('returns error for required gene_selector with empty array', () => {
        const question = { label: 'Genes', required: true, type: 'gene_selector' };
        expect(validateField([], question)).toBe('Genes: Please select at least one gene');
    });

    it('returns error for required gene_selector with non-array', () => {
        const question = { label: 'Genes', required: true, type: 'gene_selector' };
        expect(validateField('not-array', question)).toBe('Genes: Please select at least one gene');
    });

    it('returns null for required gene_selector with genes selected', () => {
        const question = { label: 'Genes', required: true, type: 'gene_selector' };
        expect(validateField(['BRCA1', 'BRCA2'], question)).toBeNull();
    });

    // select_with_alternates type
    it('returns error for required select_with_alternates with no default', () => {
        const question = { label: 'Specimen Type', required: true, type: 'select_with_alternates' };
        expect(validateField({ default: '' }, question)).toBe('Specimen Type default selection is required');
    });

    it('returns null for required select_with_alternates with default selected', () => {
        const question = { label: 'Specimen Type', required: true, type: 'select_with_alternates' };
        expect(validateField({ default: 'blood' }, question)).toBeNull();
    });

    // Pattern validation
    it('returns error when pattern does not match', () => {
        const question = {
            label: 'NPI',
            pattern: '^\\d{10}$',
            pattern_error: 'NPI must be 10 digits',
        };
        expect(validateField('12345', question)).toBe('NPI must be 10 digits');
    });

    it('returns null when pattern matches', () => {
        const question = {
            label: 'NPI',
            pattern: '^\\d{10}$',
            pattern_error: 'NPI must be 10 digits',
        };
        expect(validateField('1234567890', question)).toBeNull();
    });

    it('uses default pattern_error message when none provided', () => {
        const question = { label: 'Code', pattern: '^[A-Z]+$' };
        expect(validateField('abc', question)).toBe('Code format is invalid');
    });

    it('skips pattern check when value is empty', () => {
        const question = { label: 'Code', pattern: '^[A-Z]+$' };
        expect(validateField('', question)).toBeNull();
    });

    // max_length validation
    it('returns error when value exceeds max_length', () => {
        const question = { label: 'Notes', max_length: 5 };
        expect(validateField('123456', question)).toBe('Notes must be 5 characters or less');
    });

    it('returns null when value is within max_length', () => {
        const question = { label: 'Notes', max_length: 10 };
        expect(validateField('12345', question)).toBeNull();
    });
});

// =============================================================================
// validateStep()
// =============================================================================
describe('validateStep', () => {
    const compositeTypes = {};

    it('returns valid for review steps', () => {
        const step = { is_review_step: true, questions: [] };
        const result = validateStep(step, {}, compositeTypes);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
    });

    it('validates regular step — all fields valid', () => {
        const step = {
            step_id: 'clinic_info',
            questions: [
                { question_id: 'clinic_name', label: 'Clinic Name', required: true },
            ],
        };
        const formData = { clinic_name: 'Portland Clinic' };
        const result = validateStep(step, formData, compositeTypes);
        expect(result.isValid).toBe(true);
    });

    it('validates regular step — missing required field', () => {
        const step = {
            step_id: 'clinic_info',
            questions: [
                { question_id: 'clinic_name', label: 'Clinic Name', required: true },
            ],
        };
        const formData = {};
        const result = validateStep(step, formData, compositeTypes);
        expect(result.isValid).toBe(false);
        expect(result.errors.clinic_name).toBe('Clinic Name is required');
    });

    it('skips hidden fields (show_when condition not met)', () => {
        const step = {
            step_id: 'details',
            questions: [
                {
                    question_id: 'p4m_field',
                    label: 'P4M Field',
                    required: true,
                    show_when: { question_id: 'program', operator: 'equals', value: 'P4M' },
                },
            ],
        };
        // program is GRX, so the field should be skipped
        const formData = { program: 'GRX' };
        const result = validateStep(step, formData, compositeTypes);
        expect(result.isValid).toBe(true);
    });

    it('validates visible conditional fields', () => {
        const step = {
            step_id: 'details',
            questions: [
                {
                    question_id: 'p4m_field',
                    label: 'P4M Field',
                    required: true,
                    show_when: { question_id: 'program', operator: 'equals', value: 'P4M' },
                },
            ],
        };
        // program is P4M, field is visible but empty
        const formData = { program: 'P4M' };
        const result = validateStep(step, formData, compositeTypes);
        expect(result.isValid).toBe(false);
        expect(result.errors.p4m_field).toBe('P4M Field is required');
    });

    // Repeatable step validation
    it('validates repeatable step — min_items not met', () => {
        const step = {
            step_id: 'ordering_providers',
            repeatable: true,
            repeatable_config: { min_items: 1 },
            questions: [
                { question_id: 'provider_name', label: 'Provider Name', required: true },
            ],
        };
        const formData = { ordering_providers: [] };
        const result = validateStep(step, formData, compositeTypes);
        expect(result.isValid).toBe(false);
        expect(result.errors._section).toBe('At least 1 item(s) required');
    });

    it('validates repeatable step — item with missing required field', () => {
        const step = {
            step_id: 'ordering_providers',
            repeatable: true,
            repeatable_config: { min_items: 1 },
            questions: [
                { question_id: 'provider_name', label: 'Provider Name', required: true },
            ],
        };
        const formData = { ordering_providers: [{ provider_name: '' }] };
        const result = validateStep(step, formData, compositeTypes);
        expect(result.isValid).toBe(false);
        expect(result.errors['0_provider_name']).toBe('Provider Name is required');
    });

    it('validates repeatable step — valid item', () => {
        const step = {
            step_id: 'ordering_providers',
            repeatable: true,
            repeatable_config: { min_items: 1 },
            questions: [
                { question_id: 'provider_name', label: 'Provider Name', required: true },
            ],
        };
        const formData = { ordering_providers: [{ provider_name: 'Dr. Smith' }] };
        const result = validateStep(step, formData, compositeTypes);
        expect(result.isValid).toBe(true);
    });

    // Composite type validation
    it('validates composite type fields in regular step', () => {
        const compTypes = {
            contact_group: {
                fields: [
                    { field_id: 'name', label: 'Name', required: true },
                    { field_id: 'email', label: 'Email', required: true },
                ],
            },
        };
        const step = {
            step_id: 'contacts',
            questions: [
                { question_id: 'clinic_champion', label: 'Champion', type: 'contact_group', required: true },
            ],
        };
        // Empty composite value
        const formData = { clinic_champion: {} };
        const result = validateStep(step, formData, compTypes);
        expect(result.isValid).toBe(false);
        expect(result.errors['clinic_champion_name']).toBe('Name is required');
        expect(result.errors['clinic_champion_email']).toBe('Email is required');
    });

    it('validates composite type pattern in regular step', () => {
        const compTypes = {
            contact_group: {
                fields: [
                    { field_id: 'email', label: 'Email', required: false, pattern: '^.+@.+\\..+$' },
                ],
            },
        };
        const step = {
            step_id: 'contacts',
            questions: [
                { question_id: 'clinic_champion', label: 'Champion', type: 'contact_group', required: true },
            ],
        };
        const formData = { clinic_champion: { email: 'invalid' } };
        const result = validateStep(step, formData, compTypes);
        expect(result.isValid).toBe(false);
        expect(result.errors['clinic_champion_email']).toBe('Email format is invalid');
    });
});
