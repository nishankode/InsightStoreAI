// src/components/ui/input.tsx
// Shadcn/UI Input primitive themed to InsightStore AI design system.

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    // Base — uses .input component class from globals.css as starting point
                    'flex h-9 w-full rounded-md border border-bg-border bg-bg-elevated px-3 py-2',
                    'text-sm text-text-primary placeholder:text-text-muted font-body',
                    'transition-all duration-150',
                    'focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
                    className,
                )}
                ref={ref}
                {...props}
            />
        )
    },
)
Input.displayName = 'Input'

export { Input }
