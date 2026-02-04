import { Component } from 'react';
import { STORAGE_KEY } from '../constants';
import { DEBUG } from '../utils/debug';

/**
 * ErrorBoundary - React Error Boundary component
 * Catches JavaScript errors in child components and displays
 * a fallback UI instead of crashing the entire application.
 * Note: Error boundaries must be class components (React limitation).
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        this.setState({ error, errorInfo });
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
    }

    handleReset = () => {
        // Clear saved form data and reload
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // Ignore localStorage errors
        }
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
                        <div className="text-center">
                            <div className="text-red-500 text-5xl mb-4">Warning</div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">
                                Something went wrong
                            </h1>
                            <p className="text-gray-600 mb-4">
                                We encountered an unexpected error. Your progress has been saved
                                and you can try reloading the page.
                            </p>
                            <div className="space-y-2">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="w-full bg-propel-teal text-white py-2 px-4 rounded hover:bg-propel-navy transition-colors"
                                >
                                    Reload Page
                                </button>
                                <button
                                    onClick={this.handleReset}
                                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition-colors"
                                >
                                    Clear Data & Start Over
                                </button>
                            </div>
                            {DEBUG && this.state.error && (
                                <details className="mt-4 text-left">
                                    <summary className="cursor-pointer text-sm text-gray-500">
                                        Technical Details (Debug Mode)
                                    </summary>
                                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
