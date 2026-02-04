import { useRef, useEffect, useContext } from 'react';
import FormContext from '../../context/FormContext';

/**
 * GeneListPopup - Non-modal floating panel showing gene list
 *
 * PURPOSE: Display gene information for test panels without covering the form.
 * Uses a floating panel positioned near the trigger button rather than a centered modal.
 *
 * FEATURES:
 * - Positioned to the right of trigger or below on mobile
 * - No background overlay - user can still see their form selections
 * - Multi-column gene display for readability
 * - Keyboard accessible (Escape to close)
 * - Click outside to close
 */
function GeneListPopup({ isOpen, onClose, panelType, anchorRef }) {
    const popupRef = useRef(null);
    const { referenceData } = useContext(FormContext);

    // Get gene lists from reference data
    const geneLists = referenceData?.gene_lists || {};
    const basePanel = geneLists.cancernext_expanded_base || { genes: [], gene_count: 0 };
    const limitedEvidence = geneLists.limited_evidence_addon || { genes: [], gene_count: 0 };

    // Determine which genes to show based on panel type
    const showLimitedEvidence = panelType === 'cancernext_expanded_leg' ||
                                 panelType === 'cancernext_expanded_leg_rna';

    // Handle keyboard events (Escape to close)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Handle click outside to close
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target)) {
                // Check if click was on the info button itself (don't close if clicking the button)
                if (anchorRef?.current && anchorRef.current.contains(e.target)) {
                    return;
                }
                onClose();
            }
        };

        // Delay adding listener to avoid immediate close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    // Render genes in multi-column layout (4 columns on desktop, 2 on mobile)
    const renderGeneGrid = (genes, title, count) => (
        <div className="mb-4 last:mb-0">
            <h4 className="font-semibold text-propel-navy mb-2 text-sm border-b border-gray-200 pb-1">
                {title} ({count} genes)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-1">
                {genes.map((gene) => (
                    <span key={gene} className="text-xs text-gray-700 font-mono">
                        {gene}
                    </span>
                ))}
            </div>
        </div>
    );

    const totalGenes = showLimitedEvidence
        ? basePanel.gene_count + limitedEvidence.gene_count
        : basePanel.gene_count;

    const panelTitle = showLimitedEvidence
        ? `CancerNext-Expanded + Limited Evidence Genes (${totalGenes} genes)`
        : `CancerNext-Expanded (${basePanel.gene_count} genes)`;

    // On mobile (< 640px), show as fixed bottom panel
    // On desktop, show as floating panel to the right
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <div
            ref={popupRef}
            className={`z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-h-[70vh] overflow-y-auto ${
                isMobile
                    ? 'fixed bottom-0 left-0 right-0 rounded-b-none w-full max-h-[60vh]'
                    : 'absolute w-80 sm:w-96 md:w-[450px]'
            }`}
            style={isMobile ? {} : {
                // Position to the right of anchor on desktop
                top: '0',
                left: '100%',
                marginLeft: '8px'
            }}
            role="dialog"
            aria-label={panelTitle}
        >
            {/* Header with close button */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <h3 className="font-semibold text-propel-navy text-sm">
                    {panelTitle}
                </h3>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Close gene list"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Gene lists */}
            <div className="space-y-4">
                {renderGeneGrid(basePanel.genes, 'Base Panel', basePanel.gene_count)}

                {showLimitedEvidence && (
                    <div className="pt-2 border-t border-gray-100">
                        {renderGeneGrid(limitedEvidence.genes, 'Limited Evidence Add-on', limitedEvidence.gene_count)}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GeneListPopup;
