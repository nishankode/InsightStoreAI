// src/components/auth/LoginForm.tsx
// Email + password login form using Supabase Auth.
// On success: navigates to `?redirect=` param or '/' home.

import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabaseClient'

interface LoginFormProps {
    onSwitchToSignup: () => void
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
    const emailRef = useRef<HTMLInputElement>(null)
    const passwordRef = useRef<HTMLInputElement>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        const email = emailRef.current?.value.trim() ?? ''
        const password = passwordRef.current?.value ?? ''

        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

        if (authError) {
            setError(friendlyError(authError.message))
            setIsLoading(false)
            return
        }

        // Post-login redirect
        const redirect = searchParams.get('redirect') ?? '/'
        navigate(redirect, { replace: true })
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-text-secondary text-xs font-medium">
                    Email
                </label>
                <Input
                    id="login-email"
                    ref={emailRef}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-text-secondary text-xs font-medium">
                    Password
                </label>
                <Input
                    id="login-password"
                    ref={passwordRef}
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
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
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                    : <><LogIn className="w-4 h-4" /> Sign In</>
                }
            </Button>

            <p className="text-text-muted text-xs text-center">
                Don't have an account?{' '}
                <button
                    type="button"
                    onClick={onSwitchToSignup}
                    className="text-brand-primary hover:underline"
                >
                    Sign up free
                </button>
            </p>
        </form>
    )
}

function friendlyError(msg: string): string {
    if (msg.toLowerCase().includes('invalid login')) return 'Incorrect email or password.'
    if (msg.toLowerCase().includes('email not confirmed')) return 'Please verify your email before signing in.'
    return 'Sign-in failed. Please try again.'
}
