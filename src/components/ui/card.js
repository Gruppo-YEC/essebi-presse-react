import React from 'react';
import { cn } from './utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        /* overflow-hidden: i contenuti (righe hover, tabelle, liste) non devono
           mai sbordare oltre gli angoli arrotondati */
        className={cn('overflow-hidden rounded-xl border border-border bg-card text-card-foreground', className)}
        {...props}
    />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col gap-1 border-b border-border px-4 py-3', className)}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('font-semibold leading-tight tracking-tight', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardBody = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4', className)} {...props} />
));
CardBody.displayName = 'CardBody';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('border-t border-border px-4 py-3', className)}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardBody, CardFooter };
