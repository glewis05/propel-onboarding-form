import { createContext, useContext } from 'react';

// ============================================================================
// REACT CONTEXT
// ============================================================================
// We use React Context to share form definition and reference data across components
// without prop drilling through every level.

export const FormContext = createContext(null);

// Custom hook for easier context consumption
export function useFormContext() {
    const context = useContext(FormContext);
    if (!context) {
        throw new Error('useFormContext must be used within a FormContext.Provider');
    }
    return context;
}

export default FormContext;
