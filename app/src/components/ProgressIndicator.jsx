/**
 * ProgressIndicator - Shows the current step and overall progress
 */
function ProgressIndicator({ steps, currentStep, highestCompletedStep, onStepClick }) {
    const currentStepTitle = steps[currentStep]?.title || '';
    // Use highestCompletedStep to determine which steps are clickable
    const maxClickableStep = highestCompletedStep ?? currentStep;

    // Step abbreviations for the progress indicator
    const stepAbbreviations = {
        "Program Selection": "Program",
        "Clinic Information": "Clinic",
        "Satellite Locations": "Locations",
        "Contacts": "Contacts",
        "Key Stakeholders": "Stake-holders",
        "Lab Configuration": "Lab Config",
        "Additional Test Panels": "Add'l Tests",
        "Ordering Providers": "Providers",
        "NCCN Rule Changes": "NCCN Rules",
        "Extract Filtering": "Filtering",
        "Review & Download": "Review"
    };

    // Get abbreviated title for compact display
    const getShortTitle = (title) => stepAbbreviations[title] || title;

    return (
        <div className="mb-4 sm:mb-8">
            {/* Mobile: Simple text indicator with current step title */}
            <div className="sm:hidden text-center py-3 px-4 bg-gray-50 rounded-lg mb-3">
                <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Step {currentStep + 1} of {steps.length}
                </span>
                <h2 className="text-base font-semibold text-propel-navy mt-1">{currentStepTitle}</h2>
            </div>

            {/* Desktop: Step counter above progress bar */}
            <div className="hidden sm:block text-center mb-4">
                <span className="text-sm text-gray-500">
                    Step {currentStep + 1} of {steps.length}
                </span>
            </div>

            {/* Progress bar - visible on all sizes, shows highest completed step */}
            <div className="relative">
                <div className="overflow-hidden h-2 mb-2 sm:mb-4 text-xs flex rounded bg-gray-200">
                    <div
                        style={{ width: `${((maxClickableStep + 1) / steps.length) * 100}%` }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-propel-teal transition-all duration-300"
                    />
                </div>
            </div>

            {/* Step labels - Desktop only (md+) */}
            <div className="hidden md:flex justify-between items-start gap-1">
                {steps.map((step, index) => (
                    <button
                        key={step.step_id}
                        onClick={() => onStepClick(index)}
                        disabled={index > maxClickableStep}
                        className={`flex flex-col items-center text-center flex-1 min-w-0 px-1 ${
                            index <= maxClickableStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                        }`}
                    >
                        {/* Step circle with number or checkmark */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 flex-shrink-0 ${
                            index <= maxClickableStep && index !== currentStep
                                ? 'bg-propel-teal text-white'
                                : index === currentStep
                                    ? 'bg-propel-teal text-white ring-4 ring-propel-light'
                                    : 'bg-gray-200 text-gray-500'
                        }`}>
                            {index <= maxClickableStep && index !== currentStep ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                index + 1
                            )}
                        </div>

                        {/* Step label - with proper text handling */}
                        <span className={`text-xs leading-tight whitespace-normal break-words w-full ${
                            index === currentStep ? 'text-propel-teal font-medium' : 'text-gray-500'
                        }`}>
                            {getShortTitle(step.title)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default ProgressIndicator;
