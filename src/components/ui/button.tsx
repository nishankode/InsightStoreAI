// src/components/ui/button.tsx
// Shadcn/UI Button primitive themed to InsightStore AI design system.
// Variants: primary (brand violet), secondary (subtle), ghost (text-only)

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
    // Base — all button variants share these
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-body font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-40 select-none',
    {
        variants: {
            variant: {
                // Brand violet — primary CTA
                primary:
                    'bg-brand-primary text-white hover:bg-brand-hover active:bg-brand-active shadow-sm hover:shadow-glow',
                // Subtle surface — secondary action
                secondary:
                    'bg-bg-elevated text-text-primary border border-bg-border hover:bg-bg-surface hover:border-brand-primary/40',
                // Transparent — nav links, tertiary actions
                ghost:
                    'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
                // Danger — destructive actions (not in DESIGN_SYSTEM, but a safe extension using severity-high)
                danger:
                    'bg-severity-high/10 text-severity-high border border-severity-high/30 hover:bg-severity-high/20',
            },
            size: {
                sm: 'h-8  px-3 text-xs',
                md: 'h-9  px-4 text-sm',
                lg: 'h-11 px-6 text-base',
                icon: 'h-9 w-9 p-0',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    },
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    /** When true, renders as a child element (Slot pattern — passes props to child) */
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
