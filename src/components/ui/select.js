import React from 'react';
import { cn } from './utils';

/**
 * Select nativa in stile shadcn (freccia via background-image, nessuna dipendenza).
 */
const Select = React.forwardRef(({ className, size, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'flex h-9 w-full appearance-none rounded-md border border-input bg-card py-1 pl-3 pr-8 text-sm text-foreground transition-colors',
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Cpath fill=%22none%22 stroke=%22%2371717a%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%222%22 d=%22m2 5 6 6 6-6%22/%3E%3C/svg%3E')] bg-[length:14px_10px] bg-[position:right_0.6rem_center] bg-no-repeat",
            'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
            'disabled:cursor-default disabled:bg-muted disabled:opacity-70',
            size === 'sm' && 'h-8 pl-2 pr-7',
            size === 'lg' && 'h-10 pl-4 text-base',
            className
        )}
        {...props}
    />
));
Select.displayName = 'Select';

export { Select };
