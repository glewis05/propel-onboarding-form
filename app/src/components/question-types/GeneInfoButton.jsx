/**
 * GeneInfoButton - Question mark icon button that triggers gene list popup
 *
 * PURPOSE: Provide a visual indicator that gene information is available,
 * and trigger the popup when clicked.
 */
function GeneInfoButton({ panelValue, isActive, onClick, buttonRef }) {
    // Only show for panels that have gene lists
    const showableTypes = ['cancernext_expanded', 'cancernext_expanded_rna',
                          'cancernext_expanded_leg', 'cancernext_expanded_leg_rna'];

    if (!showableTypes.includes(panelValue)) {
        return null;
    }

    return (
        <button
            ref={buttonRef}
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium transition-colors ${
                isActive
                    ? 'bg-propel-teal text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-propel-teal hover:text-white'
            }`}
            aria-label="View gene list"
            title="Click to view gene list"
        >
            ?
        </button>
    );
}

export default GeneInfoButton;
