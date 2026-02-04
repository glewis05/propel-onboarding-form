import { useState } from 'react';
import { useAuth } from './AuthProvider';
import LoginModal from './LoginModal';

/**
 * AuthButton - Sign in/out button with user display
 */
function AuthButton() {
    const { user, isAuthenticated, signOut, loading } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            await signOut();
        } catch (err) {
            console.error('Sign out failed:', err);
        } finally {
            setIsSigningOut(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-propel-teal rounded-full animate-spin"></div>
                <span>Loading...</span>
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div className="flex items-center gap-3">
                {/* User info */}
                <div className="flex items-center gap-2">
                    {user.user_metadata?.avatar_url ? (
                        <img
                            src={user.user_metadata.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full"
                        />
                    ) : (
                        <div className="w-8 h-8 bg-propel-teal rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {(user.email?.[0] || 'U').toUpperCase()}
                        </div>
                    )}
                    <span className="text-sm text-gray-700 hidden sm:inline">
                        {user.user_metadata?.full_name || user.email}
                    </span>
                </div>

                {/* Sign out button */}
                <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    {isSigningOut ? 'Signing out...' : 'Sign out'}
                </button>
            </div>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-propel-teal rounded-md hover:bg-opacity-90 transition-colors"
            >
                Sign in
            </button>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onSuccess={() => setShowLoginModal(false)}
            />
        </>
    );
}

export default AuthButton;
