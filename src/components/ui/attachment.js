import React from 'react';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Attachment shadcn-style: tile con anteprima (thumbnail per le immagini,
 * icona per gli altri file), nome, estensione e azioni a destra.
 * Usato dal campo `file` per mostrare il valore caricato.
 *
 * - name / extension: nome file e estensione (per l'icona e il sottotitolo)
 * - thumbnail: url dell'anteprima; se assente si usa l'icona per estensione
 * - onOpen: click su anteprima o nome (tipicamente apre il file)
 * - actions: [{ icon, title, onClick, danger }]
 */

const EXT_ICONS = {
    pdf: 'file-pdf',
    doc: 'file-word', docx: 'file-word',
    xls: 'file-excel', xlsx: 'file-excel', csv: 'file-csv',
    ppt: 'file-powerpoint', pptx: 'file-powerpoint',
    zip: 'file-zipper', rar: 'file-zipper', '7z': 'file-zipper',
    txt: 'file-lines', md: 'file-lines',
    mp3: 'file-audio', wav: 'file-audio',
    mp4: 'file-video', mov: 'file-video', avi: 'file-video',
    jpg: 'file-image', jpeg: 'file-image', png: 'file-image', gif: 'file-image', webp: 'file-image', svg: 'file-image',
};

function iconForExtension(extension) {
    const ext = String(extension || '').toLowerCase();
    return EXT_ICONS[ext] || 'file';
}

const Attachment = React.forwardRef(({ name, extension, thumbnail, onOpen, actions = [], className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex w-full items-center gap-3 rounded-lg border border-input bg-card p-2 text-sm',
            className
        )}
        {...props}
    >
        <div
            onClick={onOpen}
            className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted',
                onOpen && 'cursor-pointer'
            )}
        >
            {thumbnail ? (
                <img src={thumbnail} alt='' className='h-full w-full object-cover' style={{ maxWidth: 'none' }} />
            ) : (
                <Icon name={iconForExtension(extension)} className='text-muted-foreground' size='lg' />
            )}
        </div>

        <div className={cn('min-w-0 flex-1', onOpen && 'cursor-pointer')} onClick={onOpen}>
            <div className='truncate font-medium'>{name}</div>
            {extension ? (
                <div className='text-xs uppercase text-muted-foreground'>{extension}</div>
            ) : null}
        </div>

        {actions.map((action, i) => (
            <button
                key={i}
                type='button'
                title={action.title}
                onClick={(e) => { e.stopPropagation(); action.onClick && action.onClick(e); }}
                className={cn(
                    'flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                    action.danger ? 'hover:text-danger' : 'hover:text-foreground'
                )}
            >
                <Icon name={action.icon} size='sm' />
            </button>
        ))}
    </div>
));
Attachment.displayName = 'Attachment';

export { Attachment };
