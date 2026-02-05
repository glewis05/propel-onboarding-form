import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { debugLog } from '../../utils/debug';

// Create auth context
const AuthContext = createContext(null);

// Local storage key for manual auth
const MANUAL_AUTH_KEY = 'propel_manual_auth';

/**
 * AuthProvider - Manages authentication state and provides auth context
 *
 * Supports two auth modes:
 * 1. Supabase Auth (magic links) - when working
 * 2. Manual code auth - admin generates code, user enters it
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for manual auth first
        const manualAuth = localStorage.getItem(MANUAL_AUTH_KEY);
        if (manualAuth) {
            try {
                const parsed = JSON.parse(manualAuth);
                if (parsed.email && parsed.expiresAt > Date.now()) {
                    debugLog('[AuthProvider] Restored manual auth:', parsed.email);
                    setUser({ email: parsed.email, id: null, isManualAuth: true });
                    setLoading(false);
                    return;
                } else {
                    localStorage.removeItem(MANUAL_AUTH_KEY);
                }
            } catch (e) {
                localStorage.removeItem(MANUAL_AUTH_KEY);
            }
        }

        // Handle Supabase auth redirect (magic link, OAuth callback)
        const handleAuthRedirect = async () => {
            const url = new URL(window.location.href);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            const errorDescription = url.searchParams.get('error_description');

            if (error) {
                console.error('[AuthProvider] Auth redirect error:', error, errorDescription);
                return;
            }

            if (code) {
                debugLog('[AuthProvider] Exchanging code for session...');
                const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

                if (exchangeError) {
                    console.error('[AuthProvider] Code exchange failed:', exchangeError);
                } else {
                    debugLog('[AuthProvider] Session established:', data.user?.email);
                    window.history.replaceState({}, '', window.location.pathname);
                }
            }
        };

        handleAuthRedirect();

        // Get initial Supabase session
        supabase.auth.getSession().then(({ data: { session } }) => {
            debugLog('[AuthProvider] Initial session:', session?.user?.email || 'none');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for Supabase auth changes
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

    // Verify manual login code against our table
    const verifyManualCode = async (email, code) => {
        debugLog('[AuthProvider] Verifying manual code for:', email);

        const { data, error } = await supabase
            .from('manual_login_codes')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('code', code)
            .is('used_at', null)
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();

        if (error) {
            console.error('[AuthProvider] Code verification error:', error);
            throw new Error('Failed to verify code');
        }

        if (!data) {
            throw new Error('Invalid or expired code');
        }

        // Mark code as used
        await supabase
            .from('manual_login_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', data.id);

        // Store manual auth in localStorage (24 hour session)
        const authData = {
            email: email.toLowerCase(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000),
            verifiedAt: Date.now()
        };
        localStorage.setItem(MANUAL_AUTH_KEY, JSON.stringify(authData));

        // Set user state
        setUser({ email: email.toLowerCase(), id: null, isManualAuth: true });
        debugLog('[AuthProvider] Manual auth successful:', email);

        return { success: true, email: email.toLowerCase() };
    };

    // Sign out (handles both Supabase and manual auth)
    const signOut = async () => {
        debugLog('[AuthProvider] Signing out');

        // Clear manual auth
        localStorage.removeItem(MANUAL_AUTH_KEY);

        // Clear Supabase session if exists
        if (session) {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('[AuthProvider] Sign out error:', error);
            }
        }

        setUser(null);
        setSession(null);
    };

    const value = {
        user,
        session,
        loading,
        verifyManualCode,
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
