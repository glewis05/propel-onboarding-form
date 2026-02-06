import { createClient } from '@supabase/supabase-js';
import { debugLog } from '../utils/debug';

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================
// Supabase client for database operations:
// - Fetching programs from the database
// - Saving onboarding submissions
// - Auto-saving drafts by email
// - Restoring sessions by email

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

debugLog('[Supabase] Client initialized');

// ============================================================================
// SUPABASE HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch active programs from Supabase for the dropdown.
 * Falls back to reference-data.json if Supabase fails.
 *
 * @returns {Promise<Array>} Array of program objects {value, display_name, program_id}
 */
export async function fetchProgramsFromSupabase() {
    try {
        // Exclude Platform and Discover — not selectable for clinic onboarding
        const { data, error } = await supabase
            .from('programs')
            .select('program_id, name, prefix')
            .eq('status', 'Active')
            .not('name', 'in', '("Platform","Discover")')
            .order('name');

        if (error) throw error;

        // Transform to match reference-data format
        const programs = data.map(p => ({
            value: p.prefix || p.program_id,
            display_name: p.name,
            program_id: p.program_id
        }));

        debugLog('[Supabase] Fetched programs:', programs.length);
        return programs;
    } catch (error) {
        console.error('[Supabase] Error fetching programs:', error);
        return null; // Will trigger fallback to reference-data.json
    }
}

/**
 * Save or update an onboarding submission to Supabase.
 *
 * @param {Object} params - Submission parameters
 * @param {string} params.submitter_email - Email of the submitter
 * @param {string} params.submitter_name - Name of the submitter
 * @param {string} params.program_id - Selected program ID
 * @param {Object} params.form_data - Complete form data as JSON
 * @param {string} params.status - 'draft' or 'submitted'
 * @param {string} params.user_id - Optional user ID for authenticated users
 * @param {string} params.submission_id - Optional existing submission ID for updates
 * @returns {Promise<Object>} The saved submission record
 */
export async function saveOnboardingSubmission({ submitter_email, submitter_name, program_id, form_data, status, user_id = null, submission_id = null }) {
    try {
        // If no user_id provided, try to get it from the current session
        if (!user_id) {
            const { data: { user } } = await supabase.auth.getUser();
            user_id = user?.id || null;
        }

        // Check if we should update an existing submission
        let existing = null;

        // First, use the provided submission_id if available
        if (submission_id) {
            // Verify the submission exists and is not already submitted (locked)
            const { data: existingRecord } = await supabase
                .from('onboarding_submissions')
                .select('submission_id, submission_status')
                .eq('submission_id', submission_id)
                .maybeSingle();

            if (existingRecord?.submission_status === 'submitted' && status === 'draft') {
                // Don't overwrite a submitted form with draft data
                debugLog('[Supabase] Submission already submitted, creating new draft instead');
                existing = null; // Force new record creation
            } else {
                existing = existingRecord;
            }
        }
        // Otherwise, look for existing draft by user_id
        else if (user_id) {
            const { data } = await supabase
                .from('onboarding_submissions')
                .select('submission_id')
                .eq('user_id', user_id)
                .eq('submission_status', 'draft')
                .limit(1)
                .maybeSingle();
            existing = data;
        }
        // For manual auth (no user_id), look for existing draft by email
        else if (submitter_email) {
            const { data } = await supabase
                .from('onboarding_submissions')
                .select('submission_id')
                .eq('submitter_email', submitter_email)
                .eq('submission_status', 'draft')
                .limit(1)
                .maybeSingle();
            existing = data;
        }

        const submissionData = {
            submitter_email,
            submitter_name,
            program_prefix: program_id,
            form_data,
            submission_status: status,
            updated_at: new Date().toISOString(),
            user_id
        };

        if (status === 'submitted') {
            submissionData.submitted_at = new Date().toISOString();
        }

        let result;

        if (existing?.submission_id) {
            // Update existing draft
            const { data, error } = await supabase
                .from('onboarding_submissions')
                .update(submissionData)
                .eq('submission_id', existing.submission_id)
                .select()
                .single();

            if (error) throw error;
            result = data;
            debugLog('[Supabase] Updated submission:', result.submission_id);
        } else {
            // Insert new submission
            const { data, error } = await supabase
                .from('onboarding_submissions')
                .insert(submissionData)
                .select()
                .single();

            if (error) throw error;
            result = data;
            debugLog('[Supabase] Created submission:', result.submission_id);
        }

        return result;
    } catch (error) {
        console.error('[Supabase] Error saving submission:', error);
        throw error;
    }
}

