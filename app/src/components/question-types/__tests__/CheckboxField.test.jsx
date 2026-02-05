import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CheckboxField from '../CheckboxField';

describe('CheckboxField', () => {
    const baseQuestion = {
        question_id: 'champion_is_primary',
        label: 'Champion is also primary contact',
        required: false,
        help_text: 'Check if the champion serves as primary contact',
    };

    it('renders label', () => {
        render(<CheckboxField question={baseQuestion} value={false} onChange={() => {}} error={null} />);
        expect(screen.getByText('Champion is also primary contact')).toBeInTheDocument();
    });

    it('renders unchecked when value is false', () => {
        render(<CheckboxField question={baseQuestion} value={false} onChange={() => {}} error={null} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
    });

    it('renders checked when value is true', () => {
        render(<CheckboxField question={baseQuestion} value={true} onChange={() => {}} error={null} />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
    });

    it('calls onChange with true when clicked (toggling from false)', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<CheckboxField question={baseQuestion} value={false} onChange={handleChange} error={null} />);

        await user.click(screen.getByRole('checkbox'));
        expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('renders help text', () => {
        render(<CheckboxField question={baseQuestion} value={false} onChange={() => {}} error={null} />);
        expect(screen.getByText('Check if the champion serves as primary contact')).toBeInTheDocument();
    });

    it('shows error message', () => {
        render(<CheckboxField question={baseQuestion} value={false} onChange={() => {}} error="Required" />);
        expect(screen.getByText('Required')).toBeInTheDocument();
    });
});
