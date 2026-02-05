import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../services/supabase';

/**
 * LoginPage - Full-page login screen with email OTP code entry
 * Two-step flow: enter email, then enter 6-digit code from email.
 * Magic links in the email still work as a fallback.
 */
function LoginPage() {
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [step, setStep] = useState('email'); // 'email' or 'verify'
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const otpInputRef = useRef(null);

    // Auto-focus OTP input when switching to verify step
    useEffect(() => {
        if (step === 'verify' && otpInputRef.current) {
            otpInputRef.current.focus();
        }
    }, [step]);

    const handleSendCode = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
                shouldCreateUser: true,
            },
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setStep('verify');
            setMessage({
                type: 'success',
                text: 'We sent a 6-digit code to your email. Enter it below to sign in.',
            });
        }

        setIsLoading(false);
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otpCode.trim(),
            type: 'email',
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        }
        // If successful, AuthProvider's onAuthStateChange will detect the session

        setIsLoading(false);
    };

    const handleBackToEmail = () => {
        setStep('email');
        setOtpCode('');
        setMessage(null);
    };

    const handleResendCode = async () => {
        setIsLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
                shouldCreateUser: true,
            },
        });

        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({
                type: 'success',
                text: 'A new code has been sent to your email.',
            });
        }

        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-propel-navy">
            <div className="w-full max-w-md p-8">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-white">
                        Propel Onboarding
                    </h1>
                    <p className="text-propel-gold mt-1 font-medium">
                        Clinic Onboarding Questionnaire
                    </p>
                    <p className="text-white/50 text-sm mt-2">
                        Streamlined setup for PICI Programs
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    {step === 'email' ? (
                        <>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                Sign in to your account
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Enter your email address and we'll send you a verification code.
                            </p>

                            <form onSubmit={handleSendCode} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        Email address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        disabled={isLoading}
                                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {message && (
                                    <div
                                        className={`p-3 rounded-md text-sm ${
                                            message.type === 'success'
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 px-4 rounded-md bg-propel-teal text-white font-medium hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-propel-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? (
                                        <span className="inline-flex items-center">
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Sending code...
                                        </span>
                                    ) : (
                                        'Send verification code'
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                Enter verification code
                            </h2>
                            <p className="text-sm text-gray-500 mb-1">
                                We sent a code to <span className="font-medium text-gray-700">{email}</span>
                            </p>
                            <p className="text-xs text-gray-400 mb-6">
                                Check your inbox (and spam folder) for the 6-digit code.
                            </p>

                            <form onSubmit={handleVerifyCode} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="otp"
                                        className="block text-sm font-medium text-gray-700 mb-1.5"
                                    >
                                        Verification code
                                    </label>
                                    <input
                                        id="otp"
                                        ref={otpInputRef}
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        required
                                        disabled={isLoading}
                                        maxLength={6}
                                        className="w-full px-3 py-3 rounded-md border border-gray-300 bg-white text-gray-900 text-center text-2xl tracking-[0.5em] font-mono placeholder:text-gray-300 placeholder:tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-propel-teal focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {message && (
                                    <div
                                        className={`p-3 rounded-md text-sm ${
                                            message.type === 'success'
                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                : 'bg-red-50 text-red-700 border border-red-200'
                                        }`}
                                    >
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || otpCode.length !== 6}
                                    className="w-full py-2.5 px-4 rounded-md bg-propel-teal text-white font-medium hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-propel-teal focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isLoading ? (
                                        <span className="inline-flex items-center">
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Verifying...
                                        </span>
                                    ) : (
                                        'Verify and sign in'
                                    )}
                                </button>

                                <div className="flex items-center justify-between text-sm">
                                    <button
                                        type="button"
                                        onClick={handleBackToEmail}
                                        disabled={isLoading}
                                        className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                                    >
                                        Change email
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={isLoading}
                                        className="text-propel-teal hover:text-propel-teal/80 font-medium disabled:opacity-50"
                                    >
                                        Resend code
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-white/40 mt-6">
                    By signing in, you agree to comply with HIPAA and organizational security policies.
                </p>
                <p className="text-center text-[10px] text-white/30 mt-4">
                    Powered by <span className="text-propel-gold/70">Propel Health</span>
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
