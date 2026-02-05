import { useState, useEffect } from 'react';
import FormContext from './context/FormContext';
import FormWizard from './components/FormWizard';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './components/auth/LoginPage';
import { useAuth } from './components/auth/AuthProvider';
import { fetchProgramsFromSupabase } from './services/supabase';
import { debugLog } from './utils/debug';

/**
 * App - Root component that loads configuration and provides context
 * Gates access behind authentication (admin-generated codes)
 */
function App() {
    const { loading: authLoading, isAuthenticated } = useAuth();
    const [formDefinition, setFormDefinition] = useState(null);
    const [referenceData, setReferenceData] = useState(null);
    const [testCatalog, setTestCatalog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load configuration on mount (only when authenticated)
    useEffect(() => {
        if (!isAuthenticated) return;

        debugLog('[App] Loading configuration files...');

        Promise.all([
            fetch('/data/form-definition.json').then(r => r.json()),
            fetch('/data/reference-data.json').then(r => r.json()),
            fetch('/data/test-catalog.json').then(r => r.json()),
            fetchProgramsFromSupabase()
        ])
            .then(([formDef, refData, testCat, supabasePrograms]) => {
                debugLog('[App] Configuration loaded successfully');
                debugLog('[App] Form definition:', formDef.form_id, 'v' + formDef.version);
                debugLog('[App] Reference data keys:', Object.keys(refData));
                debugLog('[App] Test catalog labs:', Object.keys(testCat));

                if (supabasePrograms && supabasePrograms.length > 0) {
                    debugLog('[App] Using programs from Supabase:', supabasePrograms.length);
                    refData.programs = supabasePrograms;
                } else {
                    debugLog('[App] Using fallback programs from reference-data.json');
                }

                setFormDefinition(formDef);
                setReferenceData(refData);
                setTestCatalog(testCat);
                setLoading(false);
            })
            .catch(err => {
                console.error('[App] Failed to load configuration:', err);
                setError(`Failed to load configuration: ${err.message}`);
                setLoading(false);
            });
    }, [isAuthenticated]);

    // Auth loading state
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-propel-navy">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white/60">Loading...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show login page
    if (!isAuthenticated) {
        return <LoginPage />;
    }

    // Loading form configuration
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-propel-teal mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading questionnaire...</p>
                </div>
            </div>
        );
    }

    // Error loading configuration
    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-8 bg-red-50 rounded-lg max-w-md">
                    <div className="text-red-500 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-red-700 mb-2">Error Loading Form</h2>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    // Render the form wizard with context
    return (
        <FormContext.Provider value={{ referenceData, testCatalog, formDefinition }}>
            <div className="min-h-screen bg-gray-100 py-8">
                <ErrorBoundary>
                    <FormWizard formDefinition={formDefinition} />
                </ErrorBoundary>

                {/* Footer - Version and attribution */}
                <div className="max-w-3xl mx-auto px-3 sm:px-4 mt-8">
                    <div className="text-center py-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">v{formDefinition.version} | Designed and maintained by Glen Lewis</p>
                    </div>
                </div>
            </div>
        </FormContext.Provider>
    );
}

export default App;
