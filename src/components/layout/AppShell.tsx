// src/components/layout/AppShell.tsx
// Top-level layout wrapper: navbar + page content + footer.
// Listens to Supabase auth state and shows user email + sign-out when logged in.

import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, User, Sparkles } from 'lucide-react'
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

    const isHomePage = pathname === '/'

    return (
        <div className="min-h-screen flex flex-col bg-bg-base text-text-primary font-body selection:bg-brand-primary/30 selection:text-white">
            {/* ── Navbar ────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 w-full glass border-b border-white/5 backdrop-blur-md">
                <div className="page-wrapper h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center gap-2.5 group transition-transform active:scale-95"
                        aria-label="InsightStore AI home"
                    >
                        <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-glow group-hover:shadow-brand-primary/40 transition-shadow">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-heading font-bold text-lg text-text-primary tracking-tight">
                            InsightStore <span className="text-brand-primary transition-colors group-hover:text-brand-hover">AI</span>
                        </span>
                    </Link>

                    {/* Nav links */}
                    <nav className="flex items-center gap-2" aria-label="Main navigation">
                        <NavLink to="/" active={isHomePage}>
                            Analyse
                        </NavLink>

                        {user ? (
                            // ── Authenticated: email + sign out ─────────────────
                            <div className="flex items-center gap-3 ml-2 border-l border-bg-border pl-4">
                                <span className="hidden sm:flex items-center gap-1.5 text-xs text-text-muted">
                                    <User className="w-3.5 h-3.5" aria-hidden />
                                    <span className="max-w-[120px] truncate font-medium">{user.email}</span>
                                </span>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary hover:text-severity-high transition-all px-3 py-1.5 rounded-full hover:bg-severity-high/10 bg-bg-elevated/50 border border-transparent hover:border-severity-high/20"
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
                                className="btn btn-primary text-xs font-bold py-2 px-5 ml-2 shadow-glow hover:shadow-brand-primary/30 rounded-full"
                            >
                                Get Started
                            </Link>
                        )}
                    </nav>
                </div>
            </header>

            {/* ── Page Content ──────────────────────────────────────────── */}
            <main className="flex-1 relative">
                {children}
            </main>

            {/* ── Footer ────────────────────────────────────────────────── */}
            {!isHomePage && (
                <footer className="border-t border-bg-border mt-auto bg-bg-surface/50">
                    <div className="page-wrapper py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-text-muted text-xs">
                            © 2026 InsightStore AI. All rights reserved.
                        </p>
                        <div className="flex items-center gap-4 text-text-muted text-xs font-mono">
                            <span>Powered by Gemini 2.0 Flash</span>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    )
}

// ── Small NavLink helper ──────────────────────────────────────────
function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
    return (
        <Link
            to={to}
            className={cn(
                'text-xs font-semibold px-4 py-2 rounded-full transition-all duration-300',
                active
                    ? 'text-brand-primary bg-brand-primary/10 border border-brand-primary/20 shadow-glow'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50'
            )}
        >
            {children}
        </Link>
    )
}
