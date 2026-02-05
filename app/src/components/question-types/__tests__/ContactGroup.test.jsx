import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactGroup from '../ContactGroup';

describe('ContactGroup', () => {
    const baseQuestion = {
        question_id: 'clinic_champion',
        label: 'Clinic Champion',
        required: true,
        help_text: 'Primary decision maker for implementation',
    };

    const referenceData = {
        communication_channels: [
            { value: 'email', display_name: 'Email' },
            { value: 'phone', display_name: 'Phone' },
        ],
        preferred_times: [
            { value: 'morning', display_name: 'Morning' },
            { value: 'afternoon', display_name: 'Afternoon' },
        ],
    };

    it('renders all sub-fields', () => {
        render(
            <ContactGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );

        expect(screen.getByPlaceholderText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Clinical Director')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('jane.smith@clinic.org')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('406-555-1234')).toBeInTheDocument();
    });

    it('renders label and required indicator', () => {
        render(
            <ContactGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );

        expect(screen.getByText('Clinic Champion')).toBeInTheDocument();
        // The main required asterisk
        const asterisks = screen.getAllByText('*');
        expect(asterisks.length).toBeGreaterThanOrEqual(1);
    });

    it('renders help text', () => {
        render(
            <ContactGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );
        expect(screen.getByText('Primary decision maker for implementation')).toBeInTheDocument();
    });

    it('renders communication channel and time dropdowns', () => {
        render(
            <ContactGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );

        // "Email" and "Phone" appear as both field labels and dropdown options,
        // so use getAllByText to verify at least one instance exists
        expect(screen.getAllByText('Email').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Phone').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Morning')).toBeInTheDocument();
        expect(screen.getByText('Afternoon')).toBeInTheDocument();
    });

    it('calls onChange with merged object when name field changes', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <ContactGroup
                question={baseQuestion}
                value={{ email: 'existing@test.com' }}
                onChange={handleChange}
                errors={{}}
                referenceData={referenceData}
            />
        );

        const nameInput = screen.getByPlaceholderText('Jane Smith');
        await user.type(nameInput, 'A');

        expect(handleChange).toHaveBeenCalledWith({
            email: 'existing@test.com',
            name: 'A',
        });
    });

    it('calls onChange with merged object when email field changes', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <ContactGroup
                question={baseQuestion}
                value={{ name: 'Jane' }}
                onChange={handleChange}
                errors={{}}
                referenceData={referenceData}
            />
        );

        const emailInput = screen.getByPlaceholderText('jane.smith@clinic.org');
        await user.type(emailInput, 'a');

        expect(handleChange).toHaveBeenCalledWith({
            name: 'Jane',
            email: 'a',
        });
    });

    it('shows error indicator when required fields have errors', () => {
        const errors = {
            clinic_champion_name: 'Name is required',
        };

        render(
            <ContactGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={errors}
                referenceData={referenceData}
            />
        );

        expect(screen.getByText('Please complete all required contact fields')).toBeInTheDocument();
    });

    it('does not show error indicator when no errors', () => {
        render(
            <ContactGroup
                question={baseQuestion}
                value={{ name: 'Jane', email: 'jane@test.com' }}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );

        expect(screen.queryByText('Please complete all required contact fields')).not.toBeInTheDocument();
    });
});
