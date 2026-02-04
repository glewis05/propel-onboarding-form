// ============================================================================
// DEBUG CONFIGURATION
// ============================================================================
// Enable debug mode via query parameter: ?debug=true
// Or by setting window.PROPEL_DEBUG = true in console

export const DEBUG = (() => {
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('debug') === 'true' || window.PROPEL_DEBUG === true;
    }
    return false;
})();

export function debugLog(...args) {
    if (DEBUG) console.log('[DEBUG]', ...args);
}
