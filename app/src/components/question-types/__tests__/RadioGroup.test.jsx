import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RadioGroup from '../RadioGroup';

describe('RadioGroup', () => {
    const baseQuestion = {
        question_id: 'billing_method',
        label: 'Billing Method',
        required: true,
        help_text: 'How will testing be billed?',
    };

    const options = [
        { value: 'insurance', display_name: 'Insurance', description: 'Bill through insurance' },
        { value: 'self_pay', display_name: 'Self Pay', description: 'Patient pays directly' },
        { value: 'institutional', display_name: 'Institutional', description: 'Billed to institution' },
    ];

    it('renders label', () => {
        render(<RadioGroup question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('Billing Method')).toBeInTheDocument();
    });

    it('renders all options', () => {
        render(<RadioGroup question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('Insurance')).toBeInTheDocument();
        expect(screen.getByText('Self Pay')).toBeInTheDocument();
        expect(screen.getByText('Institutional')).toBeInTheDocument();
    });

    it('renders option descriptions', () => {
        render(<RadioGroup question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('Bill through insurance')).toBeInTheDocument();
    });

    it('selects the correct radio based on value', () => {
        render(<RadioGroup question={baseQuestion} value="insurance" onChange={() => {}} options={options} error={null} />);
        const radios = screen.getAllByRole('radio');
        expect(radios[0]).toBeChecked();
        expect(radios[1]).not.toBeChecked();
        expect(radios[2]).not.toBeChecked();
    });

    it('calls onChange on selection', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<RadioGroup question={baseQuestion} value="" onChange={handleChange} options={options} error={null} />);

        await user.click(screen.getByText('Self Pay'));
        expect(handleChange).toHaveBeenCalledWith('self_pay');
    });

    it('shows help text', () => {
        render(<RadioGroup question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('How will testing be billed?')).toBeInTheDocument();
    });

    it('shows error message', () => {
        render(<RadioGroup question={baseQuestion} value="" onChange={() => {}} options={options} error="Selection required" />);
        expect(screen.getByText('Selection required')).toBeInTheDocument();
    });
});
