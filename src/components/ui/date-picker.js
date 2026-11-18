import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import { Popover, PopoverAnchor, PopoverTrigger, PopoverContent } from './popover';
import { Calendar } from './calendar';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Date picker shadcn-style: input di testo in cui la data si può scrivere
 * direttamente, più un bottone-calendario che apre il Calendar in un Popover.
 * Lavora su stringhe 'YYYY-MM-DD' (il formato dei constraint e del database);
 * a video la data è mostrata come DD/MM/YYYY.
 *
 * Digitando si accettano 12/03/2024, 12-03-2024, 12.03.2024, 12032024,
 * 1/3/2024 e 2024-03-12: appena il testo è una data completa il valore si
 * aggiorna (e il calendario, se aperto, si sposta su quel mese). Uscendo dal
 * campo un testo non valido torna all'ultimo valore buono; un anno a due
 * cifre (12/03/24) viene accettato solo all'uscita, per non interpretare
 * "12/03/20" mentre si sta ancora scrivendo "12/03/2024".
 *
 * <DatePicker value={filterValue} onChange={(v) => setFilterValue(v)} size="sm" />
 */

const DISPLAY_FORMAT = 'DD/MM/YYYY';
const TYPED_FORMATS = ['DD/MM/YYYY', 'D/M/YYYY', 'DD-MM-YYYY', 'D-M-YYYY', 'DD.MM.YYYY', 'D.M.YYYY', 'DDMMYYYY', 'YYYY-MM-DD'];
const TYPED_FORMATS_LOOSE = [...TYPED_FORMATS, 'DD/MM/YY', 'D/M/YY', 'DD-MM-YY', 'D-M-YY', 'DD.MM.YY', 'D.M.YY', 'DDMMYY'];

function toDisplay(value) {
    return value ? moment(value, 'YYYY-MM-DD').format(DISPLAY_FORMAT) : '';
}

function parseTyped(text, loose = false) {
    const t = String(text || '').trim();
    if (!t) return null;
    const m = moment(t, loose ? TYPED_FORMATS_LOOSE : TYPED_FORMATS, true);
    return m.isValid() ? m.format('YYYY-MM-DD') : null;
}

const DatePicker = ({ value, onChange, placeholder = 'gg/mm/aaaa', size, disabled, required = false, className }) => {

    const [open, setOpen] = useState(false);
    const [text, setText] = useState(toDisplay(value));
    const selected = value ? moment(value, 'YYYY-MM-DD').toDate() : undefined;
    const [month, setMonth] = useState(selected || new Date());
    const focused = useRef(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // il valore può cambiare da fuori (reset del form, scelta dal calendario):
    // l'input lo segue, ma non mentre l'utente ci sta scrivendo dentro
    useEffect(() => {
        if (!focused.current) setText(toDisplay(value));
        if (value) setMonth(moment(value, 'YYYY-MM-DD').toDate());
    }, [value]);

    function emit(v) {
        if (onChange && v !== (value || '')) onChange(v);
    }

    /* alla fine della digitazione (blur, Enter): testo valido → valore,
       vuoto → svuota, altro → torna all'ultimo valore buono */
    function commit(raw) {
        const t = String(raw || '').trim();
        if (!t) {
            emit('');
            setText('');
            return;
        }
        const parsed = parseTyped(t, true);
        if (parsed) {
            emit(parsed);
            setText(toDisplay(parsed));
        }
        else {
            setText(toDisplay(value));
        }
    }

    function handleInput(e) {
        const t = e.target.value;
        setText(t);
        if (!t.trim()) {
            emit('');
            return;
        }
        const parsed = parseTyped(t, false);
        if (parsed) emit(parsed);
    }

    function handleOpenChange(o) {
        if (o) setMonth(selected || new Date());
        setOpen(o);
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverAnchor asChild>
                <div
                    ref={wrapperRef}
                    data-slot='date-picker-trigger'
                    data-required={required ? 'true' : undefined}
                    data-placeholder={value ? undefined : ''}
                    data-disabled={disabled ? 'true' : undefined}
                    className={cn(
                        'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-card py-1 pl-3 pr-1 text-sm text-foreground transition-colors',
                        'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40',
                        disabled && 'bg-muted opacity-70',
                        size === 'sm' && 'h-8 pl-2',
                        size === 'lg' && 'h-10 pl-4 text-base',
                        className
                    )}
                >
                    <input
                        ref={inputRef}
                        type='text'
                        value={text}
                        placeholder={placeholder}
                        disabled={disabled}
                        required={required}
                        autoComplete='off'
                        onFocus={() => { focused.current = true; }}
                        onBlur={(e) => { focused.current = false; commit(e.target.value); }}
                        onChange={handleInput}
                        onClick={() => { if (!disabled && !open) handleOpenChange(true); }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commit(e.currentTarget.value);
                            if (e.key === 'ArrowDown' && !open) { e.preventDefault(); handleOpenChange(true); }
                        }}
                        className='min-w-0 grow bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-default'
                    />
                    {value && onChange && !disabled ? (
                        <button
                            type='button'
                            tabIndex={-1}
                            title='Svuota'
                            className='flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground'
                            onClick={() => { emit(''); setText(''); }}
                        >
                            <Icon name='xmark' size='sm' />
                        </button>
                    ) : null}
                    <PopoverTrigger asChild>
                        <button
                            type='button'
                            tabIndex={-1}
                            disabled={disabled}
                            title='Apri il calendario'
                            className='flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:hover:bg-transparent'
                        >
                            <Icon name='calendar' size='sm' />
                        </button>
                    </PopoverTrigger>
                </div>
            </PopoverAnchor>
            <PopoverContent
                className='w-auto p-0'
                align='start'
                /* il focus resta nell'input: si può continuare a scrivere col
                   calendario aperto, e il calendario segue quel che si scrive */
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                /* click sull'input o sui bottoni del campo: non è "fuori" */
                onInteractOutside={(e) => {
                    if (wrapperRef.current && wrapperRef.current.contains(e.target)) e.preventDefault();
                }}
            >
                <Calendar
                    mode='single'
                    selected={selected}
                    month={month}
                    onMonthChange={setMonth}
                    onSelect={(d) => {
                        const v = d ? moment(d).format('YYYY-MM-DD') : '';
                        emit(v);
                        setText(toDisplay(v));
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
};
DatePicker.displayName = 'DatePicker';

export { DatePicker };
