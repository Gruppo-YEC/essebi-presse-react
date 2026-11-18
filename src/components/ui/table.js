import React from 'react';
import { cn } from './utils';

/**
 * Tabella shadcn-style. Props booleane:
 * - striped: righe alternate
 * - hover: highlight della riga al passaggio
 * - responsive: wrappa in un contenitore con scroll orizzontale
 * - size="sm": celle compatte
 *
 * Le righe/celle sono normali <tr>/<td>. Ogni cella ha uno sfondo pieno e
 * striping/hover sono disegnati con un inset shadow: così le colonne sticky
 * del DataGrid restano opache durante lo scroll orizzontale.
 */
const Table = React.forwardRef(({ className, striped = false, hover = false, responsive = false, size, children, ...props }, ref) => {
    const table = (
        <table
            ref={ref}
            className={cn(
                'w-full caption-bottom border-collapse align-middle text-inherit mb-4',
                '[&>:not(caption)>tr>th]:bg-card [&>:not(caption)>tr>td]:bg-card',
                '[&>:not(caption)>tr>th]:border-b [&>:not(caption)>tr>td]:border-b [&>:not(caption)>tr>th]:border-border [&>:not(caption)>tr>td]:border-border',
                size === 'sm'
                    ? '[&>:not(caption)>tr>th]:p-1 [&>:not(caption)>tr>td]:p-1'
                    : '[&>:not(caption)>tr>th]:p-2 [&>:not(caption)>tr>td]:p-2',
                '[&>thead>tr>th]:text-left [&>thead>tr>th]:font-semibold [&>thead>tr>th]:align-bottom',
                /* righe alternate: la prima dopo il thead resta bianca, la seconda grigia */
                striped && '[&>tbody>tr:nth-child(even)>td]:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.03)] dark:[&>tbody>tr:nth-child(even)>td]:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.04)]',
                hover && '[&>tbody>tr:hover>td]:shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.06)] dark:[&>tbody>tr:hover>td]:shadow-[inset_0_0_0_9999px_rgba(255,255,255,0.075)]',
                className
            )}
            {...props}
        >
            {children}
        </table>
    );

    if (responsive) {
        return <div className="w-full overflow-x-auto">{table}</div>;
    }
    return table;
});
Table.displayName = 'Table';

export { Table };
