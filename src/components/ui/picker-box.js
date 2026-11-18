import React from 'react';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Campo "picker" (externalEntity, file, address, …): un box alto come un
 * input con un piccolo bottone-icona integrato sul lato destro, in stile
 * shadcn input-group.
 *
 * - children: il valore da mostrare (badge, testo, anteprima) — se assente
 *   viene mostrato il placeholder
 * - icon / onAction: icona e click del bottoncino
 * - onClick: click sull'intero box (di solito apre lo stesso picker)
 */
const PickerBox = React.forwardRef(({ icon = 'ellipsis', onAction, onClick, children, placeholder = '', actionTitle, className, boxClassName, wrap = false, ...props }, ref) => (
    <div ref={ref} className={cn('relative w-full', className)} {...props}>
        <div
            onClick={onClick}
            className={cn(
                'flex w-full items-center gap-1.5 rounded-md border border-input bg-card py-1 pl-3 pr-10 text-sm text-foreground',
                /* wrap: con tanti elementi selezionati il box cresce su più righe,
                   invece di tagliarli fuori (multipleExternalEntity) */
                wrap ? 'h-auto min-h-9 flex-wrap gap-y-1' : 'h-9 overflow-hidden',
                onClick && 'cursor-pointer',
                boxClassName
            )}
        >
            {children || <span className='truncate text-muted-foreground'>{placeholder}</span>}
        </div>
        <button
            type='button'
            title={actionTitle}
            onClick={onAction}
            className={cn(
                'absolute right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-input bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                wrap ? 'top-1' : 'top-1/2 -translate-y-1/2'
            )}
        >
            <Icon name={icon} size='sm' />
        </button>
    </div>
));
PickerBox.displayName = 'PickerBox';

/**
 * Input invisibile che fa partecipare un campo picker a form.checkValidity().
 * Un input readonly/disabled/hidden è escluso dalla constraint validation
 * (un required su di esso non blocca nulla): questo è un input normale, solo
 * invisibile e fuori dal tab order, col valore legato alla selezione — lo
 * stesso schema del DatePicker. Va renderizzato in un contenitore relative.
 */
const PickerRequiredInput = ({ value }) => (
    <input
        type='text'
        value={value ? String(value) : ''}
        onChange={() => {}}
        required
        tabIndex={-1}
        aria-hidden='true'
        className='pointer-events-none absolute bottom-0 left-3 h-px w-px opacity-0'
    />
);
PickerRequiredInput.displayName = 'PickerRequiredInput';

/**
 * Dropzone per l'upload: area tratteggiata cliccabile con input file nascosto.
 */
const FileDropzone = ({ onChange, accept, label = 'Clicca per selezionare un file', hint, className }) => (
    <label
        className={cn(
            'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-6 py-10 text-center transition-colors hover:border-ring/60 hover:bg-muted/70',
            className
        )}
    >
        <Icon name='cloud-arrow-up' size='2x' className='text-muted-foreground' />
        <span className='text-sm font-medium'>{label}</span>
        {hint ? <span className='text-xs text-muted-foreground'>{hint}</span> : null}
        <input type='file' accept={accept} className='hidden' onChange={onChange} />
    </label>
);
FileDropzone.displayName = 'FileDropzone';

export { PickerBox, PickerRequiredInput, FileDropzone };
