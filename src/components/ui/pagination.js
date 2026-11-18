import React from 'react';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Pagination shadcn-style: bottoni ghost affiancati, pagina attiva
 * con variante outline, frecce per prev/next e first/last.
 */
const Pagination = ({ className, ...props }) => (
    <ul
        className={cn('flex list-none flex-row items-center gap-1 pl-0', className)}
        {...props}
    />
);
Pagination.displayName = 'Pagination';

const PaginationItem = ({ className, active = false, disabled = false, onClick, children, ...props }) => (
    <li className={className} {...props}>
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'inline-flex h-9 min-w-9 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                active && 'border border-input bg-card shadow-xs hover:bg-card',
                disabled && 'pointer-events-none opacity-50'
            )}
        >
            {children}
        </button>
    </li>
);
PaginationItem.displayName = 'PaginationItem';

const PaginationFirst = (props) => <PaginationItem aria-label="First page" {...props}><Icon name="angles-left" size="sm" /></PaginationItem>;
const PaginationPrev = (props) => <PaginationItem aria-label="Previous page" {...props}><Icon name="chevron-left" size="sm" /></PaginationItem>;
const PaginationNext = (props) => <PaginationItem aria-label="Next page" {...props}><Icon name="chevron-right" size="sm" /></PaginationItem>;
const PaginationLast = (props) => <PaginationItem aria-label="Last page" {...props}><Icon name="angles-right" size="sm" /></PaginationItem>;

export { Pagination, PaginationItem, PaginationFirst, PaginationPrev, PaginationNext, PaginationLast };
