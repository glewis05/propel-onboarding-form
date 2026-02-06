import { useState, useEffect } from 'react';
import { fetchRecentDrafts, verifyEmailForDraft } from '../services/supabase';
import { useAuth } from './auth/AuthProvider';

/**
 * ResumeModal - Allows users to select and resume a previous draft
 * Shows only drafts associated with the authenticated user's email
 */
function ResumeModal({ onRestore, onClose }) {
    const { user } = useAuth();
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [verifyEmail, setVerifyEmail] = useState('');
    const [verifyError, setVerifyError] = useState('');
    const [verifying, setVerifying] = useState(false);

    // Fetch recent drafts on mount, filtered by submitter email at the DB level
    useEffect(() => {
        const userEmail = user?.email;
        fetchRecentDrafts(userEmail).then(data => {
            setDrafts(data);
            setLoading(false);
        });
    }, [user]);

    // Format date for display
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    // Get program display name
    const getProgramName = (prefix) => {
        const programs = {
            'P4M': 'Prevention4ME',
            'PR4M': 'Precision4ME',
            'GRX': 'GenoRx'
        };
        return programs[prefix] || prefix;
    };

    // Handle draft selection — always require contact email verification
    const handleSelectDraft = (draft) => {
        setSelectedDraft(draft);
        setVerifyEmail('');
        setVerifyError('');
    };

    // Handle email verification — user must provide a contact email from the draft (not their own)
    const handleVerify = () => {
        setVerifying(true);
        setVerifyError('');

        const submitterEmail = selectedDraft.submitter_email || user?.email;
        if (verifyEmailForDraft(selectedDraft.form_data, verifyEmail, submitterEmail)) {
            // Success - restore the draft
            onRestore({
                formData: selectedDraft.form_data.formData || selectedDraft.form_data,
                currentStep: selectedDraft.form_data.currentStep || 0,
                savedAt: selectedDraft.updated_at,
                source: 'supabase',
                submission_id: selectedDraft.submission_id
            });
        } else {
            setVerifyError('Please enter an email address of a contact you added to this form (not your own sign-in email).');
            setVerifying(false);
        }
    };

    // Handle back to list
    const handleBack = () => {
        setSelectedDraft(null);
        setVerifyEmail('');
        setVerifyError('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-propel-navy">
                            {selectedDraft ? 'Verify Your Identity' : 'Resume Your Form'}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {!selectedDraft && (
                        <p className="text-gray-600 mt-2">
                            Select your clinic to continue where you left off.
                        </p>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-propel-teal"></div>
                        </div>
                    ) : selectedDraft ? (
                        /* Email verification form */
                        <div>
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-500">Selected clinic:</p>
                                <p className="font-semibold text-propel-navy">{selectedDraft.clinic_name}</p>
                                <p className="text-sm text-gray-600">{getProgramName(selectedDraft.program)}</p>
                            </div>

                            <p className="text-gray-600 mb-4">
                                To verify your identity, enter one of the contact email addresses you previously added to this form.
                            </p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Email From This Form
                                </label>
                                <input
                                    type="email"
                                    value={verifyEmail}
                                    onChange={(e) => setVerifyEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && verifyEmail && handleVerify()}
                                    placeholder="name@clinic.org"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                                    autoFocus
                                />
                            </div>

                            {verifyError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-red-700">{verifyError}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleVerify}
                                    disabled={!verifyEmail || verifying}
                                    className="flex-1 px-4 py-2 bg-propel-teal text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {verifying ? 'Verifying...' : 'Continue'}
                                </button>
                            </div>
                        </div>
                    ) : drafts.length === 0 ? (
                        /* No drafts found */
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-gray-600 mb-2">No recent drafts found</p>
                            <p className="text-sm text-gray-500">
                                Drafts are available for 14 days after the last edit.
                            </p>
                        </div>
                    ) : (
                        /* Draft list */
                        <div className="space-y-2">
                            {drafts.map((draft) => (
                                <button
                                    key={draft.submission_id}
                                    onClick={() => handleSelectDraft(draft)}
                                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-propel-teal hover:bg-propel-light transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-propel-navy">
                                                {draft.clinic_name}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {getProgramName(draft.program)}
                                            </p>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {formatDate(draft.updated_at)}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - only show close button when viewing list */}
                {!selectedDraft && !loading && (
                    <div className="p-6 border-t border-gray-200">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Start New Form Instead
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ResumeModal;
