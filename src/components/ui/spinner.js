import React from 'react';
import { cn } from './utils';

/**
 * Spinner circolare, equivalente dello Spinner di Bootstrap.
 * Il colore segue `currentColor`: usare classi text-* per cambiarlo.
 */
const Spinner = React.forwardRef(({ className, size, variant, ...props }, ref) => (
    <span
        ref={ref}
        role="status"
        aria-label="loading"
        className={cn(
            'inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em]',
            size === 'sm' ? 'h-4 w-4 border-2' : 'h-8 w-8 border-4',
            variant === 'primary' && 'text-primary',
            variant === 'secondary' && 'text-secondary',
            variant === 'light' && 'text-white',
            variant === 'danger' && 'text-danger',
            className
        )}
        {...props}
    />
));
Spinner.displayName = 'Spinner';

export { Spinner };
