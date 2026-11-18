import React from 'react';
import { cn } from './utils';

const Textarea = React.forwardRef(({ className, size, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn(
            'flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
            'disabled:cursor-default disabled:bg-muted disabled:opacity-70',
            size === 'sm' && 'px-2 py-1',
            className
        )}
        {...props}
    />
));
Textarea.displayName = 'Textarea';

export { Textarea };
