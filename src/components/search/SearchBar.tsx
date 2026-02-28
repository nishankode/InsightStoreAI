// src/components/search/SearchBar.tsx
// F-01: Homepage search bar.
// On submit, calls fetch-app-metadata and passes result to AppPreviewCard.

import { useRef, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Search, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchAppMetadata, type AppMetadata } from '@/lib/api'
import { cn } from '@/lib/utils'

interface SearchBarProps {
    onResult: (metadata: AppMetadata) => void
    onClear: () => void
}

// Maps API error strings to user-friendly messages
function getErrorMessage(error: unknown): string {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('app_not_found') || msg.includes('invalid_input') || msg.includes('invalid_app_id')) {
        return "We couldn't find that app. Try a Play Store URL or package ID like com.example.app."
    }
    if (msg.includes('fetch_failed') || msg.includes('network')) {
        return 'Connection error. Check your network and try again.'
    }
    return "We couldn't find that app. Try a Play Store URL or package ID like com.example.app."
}

export function SearchBar({ onResult, onClear }: SearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    // Auto-focus on mount (acceptance criterion)
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    const {
        mutate: search,
        isPending,
        error,
        reset,
    } = useMutation({
        mutationFn: (query: string) => fetchAppMetadata(query),
        onSuccess: (data) => {
            onResult(data)
        },
    })

    const handleSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            const query = inputRef.current?.value.trim() ?? ''
            if (!query) return
            reset()
            search(query)
        },
        [search, reset],
    )

    const handleClear = useCallback(() => {
        if (inputRef.current) inputRef.current.value = ''
        reset()
        onClear()
        inputRef.current?.focus()
    }, [reset, onClear])

    const handleChange = useCallback(() => {
        // If user clears the input manually, hide the preview card
        const value = inputRef.current?.value ?? ''
        if (!value.trim()) {
            reset()
            onClear()
        }
    }, [reset, onClear])

    return (
        <div className="flex flex-col gap-3 w-full max-w-2xl">
            <form
                onSubmit={handleSubmit}
                className="relative flex items-center gap-2"
                role="search"
            >
                {/* Search icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-4 h-4 text-text-muted" aria-hidden />
                </div>

                {/* Input */}
                <Input
                    ref={inputRef}
                    type="text"
                    id="app-search-input"
                    name="query"
                    placeholder="Paste a Play Store URL or enter a package ID…"
                    aria-label="App search input"
                    aria-describedby={error ? 'search-error' : undefined}
                    className={cn(
                        'pl-9 pr-28 h-12 text-sm rounded-lg',
                        error && 'border-severity-high focus:border-severity-high focus:ring-severity-high',
                    )}
                    onChange={handleChange}
                    disabled={isPending}
                />

                {/* Clear button — shown when there's text */}
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-28 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary transition-colors"
                    aria-label="Clear search"
                    tabIndex={-1}
                >
                    <X className="w-3.5 h-3.5" />
                </button>

                {/* Submit button */}
                <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isPending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 text-xs"
                    aria-label={isPending ? 'Searching…' : 'Search'}
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                            <span>Searching…</span>
                        </>
                    ) : (
                        'Search'
                    )}
                </Button>
            </form>

            {/* Error message */}
            {error && (
                <p
                    id="search-error"
                    role="alert"
                    className="text-severity-high text-sm flex items-center gap-2"
                >
                    <span aria-hidden>⚠</span>
                    {getErrorMessage(error)}
                </p>
            )}

            {/* Helper hint */}
            {!error && (
                <p className="text-text-muted text-xs">
                    Example:{' '}
                    <span className="font-mono text-text-secondary">com.spotify.music</span>
                    {' or paste a full Play Store URL'}
                </p>
            )}
        </div>
    )
}
