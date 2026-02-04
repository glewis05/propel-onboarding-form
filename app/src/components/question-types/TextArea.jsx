import { memo } from 'react';

/**
 * TextArea - Multi-line text input (memoized)
 */
const TextArea = memo(function TextArea({ question, value, onChange, error }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={question.placeholder || ''}
                rows={question.rows || 4}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                    error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
            />
            {question.help_text && (
                <p className="mt-1 text-sm text-gray-500">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

export default TextArea;
