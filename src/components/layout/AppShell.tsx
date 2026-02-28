// src/components/layout/AppShell.tsx
// Top-level layout wrapper: navbar + page content + footer.
// Listens to Supabase auth state and shows user email + sign-out when logged in.

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabaseClient'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function AppShell({ children }: { children: React.ReactNode }) {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const [user, setUser] = useState<SupabaseUser | null>(null)

    // ── Auth state listener ────────────────────────────────────────
    useEffect(() => {
        // Get current session on mount
        supabase.auth.getUser().then(({ data }) => setUser(data.user))

        // Subscribe to auth changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        navigate('/', { replace: true })
    }

    return (
        <div className="min-h-screen flex flex-col bg-bg-base text-text-primary font-body">
            {/* ── Navbar ────────────────────────────────────────────────── */}
            <header className="border-b border-bg-border sticky top-0 z-50 bg-bg-base/90 backdrop-blur-sm">
                <div className="page-wrapper h-14 flex items-center justify-between">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center gap-2 group"
                        aria-label="InsightStore AI home"
                    >
                        <div className="w-7 h-7 rounded-md bg-brand-primary flex items-center justify-center">
                            <svg
                                width="14" height="14" viewBox="0 0 14 14"
                                fill="none" xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path
                                    d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z"
                                    stroke="white" strokeWidth="1.5"
                                    strokeLinejoin="round"
                                />
                                <circle cx="7" cy="7" r="2" fill="white" />
                            </svg>
                        </div>
                        <span className="font-heading font-semibold text-base text-text-primary tracking-heading">
                            InsightStore <span className="text-brand-primary">AI</span>
                        </span>
                    </Link>

                    {/* Nav links */}
                    <nav className="flex items-center gap-1" aria-label="Main navigation">
                        <NavLink to="/" active={pathname === '/'}>
                            Analyse
                        </NavLink>

                        <div className="w-px h-4 bg-bg-border mx-1" />

                        {user ? (
                            // ── Authenticated: email + sign out ─────────────────
                            <div className="flex items-center gap-2">
                                <span className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted">
                                    <User className="w-3.5 h-3.5" aria-hidden />
                                    <span className="max-w-[140px] truncate">{user.email}</span>
                                </span>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-severity-high transition-colors px-2 py-1.5 rounded-md hover:bg-severity-high/10"
                                    aria-label="Sign out"
                                >
                                    <LogOut className="w-3.5 h-3.5" aria-hidden />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        ) : (
                            // ── Unauthenticated: Sign In button ──────────────────
                            <Link
                                to="/auth"
                                className="btn btn-primary text-sm py-1.5 px-4"
                            >
                                Sign In
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            {/* ── Page Content ──────────────────────────────────────────── */}
            <main className="flex-1">
                {children}
            </main>

            {/* ── Footer ────────────────────────────────────────────────── */}
            <footer className="border-t border-bg-border mt-auto">
                <div className="page-wrapper py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-text-muted text-sm">
                        © 2026 InsightStore AI. All rights reserved.
                    </p>
                    <p className="text-text-muted text-xs font-mono">
                        Powered by Gemini 2.0 Flash
                    </p>
                </div>
            </footer>
        </div>
    )
}

// ── Small NavLink helper ──────────────────────────────────────────
function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            to={to}
            className={cn(
                'btn btn-ghost text-sm px-3 py-1.5',
                active && 'text-text-primary bg-bg-elevated'
            )}
        >
            {children}
        </Link>
    )
}
