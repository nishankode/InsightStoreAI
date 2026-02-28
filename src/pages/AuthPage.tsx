// src/pages/AuthPage.tsx
// Authentication page — toggles between LoginForm and SignupForm.
// Standalone route (no AppShell). Reads ?redirect= for post-login navigation.

import { useState } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'

export default function AuthPage() {
    const [mode, setMode] = useState<'login' | 'signup'>('login')

    return (
        <div className="min-h-screen bg-bg-base relative isolate overflow-hidden flex flex-col items-center justify-center p-6">
            {/* ── Background Aesthetics (Standardised) ── */}
            <div className="absolute inset-0 -z-10 bg-grid opacity-30" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] bg-glow-violet opacity-20 -z-10 blur-[120px]" />

            {/* ── Brand Highlight ── */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent" />

            <div className="w-full max-w-md animate-fade-in">
                {/* Logo / Brand Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-6 group">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
                            <span className="text-white text-base font-bold font-heading">IS</span>
                        </div>
                        <span className="font-heading font-extrabold text-text-primary text-2xl tracking-tight">
                            InsightStore <span className="text-brand-primary">AI</span>
                        </span>
                    </div>

                    <h1 className="font-heading font-bold text-3xl text-text-primary tracking-tight mb-2">
                        {mode === 'login' ? 'Welcome back' : 'Start for free'}
                    </h1>
                    <p className="text-text-secondary text-sm font-medium opacity-80">
                        {mode === 'login'
                            ? 'Your analysis dashboard is waiting.'
                            : 'Get prioritised roadmaps in 60 seconds — no card needed.'
                        }
                    </p>
                </div>

                {/* Glass Form Card */}
                <div className="glass p-8 sm:p-10 rounded-[2rem] border-white/5 shadow-glass animate-scale-in">
                    {mode === 'login' ? (
                        <LoginForm onSwitchToSignup={() => setMode('signup')} />
                    ) : (
                        <SignupForm onSwitchToLogin={() => setMode('login')} />
                    )}
                </div>

                {/* Semantic Footer */}
                <p className="text-text-muted text-[11px] text-center mt-10 font-medium tracking-wide">
                    By accessing InsightStore AI, you acknowledge our{' '}
                    <a href="#" className="text-text-secondary underline underline-offset-4 hover:text-brand-primary transition-colors">Terms</a>
                    {' & '}
                    <a href="#" className="text-text-secondary underline underline-offset-4 hover:text-brand-primary transition-colors">Privacy Policy</a>.
                </p>
            </div>
        </div>
    )
}
