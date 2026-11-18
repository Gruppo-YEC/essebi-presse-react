import React from 'react';
import { cn } from './utils';

/**
 * Breadcrumb stile Bootstrap: voci separate da "/", ultima voce muted.
 */
const Breadcrumb = ({ className, children, ...props }) => (
    <nav aria-label="breadcrumb" {...props}>
        <ol className={cn('mb-4 flex flex-wrap list-none items-center pl-0', className)}>
            {children}
        </ol>
    </nav>
);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbItem = ({ className, active = false, children, ...props }) => (
    <li
        className={cn(
            'flex items-center',
            "[&+&]:before:px-2 [&+&]:before:text-muted-foreground [&+&]:before:content-['/']",
            active ? 'text-muted-foreground' : '[&>a]:text-primary [&>a]:no-underline hover:[&>a]:underline',
            className
        )}
        aria-current={active ? 'page' : undefined}
        {...props}
    >
        {children}
    </li>
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

export { Breadcrumb, BreadcrumbItem };
