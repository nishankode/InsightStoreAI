// src/components/auth/SignupForm.tsx
// Email + password signup form using Supabase Auth.
// On success: shows confirmation message (email verification required).

import { useRef, useState } from 'react'
import { Loader2, UserPlus, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabaseClient'

interface SignupFormProps {
    onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [confirmed, setConfirmed] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        const email = emailRef.current?.value.trim() ?? ''
        const password = passwordRef.current?.value ?? ''

        if (password.length < 8) {
            setError('Password must be at least 8 characters.')
            setIsLoading(false)
            return
        }

        const { error: authError } = await supabase.auth.signUp({ email, password })

        if (authError) {
            setError(friendlyError(authError.message))
            setIsLoading(false)
            return
        }

        setConfirmed(true)
        setIsLoading(false)
    }

    if (confirmed) {
        return (
            <div className="flex flex-col items-center gap-3 text-center py-4">
                <CheckCircle2 className="w-10 h-10 text-severity-low" />
                <h3 className="font-heading font-semibold text-text-primary">Check your inbox</h3>
                <p className="text-text-secondary text-sm max-w-xs">
                    We sent a confirmation link to{' '}
                    <strong>{emailRef.current?.value}</strong>. Click it to activate your account.
                </p>
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-brand-primary text-sm hover:underline mt-2"
                >
                    Back to sign in
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-email" className="text-text-secondary text-xs font-medium">
                    Email
                </label>
                <Input
                    id="signup-email"
                    ref={emailRef}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="signup-password" className="text-text-secondary text-xs font-medium">
                    Password
                    <span className="text-text-muted font-normal ml-1">(min. 8 characters)</span>
                </label>
                <Input
                    id="signup-password"
                    ref={passwordRef}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                />
            </div>

            {error && (
                <p role="alert" className="text-severity-high text-xs">
                    {error}
                </p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={isLoading} className="w-full mt-1">
                {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                    : <><UserPlus className="w-4 h-4" /> Create Free Account</>
                }
            </Button>

            <p className="text-text-muted text-xs text-center">
                Already have an account?{' '}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-brand-primary hover:underline"
                >
                    Sign in
                </button>
            </p>
        </form>
    )
}

function friendlyError(msg: string): string {
    if (msg.toLowerCase().includes('already registered')) return 'An account with this email already exists. Try signing in.'
    if (msg.toLowerCase().includes('password')) return 'Password must be at least 8 characters.'
    return 'Sign-up failed. Please try again.'
}
