import { memo } from 'react';

/**
 * SelectWithAlternates - Default selection with optional alternate choices (memoized)
 *
 * Renders a default selection dropdown with optional alternate choices.
 * Used when a clinic needs to select a primary option but may want to offer
 * patients/staff additional alternatives.
 *
 * Value structure: { default: string, offer_alternates: boolean, alternates: string[] }
 */
const SelectWithAlternates = memo(function SelectWithAlternates({ question, value, onChange, options, error }) {
    const currentValue = value || { default: '', offer_alternates: false, alternates: [] };

    // Handler for default selection change
    const handleDefaultChange = (e) => {
        onChange({
            ...currentValue,
            default: e.target.value,
            // Remove the new default from alternates if it was selected there
            alternates: currentValue.alternates.filter(alt => alt !== e.target.value)
        });
    };

    // Handler for "offer alternates" checkbox
    const handleOfferAlternatesChange = (e) => {
        onChange({
            ...currentValue,
            offer_alternates: e.target.checked,
            // Clear alternates if unchecking
            alternates: e.target.checked ? currentValue.alternates : []
        });
    };

    // Handler for alternate option checkbox toggle
    const handleAlternateToggle = (optionValue) => {
        const newAlternates = currentValue.alternates.includes(optionValue)
            ? currentValue.alternates.filter(v => v !== optionValue)
            : [...currentValue.alternates, optionValue];

        onChange({
            ...currentValue,
            alternates: newAlternates
        });
    };

    // Filter out the default value from alternate options
    const alternateOptions = options.filter(opt => opt.value !== currentValue.default);

    return (
        <div className="mb-4 space-y-3">
            {/* Default Selection Dropdown */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {question.label} (Default)
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                    value={currentValue.default}
                    onChange={handleDefaultChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                        error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                >
                    <option value="">Select...</option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.display_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Offer Alternates Checkbox */}
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id={`${question.question_id}_offer_alternates`}
                    checked={currentValue.offer_alternates}
                    onChange={handleOfferAlternatesChange}
                    className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                />
                <label
                    htmlFor={`${question.question_id}_offer_alternates`}
                    className="ml-2 text-sm text-gray-700"
                >
                    Offer additional options to staff
                </label>
            </div>

            {/* Alternate Options (shown only if offer_alternates is checked) */}
            {currentValue.offer_alternates && alternateOptions.length > 0 && (
                <div className="ml-6 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Select additional options to offer:
                    </p>
                    <div className="space-y-2">
                        {alternateOptions.map(opt => (
                            <div key={opt.value} className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`${question.question_id}_alt_${opt.value}`}
                                    checked={currentValue.alternates.includes(opt.value)}
                                    onChange={() => handleAlternateToggle(opt.value)}
                                    className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                                />
                                <label
                                    htmlFor={`${question.question_id}_alt_${opt.value}`}
                                    className="ml-2 text-sm text-gray-700"
                                >
                                    {opt.display_name}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Help Text */}
            {question.help_text && (
                <p className="text-sm text-gray-500">{question.help_text}</p>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

export default SelectWithAlternates;
