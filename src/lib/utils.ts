// src/lib/utils.ts
// Shadcn/UI utility — merges Tailwind class strings safely.
// Used by all Shadcn components via the `cn()` helper.

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge and deduplicate Tailwind CSS class names.
 * Resolves conflicts (e.g. `p-2 p-4` → `p-4`).
 *
 * @example
 * cn('px-4 py-2', condition && 'bg-brand-primary', 'text-sm')
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