/**
 * Fetch recent drafts for the Resume picker, filtered by submitter email.
 * Returns drafts from the last 14 days with clinic name, program, and last updated.
 *
 * @param {string} email - Submitter email to filter by
 * @returns {Promise<Array>} Array of draft objects for display in picker
 */
export async function fetchRecentDrafts(email) {
    try {
        if (!email) {
            debugLog('[Supabase] No email provided, returning empty drafts');
            return [];
        }

        // Calculate date 14 days ago
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const { data, error } = await supabase
            .from('onboarding_submissions')
            .select('submission_id, submitter_email, form_data, program_prefix, updated_at')
            .eq('submission_status', 'draft')
            .ilike('submitter_email', email)
            .gte('updated_at', fourteenDaysAgo.toISOString())
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Transform data for display - extract clinic name from form_data
        const drafts = (data || []).map(draft => ({
            submission_id: draft.submission_id,
            submitter_email: draft.submitter_email,
            clinic_name: draft.form_data?.formData?.clinic_name || draft.form_data?.clinic_name || 'Unnamed Clinic',
            program: draft.program_prefix || draft.form_data?.formData?.program || draft.form_data?.program || 'Unknown',
            updated_at: draft.updated_at,
            form_data: draft.form_data
        }));

        debugLog('[Supabase] Fetched recent drafts:', drafts.length);
        return drafts;
    } catch (error) {
        console.error('[Supabase] Error fetching recent drafts:', error);
        return [];
    }
}

/**
 * Fetch drafts for the current authenticated user only.
 * Uses RLS to filter by user_id automatically.
 *
 * @returns {Promise<Array>} Array of draft objects for the authenticated user
 */
export async function fetchUserDrafts() {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            debugLog('[Supabase] No authenticated user, returning empty drafts');
            return [];
        }

        const { data, error } = await supabase
            .from('onboarding_submissions')
            .select('submission_id, form_data, program_prefix, updated_at')
            .eq('submission_status', 'draft')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Transform data for display
        const drafts = (data || []).map(draft => ({
            submission_id: draft.submission_id,
            clinic_name: draft.form_data?.formData?.clinic_name || draft.form_data?.clinic_name || 'Unnamed Clinic',
            program: draft.program_prefix || draft.form_data?.formData?.program || draft.form_data?.program || 'Unknown',
            updated_at: draft.updated_at,
            form_data: draft.form_data
        }));

        debugLog('[Supabase] Fetched user drafts:', drafts.length);
        return drafts;
    } catch (error) {
        console.error('[Supabase] Error fetching user drafts:', error);
        return [];
    }
}

/**
 * Verify if an email matches any contact in the saved form data.
 * Checks clinic champion, primary contact, genetic counselor, and other contacts.
 * Excludes the submitter's own email — verification requires knowing a contact
 * email that was entered into the draft (lightweight identity check).
 *
 * @param {Object} formData - The saved form data
 * @param {string} email - Email to verify (a contact email, not the submitter's)
 * @param {string} [submitterEmail] - The submitter's email to exclude from valid matches
 * @returns {boolean} True if email matches a contact
 */
export function verifyEmailForDraft(formData, email, submitterEmail) {
    if (!formData || !email) return false;

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedSubmitter = submitterEmail?.toLowerCase().trim();

    // Reject if the user enters their own submitter email
    if (normalizedSubmitter && normalizedEmail === normalizedSubmitter) {
        debugLog('[Verify] Rejected — entered own submitter email');
        return false;
    }

    // Get the actual form data (handle both nested and flat structures)
    const data = formData.formData || formData;

    // List of contact fields to check
    const contactFields = [
        'clinic_champion',
        'contact_primary',
        'genetic_counselor',
        'contact_secondary',
        'contact_it',
        'contact_lab',
        'stakeholder_champion',
        'stakeholder_executive',
        'stakeholder_it_director'
    ];

    // Check each contact field for matching email
    for (const field of contactFields) {
        const contact = data[field];
        if (contact?.email && contact.email.toLowerCase().trim() === normalizedEmail) {
            debugLog('[Verify] Email matched field:', field);
            return true;
        }
    }

    debugLog('[Verify] Email did not match any contact');
    return false;
}

/**
 * Load an existing draft by submitter email.
 *
 * @param {string} email - Submitter's email
 * @returns {Promise<Object|null>} The draft submission or null if not found
 */
export async function loadDraftByEmail(email) {
    try {
        const { data, error } = await supabase
            .from('onboarding_submissions')
            .select('*')
            .eq('submitter_email', email)
            .eq('submission_status', 'draft')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            debugLog('[Supabase] Found draft for email:', email);
            return data;
        }

        return null;
    } catch (error) {
        console.error('[Supabase] Error loading draft:', error);
        return null;
    }
}
