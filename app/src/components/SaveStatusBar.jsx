import { useState } from 'react';

/**
 * SaveStatusBar - Shows auto-save status with save/load/clear buttons and help section
 */
function SaveStatusBar({ lastSaved, onSaveDraft, onLoadDraft, onStartOver, supabaseSaveStatus, onRetryCloudSync }) {
    const [showHelp, setShowHelp] = useState(false);

    const formatTime = (date) => {
        if (!date) return null;
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4 sm:mb-6">
            {/* Main status bar - stack on mobile, row on desktop */}
            <div className="px-3 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                {/* Auto-save status - always visible */}
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600">
                    {/* Local save status */}
                    <div className="flex items-center gap-2">
                        {lastSaved ? (
                            <>
                                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Saved locally at {formatTime(lastSaved)}</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                <span className="hidden sm:inline">Your progress will be saved automatically</span>
                                <span className="sm:hidden">Auto-save enabled</span>
                            </>
                        )}
                    </div>

                    {/* Cloud save status (Supabase) */}
                    {supabaseSaveStatus && (
                        <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
                            {supabaseSaveStatus === 'saving' && (
                                <>
                                    <svg className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="hidden sm:inline text-blue-600">Syncing to cloud...</span>
                                </>
                            )}
                            {supabaseSaveStatus === 'saved' && (
                                <>
                                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                    </svg>
                                    <span className="hidden sm:inline text-green-600">Cloud saved</span>
                                </>
                            )}
                            {supabaseSaveStatus === 'error' && (
                                <>
                                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="text-amber-600 text-xs sm:text-sm">Cloud sync failed</span>
                                    {onRetryCloudSync && (
                                        <button
                                            onClick={onRetryCloudSync}
                                            className="ml-1 text-xs text-propel-teal hover:text-propel-teal/80 underline font-medium"
                                        >
                                            Retry
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Action buttons - wrap on mobile, smaller sizing */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={onSaveDraft}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                        title="Download draft as file"
                    >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden xs:inline">Save</span>
                        <span className="hidden sm:inline"> Draft</span>
                    </button>

                    <label className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 cursor-pointer">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span className="hidden xs:inline">Load</span>
                        <span className="hidden sm:inline"> Draft</span>
                        <input
                            type="file"
                            accept=".json"
                            onChange={onLoadDraft}
                            className="hidden"
                        />
                    </label>

                    <button
                        onClick={onStartOver}
                        className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-red-200 rounded-md text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                        title="Clear all data and start over"
                    >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">Start Over</span>
                        <span className="sm:hidden">Reset</span>
                    </button>

                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="p-1 sm:p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Help with saving"
                    >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Help section (expandable) - full width */}
            {showHelp && (
                <div className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border-t border-gray-200 text-xs sm:text-sm text-gray-600">
                    <h4 className="font-medium text-gray-700 mb-2">Saving Your Progress</h4>
                    <ul className="space-y-1.5">
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Local save:</span>
                            <span>Your responses are automatically saved to this browser. Resume later on the same device.</span>
                        </li>
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Cloud sync:</span>
                            <span>When signed in, your progress also syncs to the cloud so you can resume on any device.</span>
                        </li>
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Save Draft:</span>
                            <span>Downloads a file to transfer to another device or share with a colleague.</span>
                        </li>
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Load Draft:</span>
                            <span>Upload a previously saved draft file to continue editing.</span>
                        </li>
                        <li className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                            <span className="text-propel-teal font-bold whitespace-nowrap">Start Over:</span>
                            <span>Clears all saved data and starts fresh. This cannot be undone.</span>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
}

export default SaveStatusBar;
