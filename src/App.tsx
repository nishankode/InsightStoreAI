// src/App.tsx
// Root application — React Router v6 with lazy-loaded pages.
// AuthPage renders standalone. All other pages share AppShell via Outlet.

import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

// ── Lazy-loaded pages ────────────────────────────────────────────
const HomePage = lazy(() => import('@/pages/HomePage'))
const ReportPage = lazy(() => import('@/pages/ReportPage'))
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const AnalysisPage = lazy(() => import('@/pages/AnalysisPage'))

// ── Full-screen loading fallback ─────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-md bg-brand-primary animate-pulse opacity-80" />
        <p className="text-text-muted text-sm">Loading…</p>
      </div>
    </div>
  )
}

// ── Layout wrapper — renders AppShell + inner page via <Outlet> ──
function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

// ── App ──────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth — standalone, no AppShell */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Analysis progress — standalone, no AppShell */}
          <Route path="/analysis/:analysisId" element={<AnalysisPage />} />


          {/* Shell routes — all wrapped in AppShell via Outlet */}
          <Route element={<ShellLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/report/:analysisId" element={<ReportPage />} />
          </Route>

          {/* Catch-all — redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
