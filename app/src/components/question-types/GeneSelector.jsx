import { memo, useState, useRef, useEffect, useMemo } from 'react';
import { DEFAULT_CUSTOMNEXT_GENES } from '../../constants';
import { debugLog } from '../../utils/debug';

/**
 * GeneSelector - Custom gene selection component for CustomNext-Cancer panel
 *
 * This component provides a sophisticated UI for selecting genes from the 90
 * available CustomNext-Cancer genes. It includes:
 * - Searchable filter input to find specific genes
 * - Checkbox list with all genes (filtered by search)
 * - "Selected Genes" chip display for easy removal
 * - Running count of selected genes
 * - Select All / Clear All bulk actions
 *
 * Value structure: Array of selected gene strings, e.g., ["BRCA1", "BRCA2", "ATM"]
 *
 * Mobile responsive:
 * - Gene list scrolls when too many genes (max-height with overflow)
 * - Chips wrap naturally on smaller screens
 * - Touch-friendly chip removal buttons
 */
const GeneSelector = memo(function GeneSelector({ question, value, onChange, options, error }) {
    // -------------------------------------------------------------------------
    // STATE MANAGEMENT
    // -------------------------------------------------------------------------
    // searchTerm: The current filter text entered by the user
    // Genes are displayed in alphabetical order (already sorted in reference-data.json)
    const [searchTerm, setSearchTerm] = useState('');

    // Track whether we've done the initial population of default genes.
    // This ref prevents us from overwriting user changes after the first render.
    const hasInitializedRef = useRef(false);

    // Ensure value is always an array (handles initial undefined state)
    const selectedGenes = value || [];

    // Total number of available genes for the "X of Y" counter display
    const totalGenes = options.length;

    // -------------------------------------------------------------------------
    // DEFAULT GENE INITIALIZATION
    // -------------------------------------------------------------------------
    // When the GeneSelector first appears (user selects CustomNext-Cancer),
    // pre-populate with the 85 standard genes. This runs once on mount.
    // Users can then uncheck genes to remove them or check additional genes.
    useEffect(() => {
        // Only initialize if:
        // 1. We haven't initialized before (prevents overwriting user changes)
        // 2. The value is empty (no previous selection)
        // 3. We have options available (genes list is loaded)
        if (!hasInitializedRef.current && (!value || value.length === 0) && options.length > 0) {
            hasInitializedRef.current = true;

            // Filter default genes to only include those that exist in the options list.
            // This handles any mismatches between the default list and reference data.
            const validDefaultGenes = DEFAULT_CUSTOMNEXT_GENES.filter(gene =>
                options.includes(gene)
            );

            if (validDefaultGenes.length > 0) {
                debugLog(`[GeneSelector] Initializing with ${validDefaultGenes.length} default genes`);
                onChange(validDefaultGenes);
            }
        }
    }, [value, options, onChange]);

    // -------------------------------------------------------------------------
    // FILTERED GENE LIST
    // -------------------------------------------------------------------------
    // Filter genes based on search term (case-insensitive matching)
    // The options array contains gene strings like "BRCA1", "ATM", etc.
    const filteredGenes = useMemo(() => {
        if (!searchTerm.trim()) {
            // No search term - return all genes
            return options;
        }
        // Filter genes that contain the search term (case-insensitive)
        const term = searchTerm.toLowerCase();
        return options.filter(gene =>
            gene.toLowerCase().includes(term)
        );
    }, [options, searchTerm]);

    // -------------------------------------------------------------------------
    // EVENT HANDLERS
    // -------------------------------------------------------------------------

    /**
     * Handle toggling a single gene's selection state
     * If currently selected, remove it; if not selected, add it
     */
    const handleGeneToggle = (gene) => {
        if (selectedGenes.includes(gene)) {
            // Remove the gene from selection
            onChange(selectedGenes.filter(g => g !== gene));
        } else {
            // Add the gene to selection (maintain alphabetical order)
            const newSelection = [...selectedGenes, gene].sort();
            onChange(newSelection);
        }
    };

    /**
     * Handle removing a gene chip (called when user clicks X on a chip)
     * This is separate from toggle to make the intent clearer
     */
    const handleRemoveGene = (gene) => {
        onChange(selectedGenes.filter(g => g !== gene));
    };

    /**
     * Select All - Add all currently filtered genes to the selection
     * Note: Only selects genes visible in the current filter view
     */
    const handleSelectAll = () => {
        // Merge current selection with filtered genes, avoiding duplicates
        const combined = [...new Set([...selectedGenes, ...filteredGenes])];
        // Sort alphabetically for consistent ordering
        onChange(combined.sort());
    };

    /**
     * Clear All - Remove all selected genes
     * This clears the entire selection, not just filtered genes
     */
    const handleClearAll = () => {
        onChange([]);
    };

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="mb-4">
            {/* Question Label with required indicator */}
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {question.label}
                {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Help text explaining the selector */}
            {question.help_text && (
                <p className="text-sm text-gray-500 mb-3">{question.help_text}</p>
            )}

            {/* Main container with border and rounded corners */}
            <div className={`border rounded-lg ${error ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>

                {/* SEARCH AND BULK ACTIONS BAR */}
                <div className="p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                        {/* Search input with magnifying glass icon */}
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search genes..."
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-propel-teal"
                            />
                        </div>

                        {/* Bulk action buttons - smaller on mobile */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className="px-3 py-2 text-xs sm:text-sm font-medium text-propel-teal border border-propel-teal rounded-md hover:bg-propel-light transition-colors whitespace-nowrap"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className="px-3 py-2 text-xs sm:text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Gene count display - shows "X of Y genes selected" */}
                    <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-propel-teal">{selectedGenes.length}</span>
                        {' '}of{' '}
                        <span className="font-medium">{totalGenes}</span>
                        {' '}genes selected
                    </div>
                </div>

                {/* SELECTED GENES CHIPS AREA */}
                {selectedGenes.length > 0 && (
                    <div className="p-3 border-b border-gray-200 bg-blue-50">
                        <p className="text-xs font-medium text-gray-600 mb-2">Selected Genes:</p>
                        {/* Flex wrap container for gene chips */}
                        <div className="flex flex-wrap gap-1.5">
                            {selectedGenes.map(gene => (
                                <span
                                    key={gene}
                                    className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md"
                                >
                                    {gene}
                                    {/* Remove button (X) - larger touch target for mobile */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveGene(gene)}
                                        className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full transition-colors"
                                        aria-label={`Remove ${gene}`}
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* GENE CHECKBOX LIST */}
                <div className="max-h-64 sm:max-h-80 overflow-y-auto p-3">
                    {filteredGenes.length === 0 ? (
                        /* No results message when search doesn't match any genes */
                        <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">No genes match "{searchTerm}"</p>
                        </div>
                    ) : (
                        /* Grid of gene checkboxes - 2 columns on mobile, 3 on desktop */
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {filteredGenes.map(gene => {
                                const isSelected = selectedGenes.includes(gene);
                                return (
                                    <label
                                        key={gene}
                                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-propel-light border border-propel-teal'
                                                : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleGeneToggle(gene)}
                                            className="h-4 w-4 text-propel-teal focus:ring-propel-teal border-gray-300 rounded"
                                        />
                                        {/* Gene name - uses monospace for consistent width */}
                                        <span className={`ml-2 text-sm font-mono ${isSelected ? 'font-medium text-propel-navy' : 'text-gray-700'}`}>
                                            {gene}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Error message display */}
            {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
});

export default GeneSelector;
