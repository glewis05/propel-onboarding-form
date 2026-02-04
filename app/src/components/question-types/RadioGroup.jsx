import { memo } from 'react';

/**
 * RadioGroup - Radio button selection with cards (memoized)
 */
const RadioGroup = memo(function RadioGroup({ question, value, onChange, options, error }) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className={`space-y-2 ${error ? 'p-3 border-2 border-red-500 rounded-lg bg-red-50' : ''}`}>
                {options.map(opt => (
                    <label
                        key={opt.value}
                        className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${
                            value === opt.value
                                ? 'border-propel-teal bg-propel-light ring-2 ring-propel-teal'
                                : error
                                    ? 'border-red-300 bg-white hover:border-propel-teal hover:bg-gray-50'
                                    : 'border-gray-200 hover:border-propel-teal hover:bg-gray-50'
                        }`}
                    >
                        <input
                            type="radio"
                            name={question.question_id}
                            value={opt.value}
                            checked={value === opt.value}
                            onChange={() => onChange(opt.value)}
                            className="mt-1 h-4 w-4 text-propel-teal focus:ring-propel-teal"
                        />
                        <div className="ml-3">
                            <span className="font-medium text-gray-900">{opt.display_name}</span>
                            {opt.description && (
                                <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
                            )}
                        </div>
                    </label>
                ))}
            </div>
            {question.help_text && (
                <p className="mt-2 text-sm text-gray-500">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

export default RadioGroup;
