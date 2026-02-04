import { memo } from 'react';

/**
 * CheckboxField - Single checkbox (memoized)
 */
const CheckboxField = memo(function CheckboxField({ question, value, onChange, error }) {
    return (
        <div className="mb-4">
            <label className="flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={value || false}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                    {question.label}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                </span>
            </label>
            {question.help_text && (
                <p className="mt-1 text-sm text-gray-500 ml-6">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

export default CheckboxField;
