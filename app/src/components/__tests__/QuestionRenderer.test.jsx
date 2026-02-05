import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FormContext from '../../context/FormContext';
import QuestionRenderer from '../QuestionRenderer';

// Mock debug to silence logs
vi.mock('../../utils/debug', () => ({
    debugLog: vi.fn(),
}));

// Helper to wrap component in FormContext.Provider
function renderWithContext(ui, contextValue = {}) {
    const defaultContext = {
        referenceData: {},
        testCatalog: {},
        ...contextValue,
    };
    return render(
        <FormContext.Provider value={defaultContext}>
            {ui}
        </FormContext.Provider>
    );
}

describe('QuestionRenderer', () => {
    // =========================================================================
    // Routing to correct component by type
    // =========================================================================
    it('renders TextField for type "text"', () => {
        const question = {
            question_id: 'clinic_name',
            type: 'text',
            label: 'Clinic Name',
            required: true,
            placeholder: 'Enter name',
        };

        renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{}} />
        );

        expect(screen.getByText('Clinic Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
    });

    it('renders TextArea for type "textarea"', () => {
        const question = {
            question_id: 'notes',
            type: 'textarea',
            label: 'Notes',
            placeholder: 'Enter notes',
        };

        renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{}} />
        );

        expect(screen.getByText('Notes')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter notes')).toBeInTheDocument();
    });

    it('renders SelectField for type "select"', () => {
        const question = {
            question_id: 'timezone',
            type: 'select',
            label: 'Timezone',
            options_ref: 'timezones',
        };

        const referenceData = {
            timezones: [
                { value: 'America/Los_Angeles', display_name: 'Pacific Time' },
            ],
        };

        renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{}} />,
            { referenceData }
        );

        expect(screen.getByText('Timezone')).toBeInTheDocument();
        expect(screen.getByText('Pacific Time')).toBeInTheDocument();
    });

    it('renders RadioGroup for type "radio"', () => {
        const question = {
            question_id: 'billing_method',
            type: 'radio',
            label: 'Billing Method',
            options_ref: 'billing_methods',
        };

        const referenceData = {
            billing_methods: [
                { value: 'insurance', display_name: 'Insurance' },
                { value: 'self_pay', display_name: 'Self Pay' },
            ],
        };

        renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{}} />,
            { referenceData }
        );

        expect(screen.getByText('Billing Method')).toBeInTheDocument();
        expect(screen.getByText('Insurance')).toBeInTheDocument();
        expect(screen.getByText('Self Pay')).toBeInTheDocument();
    });

    it('renders CheckboxField for type "checkbox"', () => {
        const question = {
            question_id: 'champion_is_primary',
            type: 'checkbox',
            label: 'Champion is primary contact',
        };

        renderWithContext(
            <QuestionRenderer question={question} value={false} onChange={() => {}} errors={{}} formData={{}} />
        );

        expect(screen.getByText('Champion is primary contact')).toBeInTheDocument();
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders AddressGroup for type "address"', () => {
        const question = {
            question_id: 'clinic_address',
            type: 'address',
            label: 'Clinic Address',
        };

        const referenceData = {
            us_states: [{ value: 'OR', display_name: 'Oregon' }],
        };

        renderWithContext(
            <QuestionRenderer question={question} value={{}} onChange={() => {}} errors={{}} formData={{}} />,
            { referenceData }
        );

        expect(screen.getByText('Clinic Address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Street Address')).toBeInTheDocument();
    });

    it('renders ContactGroup for type "contact_group"', () => {
        const question = {
            question_id: 'clinic_champion',
            type: 'contact_group',
            label: 'Clinic Champion',
        };

        const referenceData = {
            communication_channels: [],
            preferred_times: [],
        };

        renderWithContext(
            <QuestionRenderer question={question} value={{}} onChange={() => {}} errors={{}} formData={{}} />,
            { referenceData }
        );

        expect(screen.getByText('Clinic Champion')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Jane Smith')).toBeInTheDocument();
    });

    // =========================================================================
    // show_when conditions
    // =========================================================================
    it('hides question when show_when condition is not met', () => {
        const question = {
            question_id: 'p4m_field',
            type: 'text',
            label: 'P4M-Only Field',
            show_when: { question_id: 'program', operator: 'equals', value: 'P4M' },
        };

        const { container } = renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{ program: 'GRX' }} />
        );

        expect(container.innerHTML).toBe('');
    });

    it('shows question when show_when condition is met', () => {
        const question = {
            question_id: 'p4m_field',
            type: 'text',
            label: 'P4M-Only Field',
            show_when: { question_id: 'program', operator: 'equals', value: 'P4M' },
        };

        renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{ program: 'P4M' }} />
        );

        expect(screen.getByText('P4M-Only Field')).toBeInTheDocument();
    });

    it('shows question when no show_when condition is set', () => {
        const question = {
            question_id: 'always_visible',
            type: 'text',
            label: 'Always Visible',
        };

        renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{}} />
        );

        expect(screen.getByText('Always Visible')).toBeInTheDocument();
    });

    // =========================================================================
    // Unknown type handling
    // =========================================================================
    it('shows warning for unknown question type', () => {
        const question = {
            question_id: 'mystery',
            type: 'unknown_widget',
            label: 'Mystery',
        };

        renderWithContext(
            <QuestionRenderer question={question} value="" onChange={() => {}} errors={{}} formData={{}} />
        );

        expect(screen.getByText('Unknown question type: unknown_widget')).toBeInTheDocument();
    });

    // =========================================================================
    // Conditional options filtering
    // =========================================================================
    it('filters options based on conditional_options config', () => {
        const question = {
            question_id: 'test_product',
            type: 'select',
            label: 'Test Product',
            options_ref: 'test_products',
            conditional_options: {
                depends_on: 'lab_partner',
                mapping: {
                    ambry: ['ambry_test_1'],
                    helix: ['helix_test_1'],
                },
            },
        };

        const referenceData = {
            test_products: [
                { value: 'ambry_test_1', display_name: 'Ambry Test 1' },
                { value: 'helix_test_1', display_name: 'Helix Test 1' },
            ],
        };

        renderWithContext(
            <QuestionRenderer
                question={question}
                value=""
                onChange={() => {}}
                errors={{}}
                formData={{ lab_partner: 'ambry' }}
            />,
            { referenceData }
        );

        expect(screen.getByText('Ambry Test 1')).toBeInTheDocument();
        expect(screen.queryByText('Helix Test 1')).not.toBeInTheDocument();
    });
});
