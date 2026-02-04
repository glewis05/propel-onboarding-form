import { useState } from 'react';
import { useAuth } from './AuthProvider';

/**
 * AuthButton - Shows user info and sign-out button in the header
 * Login is handled by the full-page LoginPage, so this only shows when authenticated
 */
function AuthButton() {
    const { user, isAuthenticated, signOut } = useAuth();
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

    if (!isAuthenticated) return null;

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-white/70 hidden sm:inline">
                {user.email}
            </span>
            <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="px-3 py-1.5 text-sm text-white/80 border border-white/30 rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
            >
                {isSigningOut ? 'Signing out...' : 'Sign out'}
            </button>
        </div>
    );
}

export default AuthButton;
