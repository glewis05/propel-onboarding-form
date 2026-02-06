/**
 * ProviderFilterList - Repeatable list of providers with first/last name
 * Used for extract filtering - allows adding multiple providers to filter by.
 * Renders as a mini-repeatable within a non-repeatable step.
 */
function ProviderFilterList({ question, value, onChange, errors }) {
    // Value is an array of {first_name, last_name} objects
    const providers = value || [];

    const handleAddProvider = () => {
        onChange([...providers, { first_name: '', last_name: '' }]);
    };

    const handleRemoveProvider = (index) => {
        if (providers.length > (question.repeatable_config?.min_items || 0)) {
            onChange(providers.filter((_, i) => i !== index));
        }
    };

    const handleProviderChange = (index, field, fieldValue) => {
        const newProviders = [...providers];
        newProviders[index] = {
            ...newProviders[index],
            [field]: fieldValue
        };
        onChange(newProviders);
    };

    const config = question.repeatable_config || {};
    const minItems = config.min_items || 0;
    const maxItems = config.max_items || 20;
    const hasError = !!errors[question.question_id];

    return (
        <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${hasError ? 'text-red-600' : 'text-gray-700'}`}>
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-3">{question.help_text}</p>
            )}

            {/* List of providers */}
            <div className={`space-y-3 p-3 rounded-lg border-2 ${hasError ? 'border-red-300 bg-red-50' : 'border-transparent'}`}>
                {providers.map((provider, index) => (
                    <div key={index} className={`flex gap-3 items-start p-3 bg-white rounded-lg border ${hasError ? 'border-red-200' : 'border-gray-200'}`}>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    First Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={provider.first_name || ''}
                                    onChange={(e) => handleProviderChange(index, 'first_name', e.target.value)}
                                    placeholder="Jane"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Last Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={provider.last_name || ''}
                                    onChange={(e) => handleProviderChange(index, 'last_name', e.target.value)}
                                    placeholder="Smith"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal text-sm"
                                />
                            </div>
                        </div>
                        {providers.length > minItems && (
                            <button
                                type="button"
                                onClick={() => handleRemoveProvider(index)}
                                className="px-2 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove provider"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                ))}

                {/* Empty state */}
                {providers.length === 0 && (
                    <div className={`text-center py-4 text-sm ${hasError ? 'text-red-600' : 'text-gray-500'}`}>
                        {hasError ? 'Please add at least one provider.' : 'No providers added yet. Click below to add one.'}
                    </div>
                )}

                {/* Add button */}
                {providers.length < maxItems && (
                    <button
                        type="button"
                        onClick={handleAddProvider}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-propel-teal hover:text-propel-teal hover:bg-propel-light transition-colors text-sm"
                    >
                        <span className="flex items-center justify-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {config.add_button_text || 'Add Provider'}
                        </span>
                    </button>
                )}
            </div>

            {/* Validation error */}
            {errors[question.question_id] && (
                <p className="mt-2 text-sm text-red-600">{errors[question.question_id]}</p>
            )}
        </div>
    );
}

export default ProviderFilterList;
