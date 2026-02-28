// src/pages/HomePage.tsx
// F-01: Main landing page — Premium Redesign (Securify-style)

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '@/components/search/SearchBar'
import { AppPreviewCard } from '@/components/search/AppPreviewCard'
import { useMutation } from '@tanstack/react-query'
import { runAnalysis } from '@/lib/api'
import { supabase } from '@/lib/supabaseClient'
import type { AppMetadata } from '@/lib/api'
import {
    Zap,
    Search,
    BarChart3,
    Layers,
    CheckCircle2,
    ShieldCheck,
    Smartphone,
    Sparkles
} from 'lucide-react'

export default function HomePage() {
    const [appMetadata, setAppMetadata] = useState<AppMetadata | null>(null)
    const [analysisError, setAnalysisError] = useState<string | null>(null)
    const navigate = useNavigate()

    // ── Run analysis mutation ────────────────────────────────────────
    const { mutate: startAnalysis, isPending: isAnalysing } = useMutation({
        mutationFn: async (appId: string) => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                navigate(`/auth?redirect=/?app=${encodeURIComponent(appId)}`)
                throw new Error('unauthenticated')
            }
            return runAnalysis(appId, session.access_token)
        },
        onSuccess: ({ analysis_id }) => {
            setAnalysisError(null)
            navigate(`/analysis/${analysis_id}`)
        },
        onError: (err) => {
            const msg = err instanceof Error ? err.message : String(err)
            if (msg === 'unauthenticated') return
            if (msg.includes('free_tier_limit_reached')) {
                setAnalysisError('You have reached the 5-analysis limit. Upgrade for unlimited access.')
                return
            }
            setAnalysisError(`Analysis failed: ${msg}. Please try again.`)
        },
    })

    const handleResult = useCallback((metadata: AppMetadata) => {
        setAppMetadata(metadata)
    }, [])

    const handleClear = useCallback(() => {
        setAppMetadata(null)
    }, [])

    const handleAnalyse = useCallback(
        (appId: string) => {
            startAnalysis(appId)
        },
        [startAnalysis],
    )

    return (
        <div className="relative isolate overflow-hidden bg-bg-base">
            {/* ── Background Aesthetics (Premium Layers) ── */}
            <div className="absolute inset-0 -z-10 bg-grid opacity-30" />

            {/* Primary Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-glow-violet opacity-40 -z-10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-glow-violet opacity-20 -z-10 blur-[140px]" />

            {/* Subtle light accents */}
            <div className="absolute top-[10%] right-[15%] w-[30%] h-[30%] bg-brand-primary opacity-5 -z-10 blur-[100px]" />

            <div className="page-wrapper pt-20 pb-40">
                {/* ── Hero Section ── */}
                <div className="flex flex-col items-center text-center gap-10 mb-20 animate-fade-in">
                    {/* Eyebrow / Tag */}
                    <div className="glass px-5 py-2 rounded-full flex items-center gap-2.5 border-white/5 shadow-glass group hover:border-brand-primary/30 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_var(--brand-primary)]" />
                        <span className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.15em] uppercase text-text-primary/90">
                            The New Standard in App Intelligence
                        </span>
                    </div>

                    {/* Backlit Hero Title */}
                    <div className="hero-backlight">
                        <h1 className="font-heading font-extrabold text-5xl sm:text-7xl md:text-8xl text-text-primary tracking-tight max-w-5xl leading-[1.05] mb-8">
                            Turn <span className="highlight-violet">1-star reviews</span> <br className="hidden sm:block" />
                            into a product roadmap
                        </h1>
                    </div>

                    <p className="text-text-secondary text-lg sm:text-xl md:text-2xl max-w-3xl leading-relaxed mx-auto font-medium opacity-90">
                        Stop manual review sorting. Our AI extracts root-cause pain points and
                        delivers actionable, prioritized engineering roadmaps in seconds.
                    </p>

                    {/* ── Search bar Integration (Enhanced Glow) ── */}
                    <div className="w-full max-w-2xl mt-6 relative group">
                        <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary/20 via-brand-hover/20 to-brand-primary/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative">
                            <SearchBar onResult={handleResult} onClear={handleClear} />
                        </div>
                    </div>

                    {/* ── App preview card ── */}
                    {appMetadata && (
                        <div className="w-full flex flex-col items-center gap-4 mt-12 animate-scale-in">
                            <div className="relative group/card">
                                <div className="absolute -inset-6 bg-brand-primary/10 blur-3xl rounded-full -z-10 group-hover/card:bg-brand-primary/20 transition-colors duration-500" />
                                <AppPreviewCard
                                    metadata={appMetadata}
                                    onAnalyse={handleAnalyse}
                                    isAnalysing={isAnalysing}
                                />
                            </div>
                            {analysisError && (
                                <p role="alert" className="text-severity-high text-sm font-semibold flex items-center gap-2.5 py-2.5 px-5 glass rounded-xl border-severity-high/30 shadow-glow">
                                    <ShieldCheck className="w-4 h-4" /> {analysisError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── How it Works Guide ── */}
                <div className="mt-40">
                    <div className="text-center mb-16 px-4">
                        <h2 className="text-brand-primary font-mono text-xs font-bold uppercase tracking-[0.2em] mb-4">Process</h2>
                        <h3 className="font-heading font-bold text-3xl sm:text-5xl tracking-tight">Three steps to clarity</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                        {STEPS.map((step, idx) => (
                            <div key={idx} className="group relative">
                                <div className="absolute -inset-2 bg-gradient-to-b from-brand-primary/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                                <div className="glass p-10 rounded-[2rem] border-white/5 hover:border-brand-primary/20 transition-all duration-300 h-full relative z-10 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-8 group-hover:scale-110 group-hover:bg-brand-primary/20 transition-all">
                                        {step.icon}
                                    </div>
                                    <h3 className="font-heading font-bold text-xl mb-4 tracking-tight">
                                        {step.title}
                                    </h3>
                                    <p className="text-text-secondary text-sm leading-relaxed font-medium">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Feature Highlights Grid (Premium Section) ── */}
            <section className="bg-bg-surface/50 py-32 relative overflow-hidden border-y border-white/5">
                <div className="absolute top-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent" />
                <div className="absolute bottom-0 left-1/4 w-1/2 h-px bg-gradient-to-r from-transparent via-brand-primary/30 to-transparent" />

                <div className="page-wrapper">
                    <div className="max-w-4xl mb-20 px-4">
                        <h2 className="text-brand-primary font-mono text-xs font-bold uppercase tracking-[0.2em] mb-5">Core Capabilities</h2>
                        <h3 className="font-heading font-bold text-4xl sm:text-5xl leading-[1.1] tracking-tight text-white">
                            Stop guessing. Start solving the problems that <span className="text-brand-hover">actually hurt</span> your ratings.
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
                        {FEATURES.map((feature, idx) => (
                            <div key={idx} className="glass p-8 flex flex-col gap-6 border-white/5 hover:border-brand-primary/20 group transition-all duration-300 rounded-3xl">
                                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
                                    {feature.icon}
                                </div>
                                <div className="flex flex-col gap-2">
                                    <h4 className="font-heading font-bold text-lg text-text-primary tracking-tight">
                                        {feature.title}
                                    </h4>
                                    <p className="text-text-muted text-sm leading-relaxed font-medium">
                                        {feature.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Deep Footer (Landing Page Style) ── */}
            <footer className="border-t border-bg-border pt-20 pb-10 bg-bg-base">
                <div className="page-wrapper px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-20">
                        <div className="col-span-2 lg:col-span-2 px-2">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center shadow-glow">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-heading font-bold text-xl tracking-tight">
                                    InsightStore <span className="text-brand-primary">AI</span>
                                </span>
                            </div>
                            <p className="text-text-muted text-sm max-w-xs leading-relaxed">
                                The ultimate AI toolkit for mobile product managers and developers to dominate the app store categories.
                            </p>
                        </div>

                        <div>
                            <h5 className="font-heading font-bold text-sm mb-6 uppercase tracking-caps text-text-primary">Product</h5>
                            <ul className="flex flex-col gap-3 text-sm text-text-muted">
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Analysis Engine</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Roadmap Tools</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">API Access</a></li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-heading font-bold text-sm mb-6 uppercase tracking-caps text-text-primary">Resources</h5>
                            <ul className="flex flex-col gap-3 text-sm text-text-muted">
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Documentation</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Changelog</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Status</a></li>
                            </ul>
                        </div>

                        <div>
                            <h5 className="font-heading font-bold text-sm mb-6 uppercase tracking-caps text-text-primary">Legal</h5>
                            <ul className="flex flex-col gap-3 text-sm text-text-muted">
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-brand-primary transition-colors">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-bg-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-text-muted text-xs">
                            © 2026 InsightStore AI. Built for the next generation of apps.
                        </p>
                        <div className="flex items-center gap-6 text-text-muted text-xs font-mono">
                            <span>v1.0.4-beta</span>
                            <span>Region: US-East</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}

const STEPS = [
    {
        icon: <Search className="w-6 h-6" />,
        title: 'Paste Play Store URL',
        desc: 'Simply search or paste the link to any Android application. We handle the heavy lifting of fetching metadata.',
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: 'Deep AI Extraction',
        desc: 'Gemini 2.0 Flash Lite scrapes 300+ recent low-star reviews to find recurring root-cause patterns.',
    },
    {
        icon: <BarChart3 className="w-6 h-6" />,
        title: 'Instant Roadmap',
        desc: 'Get a prioritised list of pain points, severity scores, and actionable engineering recommendations.',
    },
]

const FEATURES = [
    {
        icon: <Layers className="w-5 h-5" />,
        title: 'Structured Insights',
        desc: 'Pain points are categorised by type: Bug, UX, Performance, or Feature Gap.',
    },
    {
        icon: <Smartphone className="w-5 h-5 text-brand-primary" />,
        title: 'App Store Context',
        desc: 'Direct quotes from users are mapped to each insight for verified evidence.',
    },
    {
        icon: <CheckCircle2 className="w-5 h-5 text-brand-primary" />,
        title: 'Prioritised ROI',
        desc: 'Each fix is rated by effort vs. impact to help you allocate resources efficiently.',
    },
    {
        icon: <ShieldCheck className="w-5 h-5 text-brand-primary" />,
        title: 'Competitor Intel',
        desc: 'Analyse your competitors to find gaps in their products that you can exploit.',
    },
]

