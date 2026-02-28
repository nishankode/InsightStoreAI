// src/pages/HomePage.tsx
// F-01: Main landing page — Premium Redesign (Securify-style)

import { useState, useCallback, useRef, useEffect } from 'react'
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
    const searchRef = useRef<HTMLDivElement>(null)

    // ── Interaction: Scroll to search ───────────────────────────
    useEffect(() => {
        const handleScrollRequest = () => {
            searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        window.addEventListener('applifter:scroll-to-search', handleScrollRequest)
        return () => window.removeEventListener('applifter:scroll-to-search', handleScrollRequest)
    }, [])

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
                    <div className="hero-backlight text-center">
                        <h1 className="font-heading font-extrabold text-5xl sm:text-7xl md:text-8xl text-text-primary tracking-tight max-w-5xl leading-[1.05] mb-8">
                            Discover What <br className="hidden sm:block" />
                            Users <span className="text-brand-primary">Hate.</span> <br className="hidden sm:block" />
                            Build What They <span className="text-brand-primary">Love.</span>
                        </h1>
                    </div>

                    <p className="text-text-secondary text-lg sm:text-xl md:text-2xl max-w-3xl leading-relaxed mx-auto font-medium opacity-90">
                        Turn thousands of Play Store reviews into clear product decisions, prioritized fixes, and actionable engineering roadmaps.
                    </p>

                    {/* ── Search bar Integration (Enhanced Glow) ── */}
                    <div ref={searchRef} className="w-full max-w-2xl mt-6 relative group">
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

                {/* ── Process Section ── */}
                <div className="mt-40">
                    <div className="text-center mb-16 px-4">
                        <h2 className="text-brand-primary font-mono text-xs font-bold uppercase tracking-[0.2em] mb-4">Process</h2>
                        <h3 className="font-heading font-bold text-3xl sm:text-5xl tracking-tight">From Reviews to Decisions in Seconds</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                        {STEPS.map((step, idx) => (
                            <div key={idx} className="group relative">
                                <div className="absolute -inset-2 bg-gradient-to-b from-brand-primary/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                                <div className="glass p-10 rounded-[2rem] border-white/5 hover:border-brand-primary/20 transition-all duration-300 h-full relative z-10 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary mb-8 group-hover:scale-110 group-hover:bg-brand-primary/20 group-hover:text-white transition-all">
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
                        <h2 className="text-brand-primary font-mono text-xs font-bold uppercase tracking-[0.2em] mb-5">Core Values</h2>
                        <h3 className="font-heading font-bold text-4xl sm:text-5xl leading-[1.1] tracking-tight text-white/90">
                            Stop Guessing What to Fix Next
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
                        {FEATURES.map((feature, idx) => (
                            <div key={idx} className="group relative">
                                <div className="absolute -inset-2 bg-gradient-to-b from-brand-primary/10 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
                                <div className="glass p-8 flex flex-col gap-6 border-white/5 hover:border-brand-primary/20 transition-all duration-300 rounded-3xl h-full relative z-10">
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
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Positioning Section ── */}
            <section className="py-32 relative overflow-hidden">
                <div className="page-wrapper px-4">
                    <div className="glass p-12 sm:p-20 rounded-[3rem] border-white/5 relative overflow-hidden flex flex-col items-center text-center">
                        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-brand-primary/5 blur-[120px] -z-10" />
                        <h3 className="font-heading font-bold text-3xl sm:text-5xl tracking-tight mb-8">
                            Built for Builders Who Move Fast
                        </h3>
                        <p className="text-text-secondary text-lg sm:text-xl max-w-2xl mb-12 font-medium">
                            AppLifterAI helps modern product teams make confident decisions without manual research.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
                            {['Indie developers', 'Startup founders', 'Product managers', 'App agencies'].map((role) => (
                                <div key={role} className="group relative">
                                    <div className="absolute -inset-1 bg-gradient-to-b from-brand-primary/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-lg" />
                                    <div className="glass py-4 px-6 rounded-2xl border-white/5 flex items-center justify-center gap-2 hover:border-brand-primary/20 transition-all relative z-10 h-full">
                                        <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                                        <span className="text-sm text-text-primary/90">{role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Trust / Authority Section ── */}
            <section className="py-32 bg-bg-surface/30 border-t border-white/5">
                <div className="page-wrapper px-4 flex flex-col items-center text-center">
                    <h3 className="font-heading font-bold text-3xl sm:text-5xl tracking-tight mb-16">
                        Make Product Decisions Using Real User Data
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full max-w-4xl">
                        {[
                            { label: 'No surveys.', desc: 'Skip the bias of active questionnaires.' },
                            { label: 'No assumptions.', desc: 'Avoid internal bias and feature bloat.' },
                            { label: 'No guesswork.', desc: 'Know exactly what blocks your growth.' }
                        ].map((item, idx) => (
                            <div key={idx} className="flex flex-col gap-4">
                                <h4 className="text-brand-primary font-heading font-bold text-2xl tracking-tight">{item.label}</h4>
                                <p className="text-text-muted font-medium">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-20 p-8 glass rounded-3xl border-brand-primary/10 max-w-2xl">
                        <p className="text-text-primary text-lg font-bold italic opacity-90">
                            "Only verified feedback from real users. No more manual sorting of thousands of reviews."
                        </p>
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
                                <span className="font-heading font-bold text-xl tracking-tight text-white">
                                    AppLifter<span className="text-brand-primary">AI</span>
                                </span>
                            </div>
                            <p className="text-text-muted text-sm max-w-xs leading-relaxed font-medium">
                                AppLifterAI helps modern teams turn user feedback into winning products.
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
                            © 2026 AppLifterAI. Built for the next generation of apps.
                        </p>
                        <div className="flex items-center gap-6 text-text-muted text-xs font-mono">
                            <span>v1.0.5-beta</span>
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
        title: 'Paste Any App',
        desc: 'Search or paste any Android app. We automatically collect real user feedback.',
    },
    {
        icon: <Zap className="w-6 h-6" />,
        title: 'AI Root-Cause Analysis',
        desc: 'AppLifterAI analyzes hundreds of low-star reviews to uncover recurring problems and hidden friction.',
    },
    {
        icon: <BarChart3 className="w-6 h-6" />,
        title: 'Instant Product Roadmap',
        desc: 'Receive prioritized fixes, severity scoring, and engineering-ready recommendations.',
    },
]

const FEATURES = [
    {
        icon: <Layers className="w-5 h-5" />,
        title: 'Structured Pain Points',
        desc: 'Automatically grouped into Bugs, UX Issues, Performance Problems, and Missing Features.',
    },
    {
        icon: <Smartphone className="w-5 h-5" />,
        title: 'Evidence-Backed Insights',
        desc: 'Every insight includes real user quotes for validation.',
    },
    {
        icon: <CheckCircle2 className="w-5 h-5" />,
        title: 'Impact-Driven Prioritization',
        desc: 'Know which fixes improve ratings fastest using effort vs. impact scoring.',
    },
    {
        icon: <ShieldCheck className="w-5 h-5" />,
        title: 'Competitive Intelligence',
        desc: 'Analyze competitor weaknesses and uncover opportunities to outperform them.',
    },
]

