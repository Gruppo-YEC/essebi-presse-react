import React from 'react';
import { cn } from './utils';

/**
 * Senza max i campi data nativi accettano anni a 6 cifre (12/12/20222): con un max
 * il browser limita il segmento dell'anno a 4. Un max passato dal chiamante vince.
 */
const DATE_MAX = {
    'date': '9999-12-31',
    'datetime-local': '9999-12-31T23:59',
    'month': '9999-12'
};

/**
 * Input shadcn-style: h-9, radius medio, bordo sottile, ring soft al focus.
 */
const Input = React.forwardRef(({ className, size, type = 'text', ...props }, ref) => (
    <input
        ref={ref}
        type={type}
        max={DATE_MAX[type]}
        className={cn(
            'flex h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm text-foreground transition-colors placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
            'disabled:cursor-default disabled:bg-muted disabled:opacity-70',
            size === 'sm' && 'h-8 px-2 text-sm',
            size === 'lg' && 'h-10 px-4 text-base',
            className
        )}
        {...props}
    />
));
Input.displayName = 'Input';

export { Input };
