import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextArea from '../TextArea';

describe('TextArea', () => {
    const baseQuestion = {
        question_id: 'notes',
        label: 'Additional Notes',
        required: false,
        placeholder: 'Enter any additional notes...',
        help_text: 'Optional notes for the implementation team',
        rows: 6,
    };

    it('renders label', () => {
        render(<TextArea question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.getByText('Additional Notes')).toBeInTheDocument();
    });

    it('renders placeholder', () => {
        render(<TextArea question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.getByPlaceholderText('Enter any additional notes...')).toBeInTheDocument();
    });

    it('renders the current value', () => {
        render(<TextArea question={baseQuestion} value="Some notes here" onChange={() => {}} error={null} />);
        expect(screen.getByDisplayValue('Some notes here')).toBeInTheDocument();
    });

    it('calls onChange with input value', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();
        render(<TextArea question={baseQuestion} value="" onChange={handleChange} error={null} />);

        const textarea = screen.getByPlaceholderText('Enter any additional notes...');
        await user.type(textarea, 'X');
        expect(handleChange).toHaveBeenCalledWith('X');
    });

    it('renders help text', () => {
        render(<TextArea question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.getByText('Optional notes for the implementation team')).toBeInTheDocument();
    });

    it('shows error message', () => {
        render(<TextArea question={baseQuestion} value="" onChange={() => {}} error="Notes are required" />);
        expect(screen.getByText('Notes are required')).toBeInTheDocument();
    });

    it('does not show error when null', () => {
        render(<TextArea question={baseQuestion} value="" onChange={() => {}} error={null} />);
        expect(screen.queryByText('Notes are required')).not.toBeInTheDocument();
    });
});
