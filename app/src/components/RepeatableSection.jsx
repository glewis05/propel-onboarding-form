import QuestionRenderer from './QuestionRenderer';
import { debugLog } from '../utils/debug';

/**
 * RepeatableSection - Handles add/remove for repeatable groups
 * (satellite locations, providers, etc.)
 */
function RepeatableSection({ step, items, onChange, errors, formData }) {
    const { repeatable_config, questions } = step;
    const { min_items = 0, max_items = 100, add_button_text, item_title_template } = repeatable_config;

    const handleAddItem = () => {
        if (items.length < max_items) {
            debugLog(`[RepeatableSection] Adding item to ${step.step_id}`);
            onChange([...items, {}]);
        }
    };

    const handleRemoveItem = (index) => {
        if (items.length > min_items) {
            debugLog(`[RepeatableSection] Removing item ${index} from ${step.step_id}`);
            const newItems = items.filter((_, i) => i !== index);
            onChange(newItems);
        }
    };

    const handleItemChange = (index, questionId, value) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            [questionId]: value
        };
        onChange(newItems);
    };

    const getItemTitle = (index) => {
        return item_title_template.replace('{{index}}', index + 1);
    };

    // Check if first provider was pre-filled from stakeholder
    const firstItemPreFilled = items.length > 0 && items[0]?._pre_filled_from_stakeholder === true;
    const isOrderingProvidersStep = step.step_id === 'ordering_providers';

    return (
        <div className="space-y-4">
            {errors._section && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{errors._section}</p>
                </div>
            )}

            {/* Show note when first provider was pre-filled from stakeholder */}
            {isOrderingProvidersStep && firstItemPreFilled && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                Provider #1 was pre-filled from your stakeholder entry
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                                Please add their <strong>NPI</strong> and <strong>Office Address</strong> to complete the entry.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {items.length === 0 && (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                    <p className="text-sm sm:text-base">No items added yet. Tap the button below to add one.</p>
                </div>
            )}

            {items.map((item, index) => (
                <div key={index} className="relative p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    {/* Header with title and remove button */}
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <h4 className="font-medium text-gray-700 text-sm sm:text-base">{getItemTitle(index)}</h4>
                        {items.length > min_items && (
                            <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="hidden sm:inline">Remove</span>
                            </button>
                        )}
                    </div>

                    {/* Question fields */}
                    <div className="space-y-3">
                        {questions.map(question => {
                            // Transform errors: filter to this item's errors and strip index prefix
                            const itemErrors = {};
                            const prefix = `${index}_`;
                            Object.keys(errors).forEach(key => {
                                if (key.startsWith(prefix)) {
                                    // Strip the index prefix (e.g., "0_provider_phone" -> "provider_phone")
                                    itemErrors[key.substring(prefix.length)] = errors[key];
                                }
                            });

                            return (
                                <QuestionRenderer
                                    key={question.question_id}
                                    question={question}
                                    value={item[question.question_id]}
                                    onChange={(value) => handleItemChange(index, question.question_id, value)}
                                    errors={itemErrors}
                                    formData={{ ...formData, ...item }}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Add button - full width */}
            {items.length < max_items && (
                <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-3 sm:py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-propel-teal hover:text-propel-teal hover:bg-propel-light transition-colors"
                >
                    <span className="flex items-center justify-center text-sm sm:text-base">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {add_button_text}
                    </span>
                </button>
            )}
        </div>
    );
}

export default RepeatableSection;
