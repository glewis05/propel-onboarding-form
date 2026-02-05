import { describe, it, expect, vi } from 'vitest';
import { verifyEmailForDraft } from '../supabase';

// Mock the Supabase client module — verifyEmailForDraft is a pure function
// but the module-level createClient call needs to be mocked
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({})),
}));

vi.mock('../../utils/debug', () => ({
    debugLog: vi.fn(),
}));

// =============================================================================
// verifyEmailForDraft()
// =============================================================================
describe('verifyEmailForDraft', () => {
    it('returns false for null formData', () => {
        expect(verifyEmailForDraft(null, 'test@example.com')).toBe(false);
    });

    it('returns false for null email', () => {
        expect(verifyEmailForDraft({}, null)).toBe(false);
    });

    it('returns false for empty email', () => {
        expect(verifyEmailForDraft({}, '')).toBe(false);
    });

    it('matches clinic_champion email', () => {
        const formData = {
            clinic_champion: { name: 'Jane', email: 'jane@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'jane@clinic.org')).toBe(true);
    });

    it('matches contact_primary email', () => {
        const formData = {
            contact_primary: { name: 'Bob', email: 'bob@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'bob@clinic.org')).toBe(true);
    });

    it('matches genetic_counselor email', () => {
        const formData = {
            genetic_counselor: { email: 'gc@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'gc@clinic.org')).toBe(true);
    });

    it('matches contact_secondary email', () => {
        const formData = {
            contact_secondary: { email: 'secondary@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'secondary@clinic.org')).toBe(true);
    });

    it('matches contact_it email', () => {
        const formData = {
            contact_it: { email: 'it@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'it@clinic.org')).toBe(true);
    });

    it('matches contact_lab email', () => {
        const formData = {
            contact_lab: { email: 'lab@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'lab@clinic.org')).toBe(true);
    });

    it('matches stakeholder_champion email', () => {
        const formData = {
            stakeholder_champion: { email: 'stakeholder@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'stakeholder@clinic.org')).toBe(true);
    });

    it('matches stakeholder_executive email', () => {
        const formData = {
            stakeholder_executive: { email: 'exec@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'exec@clinic.org')).toBe(true);
    });

    it('matches stakeholder_it_director email', () => {
        const formData = {
            stakeholder_it_director: { email: 'itdir@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'itdir@clinic.org')).toBe(true);
    });

    it('matches submitter_email directly', () => {
        const formData = {
            submitter_email: 'submitter@clinic.org',
        };
        expect(verifyEmailForDraft(formData, 'submitter@clinic.org')).toBe(true);
    });

    // Case-insensitive matching
    it('matches case-insensitively', () => {
        const formData = {
            clinic_champion: { email: 'Jane@Clinic.ORG' },
        };
        expect(verifyEmailForDraft(formData, 'jane@clinic.org')).toBe(true);
    });

    it('trims whitespace from input email', () => {
        const formData = {
            clinic_champion: { email: 'jane@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, '  jane@clinic.org  ')).toBe(true);
    });

    // Nested formData structure
    it('handles nested formData.formData structure', () => {
        const formData = {
            formData: {
                clinic_champion: { email: 'jane@clinic.org' },
            },
        };
        expect(verifyEmailForDraft(formData, 'jane@clinic.org')).toBe(true);
    });

    // No matches
    it('returns false when email matches no contacts', () => {
        const formData = {
            clinic_champion: { email: 'jane@clinic.org' },
            contact_primary: { email: 'bob@clinic.org' },
        };
        expect(verifyEmailForDraft(formData, 'unknown@other.com')).toBe(false);
    });

    // Missing contact fields
    it('handles missing/null contact fields gracefully', () => {
        const formData = {
            clinic_champion: null,
            contact_primary: undefined,
        };
        expect(verifyEmailForDraft(formData, 'test@example.com')).toBe(false);
    });

    it('handles contacts with no email property', () => {
        const formData = {
            clinic_champion: { name: 'Jane' }, // no email
        };
        expect(verifyEmailForDraft(formData, 'test@example.com')).toBe(false);
    });
});
