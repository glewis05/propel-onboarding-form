import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectField from '../SelectField';

describe('SelectField', () => {
    const baseQuestion = {
        question_id: 'timezone',
        label: 'Timezone',
        required: true,
        help_text: 'Select your timezone',
    };

    const options = [
        { value: 'America/Los_Angeles', display_name: 'Pacific Time' },
        { value: 'America/Denver', display_name: 'Mountain Time' },
        { value: 'America/Chicago', display_name: 'Central Time' },
    ];

    it('renders label', () => {
        render(<SelectField question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('Timezone')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
        render(<SelectField question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders all options plus the default "Select..."', () => {
        render(<SelectField question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('Select...')).toBeInTheDocument();
        expect(screen.getByText('Pacific Time')).toBeInTheDocument();
        expect(screen.getByText('Mountain Time')).toBeInTheDocument();
        expect(screen.getByText('Central Time')).toBeInTheDocument();
    });

    it('calls onChange on selection', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<SelectField question={baseQuestion} value="" onChange={handleChange} options={options} error={null} />);

        const select = screen.getByRole('combobox');
        await user.selectOptions(select, 'America/Denver');
        expect(handleChange).toHaveBeenCalledWith('America/Denver');
    });

    it('shows help text', () => {
        render(<SelectField question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.getByText('Select your timezone')).toBeInTheDocument();
    });

    it('shows error message', () => {
        render(<SelectField question={baseQuestion} value="" onChange={() => {}} options={options} error="Timezone is required" />);
        expect(screen.getByText('Timezone is required')).toBeInTheDocument();
    });

    it('does not show error when null', () => {
        render(<SelectField question={baseQuestion} value="" onChange={() => {}} options={options} error={null} />);
        expect(screen.queryByText('Timezone is required')).not.toBeInTheDocument();
    });
});
