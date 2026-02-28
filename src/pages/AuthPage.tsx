// src/pages/AuthPage.tsx
// Authentication page — toggles between LoginForm and SignupForm.
// Standalone route (no AppShell). Reads ?redirect= for post-login navigation.

import { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')

    return (
        <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center p-4">
            {/* Card container */}
            <div className="w-full max-w-sm">
                {/* Logo / brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
                            <span className="text-white text-sm font-bold font-heading">IS</span>
                        </div>
                        <span className="font-heading font-bold text-text-primary text-lg">
                            InsightStore AI
                        </span>
                    </div>
                    <h1 className="font-heading font-semibold text-xl text-text-primary">
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        {mode === 'login'
                            ? 'Sign in to view your analyses'
                            : 'Start with 5 free analyses — no card required'
                        }
                    </p>
                </div>

                {/* Form card */}
                <div className="card">
                    {mode === 'login' ? (
                        <LoginForm onSwitchToSignup={() => setMode('signup')} />
                    ) : (
                        <SignupForm onSwitchToLogin={() => setMode('login')} />
                    )}
                </div>

                {/* Footer */}
                <p className="text-text-muted text-xs text-center mt-6">
                    By continuing you agree to our{' '}
                    <a href="#" className="text-text-secondary hover:text-text-primary">Terms</a>
                    {' & '}
                    <a href="#" className="text-text-secondary hover:text-text-primary">Privacy Policy</a>.
                </p>
            </div>
        </div>
    )
}
