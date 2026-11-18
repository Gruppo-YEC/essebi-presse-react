import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from './utils';

const alertVariants = cva(
    'relative w-full rounded-lg border px-4 py-3 mb-4 text-sm',
    {
        variants: {
            variant: {
                primary: 'border-primary/30 bg-primary/10 text-primary',
                secondary: 'border-secondary/30 bg-secondary/10 text-foreground/70',
                success: 'border-success/30 bg-success/10 text-green-900 dark:text-green-200',
                danger: 'border-danger/30 bg-danger/10 text-red-900 dark:text-red-200',
                warning: 'border-warning/40 bg-warning/15 text-yellow-900 dark:text-yellow-200',
                info: 'border-info/40 bg-info/15 text-cyan-900 dark:text-cyan-200',
                light: 'border-border bg-light text-light-foreground',
                dark: 'border-dark/30 bg-dark/10 text-foreground'
            }
        },
        defaultVariants: {
            variant: 'primary'
        }
    }
);

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertHeading = React.forwardRef(({ className, ...props }, ref) => (
    <h4 ref={ref} className={cn('mb-1 text-base font-semibold tracking-tight', className)} {...props} />
));
AlertHeading.displayName = 'AlertHeading';

export { Alert, AlertHeading, alertVariants };
