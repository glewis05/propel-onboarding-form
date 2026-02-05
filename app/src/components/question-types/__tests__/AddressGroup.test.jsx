import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddressGroup from '../AddressGroup';

describe('AddressGroup', () => {
    const baseQuestion = {
        question_id: 'clinic_address',
        label: 'Clinic Address',
        required: true,
    };

    const referenceData = {
        us_states: [
            { value: 'OR', display_name: 'Oregon' },
            { value: 'WA', display_name: 'Washington' },
            { value: 'CA', display_name: 'California' },
        ],
    };

    it('renders street, city, state, zip fields', () => {
        render(
            <AddressGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );

        expect(screen.getByPlaceholderText('Street Address')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('City')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('ZIP Code')).toBeInTheDocument();
        // State dropdown
        expect(screen.getByText('State')).toBeInTheDocument();
    });

    it('renders label', () => {
        render(
            <AddressGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );
        expect(screen.getByText('Clinic Address')).toBeInTheDocument();
    });

    it('renders state options', () => {
        render(
            <AddressGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );

        expect(screen.getByText('OR')).toBeInTheDocument();
        expect(screen.getByText('WA')).toBeInTheDocument();
        expect(screen.getByText('CA')).toBeInTheDocument();
    });

    it('calls onChange with merged object when street changes', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <AddressGroup
                question={baseQuestion}
                value={{ city: 'Portland' }}
                onChange={handleChange}
                errors={{}}
                referenceData={referenceData}
            />
        );

        const streetInput = screen.getByPlaceholderText('Street Address');
        await user.type(streetInput, '1');

        expect(handleChange).toHaveBeenCalledWith({
            city: 'Portland',
            street: '1',
        });
    });

    it('calls onChange with merged object when city changes', async () => {
        const user = userEvent.setup();
        const handleChange = vi.fn();

        render(
            <AddressGroup
                question={baseQuestion}
                value={{ street: '123 Main St' }}
                onChange={handleChange}
                errors={{}}
                referenceData={referenceData}
            />
        );

        const cityInput = screen.getByPlaceholderText('City');
        await user.type(cityInput, 'P');

        expect(handleChange).toHaveBeenCalledWith({
            street: '123 Main St',
            city: 'P',
        });
    });

    it('shows error indicator when fields have errors', () => {
        const errors = {
            clinic_address_street: 'Street is required',
        };

        render(
            <AddressGroup
                question={baseQuestion}
                value={{}}
                onChange={() => {}}
                errors={errors}
                referenceData={referenceData}
            />
        );

        expect(screen.getByText('Please complete all required address fields')).toBeInTheDocument();
    });

    it('does not show error indicator when no errors', () => {
        render(
            <AddressGroup
                question={baseQuestion}
                value={{ street: '123 Main', city: 'Portland', state: 'OR', zip: '97201' }}
                onChange={() => {}}
                errors={{}}
                referenceData={referenceData}
            />
        );

        expect(screen.queryByText('Please complete all required address fields')).not.toBeInTheDocument();
    });
});
