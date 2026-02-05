import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { debugLog } from '../../utils/debug';

// Create auth context
const AuthContext = createContext(null);

/**
 * AuthProvider - Manages authentication state and provides auth context
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Handle auth redirect (magic link, OAuth callback)
        const handleAuthRedirect = async () => {
            const url = new URL(window.location.href);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            const errorDescription = url.searchParams.get('error_description');

            // Handle error from OAuth/magic link
            if (error) {
                console.error('[AuthProvider] Auth redirect error:', error, errorDescription);
                return;
            }

            // Exchange code for session (PKCE flow)
            if (code) {
                debugLog('[AuthProvider] Exchanging code for session...');
                const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                if (exchangeError) {
                    console.error('[AuthProvider] Code exchange failed:', exchangeError);
                } else {
                    debugLog('[AuthProvider] Session established:', data.user?.email);
                    // Clean URL (remove code param)
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
        };

        handleAuthRedirect();

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            debugLog('[AuthProvider] Initial session:', session?.user?.email || 'none');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                debugLog('[AuthProvider] Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Sign in with Google
    const signInWithGoogle = async () => {
        debugLog('[AuthProvider] Initiating Google sign-in');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            console.error('[AuthProvider] Google sign-in error:', error);
            throw error;
        }
    };

    // Sign in with email magic link
    const signInWithEmail = async (email) => {
        debugLog('[AuthProvider] Sending magic link to:', email);
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        if (error) {
            console.error('[AuthProvider] Magic link error:', error);
            throw error;
        }
    };

    // Sign out
    const signOut = async () => {
        debugLog('[AuthProvider] Signing out');
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('[AuthProvider] Sign out error:', error);
            throw error;
        }
    };

    const value = {
        user,
        session,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signOut,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * useAuth - Hook to access auth context
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthProvider;
