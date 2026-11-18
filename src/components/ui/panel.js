import React from 'react';
import Icon from '../BodyElements/Icon';
import { cn } from './utils';

/**
 * Pannello informativo: intestazione con icona, righe etichetta/valore
 * separate da una linea, nota opzionale in fondo. E' il blocco usato nelle
 * pagine di servizio (impostazioni, analytics) per elenchi di proprieta'.
 *
 *   <Panel icon='user' title='Utente' footer='nota'>
 *       <PanelRow label='ID'><code>12</code></PanelRow>
 *   </Panel>
 */
const Panel = React.forwardRef(({ className, icon, title, actions, footer, children, ...props }, ref) => (
    <div ref={ref} className={cn('overflow-hidden rounded-xl border border-border bg-card text-card-foreground', className)} {...props}>
        {(title || actions) ? (
            <div className='flex items-center justify-between gap-3 border-b border-border px-4 py-2.5'>
                <div className='flex min-w-0 items-center gap-2 text-sm font-medium'>
                    {icon ? <Icon name={icon} size='sm' className='shrink-0 text-muted-foreground' /> : null}
                    <span className='truncate'>{title}</span>
                </div>
                {actions ? <div className='flex shrink-0 items-center gap-1'>{actions}</div> : null}
            </div>
        ) : null}
        <div className='divide-y divide-border px-4'>{children}</div>
        {footer ? <div className='border-t border-border px-4 py-2 text-xs text-muted-foreground'>{footer}</div> : null}
    </div>
));
Panel.displayName = 'Panel';

/** Riga etichetta a sinistra, valore a destra. */
const PanelRow = React.forwardRef(({ className, label, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between gap-4 py-2.5 text-sm', className)} {...props}>
        <span className='shrink-0 text-muted-foreground'>{label}</span>
        <span className='min-w-0 truncate text-right'>{children}</span>
    </div>
));
PanelRow.displayName = 'PanelRow';

/**
 * Riquadro numerico: etichetta e icona in alto, valore grande sotto.
 * Il colore del valore si passa via className ('text-warning-foreground').
 */
const Stat = React.forwardRef(({ className, icon, label, value, children, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-xl border border-border bg-muted/30 p-4', className)} {...props}>
        <div className='flex items-center justify-between text-muted-foreground'>
            <span className='text-xs'>{label}</span>
            {icon ? <Icon name={icon} size='sm' /> : null}
        </div>
        <div className='mt-1 text-2xl font-semibold tabular-nums'>{value}</div>
        {children}
    </div>
));
Stat.displayName = 'Stat';

export { Panel, PanelRow, Stat };
