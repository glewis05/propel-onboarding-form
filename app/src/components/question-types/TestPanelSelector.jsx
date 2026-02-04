import { memo, useState, useRef } from 'react';
import GeneListPopup from './GeneListPopup';

/**
 * TestPanelSelector - Dropdown select with gene info buttons
 *
 * PURPOSE: Render test panel options as a dropdown (like original SelectField)
 * but with info buttons showing gene lists for CancerNext-Expanded panels.
 *
 * PRESERVES: Original dropdown UI behavior
 * ADDS: Gene info buttons for panels that have gene lists
 */
const TestPanelSelector = memo(function TestPanelSelector({ question, value, onChange, options, error }) {
    const [activePopup, setActivePopup] = useState(null);
    const infoButtonRef = useRef(null);

    const handleInfoClick = (panelValue) => {
        setActivePopup(activePopup === panelValue ? null : panelValue);
    };

    const closePopup = () => {
        setActivePopup(null);
    };

    // Find the currently selected option to show its info button
    const selectedOption = options.find(opt => opt.value === value);
    const showInfoButton = selectedOption?.has_gene_list;

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Dropdown with optional info button */}
            <div className="relative flex items-center gap-2">
                <select
                    value={value || ''}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setActivePopup(null); // Close popup when selection changes
                    }}
                    className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal ${
                        error ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                >
                    <option value="">Select...</option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.display_name}
                            {opt.gene_count ? ` (${opt.gene_count} genes)` : ''}
                        </option>
                    ))}
                </select>

                {/* Info button - only shown when selected panel has gene list */}
                {showInfoButton && (
                    <button
                        ref={infoButtonRef}
                        type="button"
                        onClick={() => handleInfoClick(value)}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors ${
                            activePopup === value
                                ? 'bg-propel-teal text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-propel-teal hover:text-white'
                        }`}
                        aria-label="View gene list"
                        title="Click to view gene list"
                    >
                        ?
                    </button>
                )}

                {/* Gene list popup */}
                {activePopup && (
                    <GeneListPopup
                        isOpen={true}
                        onClose={closePopup}
                        panelType={activePopup}
                        anchorRef={infoButtonRef}
                    />
                )}
            </div>

            {/* Show selected panel description */}
            {selectedOption?.description && (
                <p className="mt-1 text-sm text-gray-500">{selectedOption.description}</p>
            )}

            {question.help_text && (
                <p className="mt-1 text-sm text-gray-500">{question.help_text}</p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

export default TestPanelSelector;
