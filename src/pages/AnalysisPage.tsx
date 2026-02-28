// src/pages/AnalysisPage.tsx
// Shown immediately after a user submits an app for analysis.
// Reads :analysisId from the route // and renders the Realtime progress component.

import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { AnalysisProgress } from '@/components/progress/AnalysisProgress'

export default function AnalysisPage() {
    const { analysisId } = useParams<{ analysisId: string }>()
    const navigate = useNavigate()

    // Guard: if no analysisId in URL, go home
    if (!analysisId) return <Navigate to="/" replace />

    return (
        <AnalysisProgress
            analysisId={analysisId}
            onRetry={() => navigate('/', { replace: true })}
        />
    )
}
