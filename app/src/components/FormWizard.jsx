import { useState, useEffect, useRef, useMemo } from 'react';
import { STORAGE_KEY } from '../constants';
import { validateStep, evaluateCondition } from '../utils/validation';
import { debugLog } from '../utils/debug';
import { saveOnboardingSubmission } from '../services/supabase';
import { useAuth } from './auth/AuthProvider';
import RestorePrompt from './RestorePrompt';
import ResumeModal from './ResumeModal';
import SaveStatusBar from './SaveStatusBar';
import ProgressIndicator from './ProgressIndicator';
import StepRenderer from './StepRenderer';
import ReviewStep from './ReviewStep';
import AuthButton from './auth/AuthButton';

/**
 * FormWizard - Main component that orchestrates step navigation
 */
function FormWizard({ formDefinition }) {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [attemptedNext, setAttemptedNext] = useState(false);

    // Highest completed step tracking
    const [highestCompletedStep, setHighestCompletedStep] = useState(0);

    // Save/restore state
    const [lastSaved, setLastSaved] = useState(null);
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [pendingSavedData, setPendingSavedData] = useState(null);

    // Supabase draft management
    const [supabaseDraftId, setSupabaseDraftId] = useState(null);
    const [supabaseSaveStatus, setSupabaseSaveStatus] = useState(null);

    // Resume modal state
    const [showResumeModal, setShowResumeModal] = useState(false);

    // Ref to track when a resume operation is in progress
    const resumeInProgressRef = useRef(false);

    // Return to summary flag
    const [returnToSummary, setReturnToSummary] = useState(false);

    const { steps: allSteps, composite_types } = formDefinition;

    // Filter steps by show_when conditions (e.g., NCCN step only for P4M/PR4M)
    const visibleSteps = useMemo(() =>
        allSteps.filter(step => !step.show_when || evaluateCondition(step.show_when, formData)),
        [allSteps, formData]
    );

    const currentStepDef = visibleSteps[currentStep];
    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === visibleSteps.length - 1;
    const isReviewStep = currentStepDef.is_review_step;

    debugLog(`[FormWizard] Current step: ${currentStep} (${currentStepDef.title})`);

    // Tab visibility state
    const [isTabVisible, setIsTabVisible] = useState(!document.hidden);

    useEffect(() => {
        const handleVisibilityChange = () => {
            const visible = !document.hidden;
            setIsTabVisible(visible);
            debugLog(`[FormWizard] Tab visibility changed: ${visible ? 'visible' : 'hidden'}`);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Safety clamp: if visible steps shrink (e.g., program change hides NCCN step),
    // ensure currentStep doesn't point beyond the visible list
    useEffect(() => {
        if (currentStep >= visibleSteps.length) {
            setCurrentStep(visibleSteps.length - 1);
        }
    }, [visibleSteps.length, currentStep]);

    // Reset highestCompletedStep when program changes to prevent stale indices
    const programRef = useRef(formData.program);
    useEffect(() => {
        if (formData.program && formData.program !== programRef.current) {
            programRef.current = formData.program;
            setHighestCompletedStep(currentStep);
        }
    }, [formData.program, currentStep]);

    // Debounced auto-save to localStorage
    useEffect(() => {
        if (Object.keys(formData).length === 0) return;
        if (!isTabVisible) {
            debugLog('[FormWizard] Tab hidden, skipping auto-save');
            return;
        }

        const timeoutId = setTimeout(() => {
            try {
                const saveData = {
                    formData,
                    currentStep,
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
                setLastSaved(saveData.savedAt);
                debugLog('[FormWizard] Auto-saved:', saveData.savedAt);
            } catch (e) {
                if (e.name === 'QuotaExceededError' || e.code === 22) {
                    console.warn('[FormWizard] LocalStorage quota exceeded, attempting cleanup...');
                    try {
                        localStorage.removeItem(STORAGE_KEY);
                        const saveData = {
                            formData,
                            currentStep,
                            savedAt: new Date().toISOString()
                        };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
                        setLastSaved(saveData.savedAt);
                    } catch (retryError) {
                        console.error('[FormWizard] Auto-save failed even after cleanup:', retryError);
                    }
                } else {
                    console.error('[FormWizard] Error auto-saving:', e);
                }
            }
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [formData, currentStep, isTabVisible]);

    // Supabase auto-save
    useEffect(() => {
        // Use authenticated user's email first, then fall back to form fields
        const submitterEmail = user?.email
            || formData.submitter_email
            || formData.clinic_champion?.email
            || formData.contact_primary?.email
            || formData.genetic_counselor?.email;

        if (!submitterEmail || Object.keys(formData).length === 0 || !isTabVisible) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            setSupabaseSaveStatus('saving');

            try {
                const submitterName = formData.submitter_name
                    || formData.clinic_champion?.name
                    || formData.contact_primary?.name
                    || '';

                const result = await saveOnboardingSubmission({
                    submitter_email: submitterEmail,
                    submitter_name: submitterName,
                    program_id: formData.program || '',
                    form_data: { formData, currentStep },
                    status: 'draft',
                    user_id: user?.id,
                    submission_id: supabaseDraftId
                });

                setSupabaseDraftId(result.submission_id);
                setSupabaseSaveStatus('saved');
                debugLog('[Supabase] Draft auto-saved:', result.submission_id);

                setTimeout(() => setSupabaseSaveStatus(null), 2000);
            } catch (error) {
                console.error('[Supabase] Draft auto-save failed:', error);
                setSupabaseSaveStatus('error');
            }
        }, 2000);

        return () => clearTimeout(timeoutId);
    }, [formData, currentStep, isTabVisible, user, supabaseDraftId]);

    // Manual retry for cloud sync
    const handleRetryCloudSync = async () => {
        // Use authenticated user's email first, then fall back to form fields
        const submitterEmail = user?.email
            || formData.submitter_email
            || formData.clinic_champion?.email
            || formData.contact_primary?.email
            || formData.genetic_counselor?.email;

        if (!submitterEmail) return;

        setSupabaseSaveStatus('saving');

        try {
            const submitterName = formData.submitter_name
                || formData.clinic_champion?.name
                || formData.contact_primary?.name
                || '';

            const result = await saveOnboardingSubmission({
                submitter_email: submitterEmail,
                submitter_name: submitterName,
                program_id: formData.program || '',
                form_data: { formData, currentStep },
                status: 'draft',
                user_id: user?.id,
                submission_id: supabaseDraftId
            });

            setSupabaseDraftId(result.submission_id);
            setSupabaseSaveStatus('saved');
            debugLog('[Supabase] Draft retry-saved:', result.submission_id);

            setTimeout(() => setSupabaseSaveStatus(null), 2000);
        } catch (error) {
            console.error('[Supabase] Draft retry-save failed:', error);
            setSupabaseSaveStatus('error');
        }
    };

    // Restore handlers
    const handleRestore = () => {
        resumeInProgressRef.current = true;

        if (pendingSavedData) {
            const restoredStep = pendingSavedData.currentStep || 0;
            setFormData(pendingSavedData.formData || {});
            setCurrentStep(restoredStep);
            setHighestCompletedStep(restoredStep);
            setLastSaved(pendingSavedData.savedAt);

            if (pendingSavedData.source === 'supabase' && pendingSavedData.submission_id) {
                setSupabaseDraftId(pendingSavedData.submission_id);
            }
        }
        setShowRestorePrompt(false);
        setPendingSavedData(null);
    };

    const handleDiscard = () => {
        localStorage.removeItem(STORAGE_KEY);
        setShowRestorePrompt(false);
        setPendingSavedData(null);
    };

    // Resume modal restore handler
    const handleResumeRestore = (restoredData) => {
        debugLog('[Resume] Restoring draft:', restoredData);
        resumeInProgressRef.current = true;

        if (restoredData.formData) {
            setFormData(restoredData.formData);
        }

        const stepToRestore = restoredData.currentStep || 0;
        setCurrentStep(stepToRestore);
        setHighestCompletedStep(stepToRestore);

        if (restoredData.submission_id) {
            setSupabaseDraftId(restoredData.submission_id);
        }

        setLastSaved(new Date(restoredData.savedAt || Date.now()));
        setShowResumeModal(false);

        debugLog('[Resume] Draft restored successfully');
    };

    // Save draft to file
    const handleSaveDraft = () => {
        const saveData = {
            formData,
            currentStep,
            savedAt: new Date().toISOString(),
            version: formDefinition.version
        };
        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `propel-draft-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Load draft from file
    const handleLoadDraft = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.formData) {
                    const loadedStep = data.currentStep || 0;
                    setFormData(data.formData);
                    setCurrentStep(loadedStep);
                    setHighestCompletedStep(loadedStep);
                    setLastSaved(new Date().toISOString());
                    setAttemptedNext(false);
                    setErrors({});
                }
            } catch (err) {
                alert('Invalid draft file. Please select a valid JSON file.');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    // Start over
    const handleStartOver = () => {
        if (confirm('Are you sure you want to start over? All your progress will be lost.')) {
            localStorage.removeItem(STORAGE_KEY);
            setFormData({});
            setCurrentStep(0);
            setLastSaved(null);
            setAttemptedNext(false);
            setErrors({});
        }
    };

    // Get stakeholder ordering provider helper
    const getStakeholderOrderingProvider = (data) => {
        const stakeholderFields = [
            'stakeholder_champion',
            'stakeholder_executive',
            'stakeholder_it_director'
        ];

        for (const fieldId of stakeholderFields) {
            const stakeholder = data[fieldId];
            if (stakeholder && stakeholder.is_ordering_provider === true && stakeholder.name) {
                debugLog(`[FormWizard] Found stakeholder ordering provider: ${stakeholder.name}`);
                return {
                    provider_name: stakeholder.name,
                    provider_title: stakeholder.title || '',
                    provider_email: stakeholder.email || '',
                    provider_phone: stakeholder.phone || '',
                    provider_npi: '',
                    provider_office_address: {},
                    provider_specialty: '',
                    _pre_filled_from_stakeholder: true,
                    _stakeholder_source: fieldId
                };
            }
        }
        return null;
    };

    // Auto-populate ordering provider when navigating to that step
    const autoPopulateOrderingProvider = (targetStepIndex) => {
        const targetStep = visibleSteps[targetStepIndex];
        if (targetStep?.step_id !== 'ordering_providers') return;

        const stakeholderProvider = getStakeholderOrderingProvider(formData);
        if (!stakeholderProvider) return;

        const existingProviders = formData.ordering_providers || [];
        const firstProvider = existingProviders[0];

        // Only auto-populate if no provider exists or first provider was auto-filled
        const shouldAutoPopulate = (
            !firstProvider ||
            !firstProvider.provider_name ||
            firstProvider._pre_filled_from_stakeholder === true
        );

        if (shouldAutoPopulate) {
            debugLog('[FormWizard] Auto-populating ordering provider from stakeholder');
            const newProviders = [stakeholderProvider, ...existingProviders.slice(1)];
            setFormData(prev => ({ ...prev, ordering_providers: newProviders }));
        }
    };

    const handleNext = () => {
        setAttemptedNext(true);

        const validation = validateStep(currentStepDef, formData, composite_types);
        setErrors(validation.errors);

        if (validation.isValid) {
            debugLog('[FormWizard] Step valid, moving to next');

            // Return to summary after edit
            if (returnToSummary) {
                debugLog('[FormWizard] Returning to Summary after edit');
                setReturnToSummary(false);
                setCurrentStep(visibleSteps.length - 1);
                setAttemptedNext(false);
                setErrors({});
                window.scrollTo(0, 0);
                return;
            }

            const nextStep = Math.min(currentStep + 1, visibleSteps.length - 1);

            // Auto-populate ordering provider from stakeholder (if navigating to that step)
            autoPopulateOrderingProvider(nextStep);

            setCurrentStep(nextStep);
            setHighestCompletedStep(prev => Math.max(prev, nextStep));
            setAttemptedNext(false);
            setErrors({});
            window.scrollTo(0, 0);
        } else {
            debugLog('[FormWizard] Step invalid, errors:', validation.errors);
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
        setAttemptedNext(false);
        setErrors({});
        window.scrollTo(0, 0);
    };

    const handleStepClick = (index) => {
        if (index <= highestCompletedStep) {
            autoPopulateOrderingProvider(index);
            setCurrentStep(index);
            setAttemptedNext(false);
            setErrors({});
            window.scrollTo(0, 0);
        }
    };

    const handleEditFromSummary = (formDefIndex) => {
        const targetStepId = allSteps[formDefIndex].step_id;
        const visibleIndex = visibleSteps.findIndex(s => s.step_id === targetStepId);
        if (visibleIndex === -1) return;
        autoPopulateOrderingProvider(visibleIndex);
        setReturnToSummary(true);
        setCurrentStep(visibleIndex);
        setAttemptedNext(false);
        setErrors({});
        window.scrollTo(0, 0);
    };

    const handleFormChange = (newData) => {
        setFormData(newData);

        if (attemptedNext) {
            const validation = validateStep(currentStepDef, newData, composite_types);
            setErrors(validation.errors);
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
            {/* Restore prompt modal */}
            {showRestorePrompt && (
                <RestorePrompt
                    savedData={pendingSavedData}
                    onRestore={handleRestore}
                    onDiscard={handleDiscard}
                />
            )}

            {/* Resume Modal */}
            {showResumeModal && (
                <ResumeModal
                    onRestore={handleResumeRestore}
                    onClose={() => setShowResumeModal(false)}
                />
            )}

            {/* Header */}
            <div className="bg-propel-navy rounded-lg p-4 sm:p-6 mb-4 sm:mb-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg sm:text-2xl font-bold text-white">
                        {formDefinition.title}
                    </h1>
                    <AuthButton />
                </div>
            </div>

            {/* Resume Form Button */}
            <div className="flex justify-center mb-4 sm:mb-6">
                <button
                    type="button"
                    onClick={() => setShowResumeModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-propel-teal text-propel-teal rounded-lg font-medium hover:bg-propel-teal hover:text-white transition-colors shadow-sm"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Resume Your Onboarding Form
                </button>
            </div>

            {/* Save status bar */}
            <SaveStatusBar
                lastSaved={lastSaved}
                onSaveDraft={handleSaveDraft}
                onLoadDraft={handleLoadDraft}
                onStartOver={handleStartOver}
                supabaseSaveStatus={supabaseSaveStatus}
                onRetryCloudSync={handleRetryCloudSync}
            />

            {/* Progress indicator */}
            <ProgressIndicator
                steps={visibleSteps}
                currentStep={currentStep}
                highestCompletedStep={highestCompletedStep}
                onStepClick={handleStepClick}
            />

            {/* Current step card */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
                {/* Step header - hidden on mobile since ProgressIndicator shows it */}
                <div className="hidden sm:block mb-6">
                    <h2 className="text-xl font-semibold text-propel-navy">
                        {currentStepDef.title}
                    </h2>
                    {currentStepDef.description && (
                        <p className="text-gray-600 mt-1">{currentStepDef.description}</p>
                    )}
                </div>
                {/* Mobile: Show description only */}
                {currentStepDef.description && (
                    <div className="sm:hidden mb-4">
                        <p className="text-sm text-gray-600">{currentStepDef.description}</p>
                    </div>
                )}

                {/* Step content */}
                {isReviewStep ? (
                    <ReviewStep
                        formData={formData}
                        formDefinition={formDefinition}
                        onEdit={handleEditFromSummary}
                    />
                ) : (
                    <StepRenderer
                        step={currentStepDef}
                        formData={formData}
                        onChange={handleFormChange}
                        errors={errors}
                    />
                )}
            </div>

            {/* Navigation buttons */}
            <div className="mt-6 sm:mt-8">
                <div className="flex gap-3">
                    {!isFirstStep && (
                        <button
                            type="button"
                            onClick={handlePrevious}
                            className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2 rounded-lg font-medium text-base sm:text-sm transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                            Previous
                        </button>
                    )}

                    {!isReviewStep && (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="flex-1 sm:flex-none px-4 sm:px-6 py-3 sm:py-2 bg-propel-teal text-white rounded-lg font-medium text-base sm:text-sm hover:bg-opacity-90 transition-colors"
                        >
                            {returnToSummary ? 'Save & Return to Summary' : (isLastStep ? 'Review' : 'Next')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FormWizard;
