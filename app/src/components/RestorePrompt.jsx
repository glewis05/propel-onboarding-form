/**
 * RestorePrompt - Modal shown when saved data is found on load
 */
function RestorePrompt({ savedData, onRestore, onDiscard }) {
    const savedDate = savedData?.savedAt ? new Date(savedData.savedAt) : null;
    const formattedDate = savedDate ? savedDate.toLocaleString() : 'Unknown';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-propel-light rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-propel-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-propel-navy mb-2">
                        Resume Previous Session?
                    </h3>
                    <p className="text-gray-600">
                        We found a saved draft from {formattedDate}. Would you like to continue where you left off?
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onDiscard}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Start Fresh
                    </button>
                    <button
                        onClick={onRestore}
                        className="flex-1 px-4 py-2 bg-propel-teal text-white rounded-lg hover:bg-opacity-90 transition-colors"
                    >
                        Resume Draft
                    </button>
                </div>
            </div>
        </div>
    );
}

export default RestorePrompt;
