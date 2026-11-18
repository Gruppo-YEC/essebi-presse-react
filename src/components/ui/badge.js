import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './utils';

/**
 * Badge shadcn-style con le varianti colore storiche del framework.
 * `pill` arrotonda completamente.
 */
const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold leading-tight w-fit whitespace-nowrap transition-colors',
    {
        variants: {
            variant: {
                primary: 'border-transparent bg-primary text-primary-foreground',
                secondary: 'border-transparent bg-secondary/15 text-foreground/80',
                success: 'border-transparent bg-success/15 text-green-800 dark:text-green-300',
                danger: 'border-transparent bg-danger/15 text-red-800 dark:text-red-300',
                warning: 'border-transparent bg-warning/25 text-yellow-900 dark:text-yellow-200',
                info: 'border-transparent bg-info/20 text-cyan-900 dark:text-cyan-200',
                light: 'border-border bg-light text-light-foreground',
                dark: 'border-transparent bg-dark text-dark-foreground'
            }
        },
        defaultVariants: {
            variant: 'primary'
        }
    }
);

const Badge = React.forwardRef(({ className, variant, pill = false, ...props }, ref) => (
    <span
        ref={ref}
        className={cn(badgeVariants({ variant }), pill && 'rounded-full', className)}
        {...props}
    />
));
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
