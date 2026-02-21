import { useState, useContext, useMemo } from 'react';
import FormContext from '../../context/FormContext';

/**
 * NCCNRuleSearch - Searchable single-select rule picker for NCCN rules.
 *
 * Value structure: rule ID string (e.g., "RULE_001")
 */
function NCCNRuleSearch({ question, value, onChange, error }) {
    const { referenceData } = useContext(FormContext);
    const [searchTerm, setSearchTerm] = useState('');

    const rules = referenceData[question.options_ref] || [];
    const selectedRule = value ? rules.find(r => r.id === value) : null;

    // Filter rules by search term across category, title, and rule_text
    const filteredRules = useMemo(() => {
        if (!searchTerm.trim()) return rules;
        const term = searchTerm.toLowerCase();
        return rules.filter(rule =>
            rule.category.toLowerCase().includes(term) ||
            rule.title.toLowerCase().includes(term) ||
            rule.rule_text.toLowerCase().includes(term)
        );
    }, [rules, searchTerm]);

    const handleSelect = (ruleId) => {
        onChange(ruleId);
    };

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {question.help_text && (
                <p className="text-sm text-gray-500 mb-3">{question.help_text}</p>
            )}

            <div className={`border rounded-lg ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
                {/* Search bar */}
                <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search rules by category, title, or content..."
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                        />
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">{filteredRules.length}</span> of{' '}
                        <span className="font-medium">{rules.length}</span> rules
                        {selectedRule && (
                            <span className="ml-2 text-propel-teal font-medium">| 1 selected</span>
                        )}
                    </div>
                </div>

                {/* Selected rule detail panel */}
                {selectedRule && (
                    <div className="p-3 border-b border-gray-200 bg-blue-50">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-blue-900">{selectedRule.title}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    {selectedRule.category}
                                </span>
                                <pre className="mt-2 text-xs text-blue-800 whitespace-pre-wrap font-mono bg-blue-100 p-2 rounded">
                                    {selectedRule.rule_text}
                                </pre>
                            </div>
                            <button
                                type="button"
                                onClick={handleClear}
                                className="ml-3 flex-shrink-0 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* Scrollable rule list */}
                <div className="max-h-64 sm:max-h-80 overflow-y-auto p-3">
                    {filteredRules.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">No rules match "{searchTerm}"</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredRules.map(rule => {
                                const isSelected = value === rule.id;
                                return (
                                    <label
                                        key={rule.id}
                                        className={`block p-3 rounded-lg cursor-pointer transition-colors border ${
                                            isSelected
                                                ? 'bg-propel-light border-propel-teal'
                                                : 'hover:bg-gray-50 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="radio"
                                                name={question.question_id}
                                                checked={isSelected}
                                                onChange={() => handleSelect(rule.id)}
                                                className="mt-1 h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${isSelected ? 'font-medium text-propel-navy' : 'text-gray-900'}`}>
                                                    {rule.title}
                                                </p>
                                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                                    {rule.category}
                                                </span>
                                                <p className="mt-1 text-xs text-gray-500 line-clamp-2 font-mono">
                                                    {rule.rule_text}
                                                </p>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default NCCNRuleSearch;
