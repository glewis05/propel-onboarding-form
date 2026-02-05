import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextField from '../TextField';

describe('TextField', () => {
    const baseQuestion = {
        question_id: 'clinic_name',
        label: 'Clinic Name',
        required: true,
        placeholder: 'Enter clinic name',
        help_text: 'Official name of the clinic',
    };

    it('renders label', () => {
        render(<TextField question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.getByText('Clinic Name')).toBeInTheDocument();
    });

    it('renders required indicator when required', () => {
        render(<TextField question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not render required indicator when not required', () => {
        const question = { ...baseQuestion, required: false };
        render(<TextField question={question} value="" onChange={() => {}} error={null} />);
        expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('renders placeholder', () => {
        render(<TextField question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.getByPlaceholderText('Enter clinic name')).toBeInTheDocument();
    });

    it('renders help text', () => {
        render(<TextField question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.getByText('Official name of the clinic')).toBeInTheDocument();
    });

    it('calls onChange with input value', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<TextField question={baseQuestion} value="" onChange={handleChange} error={null} />);

        const input = screen.getByPlaceholderText('Enter clinic name');
        await user.type(input, 'A');
        expect(handleChange).toHaveBeenCalledWith('A');
    });

    it('displays the current value', () => {
        render(<TextField question={baseQuestion} value="Portland Clinic" onChange={() => {}} error={null} />);
        expect(screen.getByDisplayValue('Portland Clinic')).toBeInTheDocument();
    });

    it('shows error message when error is provided', () => {
        render(<TextField question={baseQuestion} value="" onChange={() => {}} error="Clinic Name is required" />);
        expect(screen.getByText('Clinic Name is required')).toBeInTheDocument();
    });

    it('does not show error message when error is null', () => {
        render(<TextField question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.queryByText('Clinic Name is required')).not.toBeInTheDocument();
    });
});
