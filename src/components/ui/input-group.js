import React from 'react';
import { cn } from './utils';

/**
 * Gruppo orizzontale di controlli attaccati (input + bottoni),
 * equivalente dell'InputGroup di Bootstrap: gli elementi interni
 * perdono i radius sui lati di contatto e condividono i bordi.
 */
const InputGroup = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex w-full items-stretch',
            '[&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md',
            '[&>*:not(:first-child)]:-ml-px [&>*]:relative [&>*:focus-within]:z-10 [&>*:focus]:z-10',
            '[&>input]:w-auto [&>input]:flex-1 [&>input]:min-w-0',
            '[&>button]:h-auto',
            className
        )}
        {...props}
    />
));
InputGroup.displayName = 'InputGroup';

const InputGroupText = React.forwardRef(({ className, ...props }, ref) => (
    <span
        ref={ref}
        className={cn('flex items-center border border-input bg-muted px-3 text-sm text-muted-foreground', className)}
        {...props}
    />
));
InputGroupText.displayName = 'InputGroupText';

export { InputGroup, InputGroupText };
