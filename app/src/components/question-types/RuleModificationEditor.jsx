import { useContext, useEffect, useRef } from 'react';
import FormContext from '../../context/FormContext';

/**
 * RuleModificationEditor - Side-by-side current rule + modified rule editor.
 *
 * Shows the current rule text (read-only) on the left and an editable
 * textarea on the right for the modified version. Pre-populates the
 * textarea with the original rule text when a target rule is first selected.
 *
 * Value structure: modified text string
 */
function RuleModificationEditor({ question, value, onChange, error, formData }) {
    const { referenceData } = useContext(FormContext);
    const prevTargetRuleRef = useRef(formData?.target_rule);

    // Look up the selected target rule
    const rules = referenceData?.nccn_rules || [];
    const targetRule = formData?.target_rule
        ? rules.find(r => r.id === formData.target_rule)
        : null;

    // Pre-populate textarea when target_rule changes
    useEffect(() => {
        if (formData?.target_rule && formData.target_rule !== prevTargetRuleRef.current) {
            prevTargetRuleRef.current = formData.target_rule;
            const rule = rules.find(r => r.id === formData.target_rule);
            if (rule) {
                onChange(rule.rule_text);
            }
        }
    }, [formData?.target_rule, rules, onChange]);

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {question.help_text && (
                <p className="text-sm text-gray-500 mb-3">{question.help_text}</p>
            )}

            {!targetRule ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    Please select a target rule above to begin editing.
                </div>
            ) : (
                <div className={`flex flex-col md:flex-row gap-4 ${error ? '' : ''}`}>
                    {/* Current Rule (read-only) */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Current Rule</p>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg min-h-[120px]">
                            <p className="text-sm font-medium text-amber-900 mb-1">{targetRule.title}</p>
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded mb-2">
                                {targetRule.category}
                            </span>
                            <pre className="text-xs text-amber-800 whitespace-pre-wrap font-mono">
                                {targetRule.rule_text}
                            </pre>
                        </div>
                    </div>

                    {/* Modified Rule (editable) */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Modified Rule</p>
                        <textarea
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            rows={6}
                            className={`w-full p-3 border rounded-lg text-xs font-mono min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                                error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Edit the rule text here..."
                        />
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default RuleModificationEditor;
