import React, { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from './command';
import { Badge } from './badge';
import { Spinner } from './spinner';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Combobox shadcn-style (Popover + Command): la select ricercabile del
 * framework, sostituisce react-select.
 *
 * <Combobox>       selezione singola — onChange riceve l'opzione ({value,label}) o null
 * <MultiCombobox>  selezione multipla — onChange riceve l'array dei value
 *
 * Props comuni:
 * - options: [{ value, label }]
 * - placeholder / searchPlaceholder / emptyText
 * - onSearchChange(term): se presente il filtro è remoto (es. externalEntity
 *   con ricerca sul backend) e la lista non viene filtrata lato client
 * - loading: mostra lo spinner nella lista
 * - clearable, disabled, size ('sm')
 */

/* Lista: larga almeno quanto il trigger, ma può allargarsi fino a 440px per
   far stare le label lunghe (le external dei filtri colonna); oltre, la voce
   va a capo invece di essere troncata */
const listClasses = 'w-auto min-w-[var(--radix-popover-trigger-width)] max-w-[min(440px,var(--radix-popover-content-available-width))] max-h-[min(360px,var(--radix-popover-content-available-height))] overflow-hidden p-0 flex flex-col';

const triggerClasses = (size, disabled) => cn(
    'flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm text-foreground transition-colors',
    'focus:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
    size === 'sm' ? 'min-h-8 py-1' : 'min-h-9 py-1.5',
    disabled && 'pointer-events-none bg-muted opacity-70'
);

function Combobox({
    options = [],
    value = null,
    onChange,
    placeholder = 'Seleziona...',
    searchPlaceholder = 'Cerca...',
    emptyText = 'Nessun risultato',
    clearable = false,
    loading = false,
    onSearchChange,
    disabled = false,
    size,
    className
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find(o => String(o.value) === String(value)) || null;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button type='button' disabled={disabled} className={cn(triggerClasses(size, disabled), className)}>
                    <span className={cn('grow truncate text-left', !selected && 'text-muted-foreground')}>
                        {selected ? selected.label : placeholder}
                    </span>
                    {clearable && selected ? (
                        <span
                            role='button'
                            className='shrink-0 opacity-50 hover:opacity-100'
                            onClick={(e) => { e.stopPropagation(); onChange(null); }}
                        >
                            <Icon name='xmark' size='sm' />
                        </span>
                    ) : null}
                    <Icon name='sort' size='sm' className='shrink-0 opacity-50' />
                </button>
            </PopoverTrigger>
            <PopoverContent className={listClasses} align='start'>
                <Command shouldFilter={!onSearchChange}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        onValueChange={onSearchChange ? (term) => onSearchChange(term) : undefined}
                    />
                    <CommandList>
                        {loading ? (
                            <div className='py-3 text-center'><Spinner size='sm' className='text-muted-foreground' /></div>
                        ) : (
                            <CommandEmpty>{emptyText}</CommandEmpty>
                        )}
                        {options.map((opt) => (
                            <CommandItem
                                key={String(opt.value)}
                                value={String(opt.value)}
                                keywords={[String(opt.label)]}
                                onSelect={() => { onChange(opt); setOpen(false); }}
                            >
                                <Icon name='check' size='sm' className={cn('shrink-0', String(opt.value) === String(value) ? 'opacity-100' : 'opacity-0')} />
                                <span className='min-w-0 break-words'>{opt.label}</span>
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function MultiCombobox({
    options = [],
    values = [],
    onChange,
    placeholder = 'Seleziona...',
    searchPlaceholder = 'Cerca...',
    emptyText = 'Nessun risultato',
    loading = false,
    onSearchChange,
    closeOnSelect = false,
    disabled = false,
    size,
    className
}) {
    const [open, setOpen] = useState(false);
    const stringValues = values.map(String);
    const selectedOptions = options.filter(o => stringValues.includes(String(o.value)));

    function toggle(opt) {
        const v = String(opt.value);
        if (stringValues.includes(v)) {
            onChange(values.filter(x => String(x) !== v));
        }
        else {
            onChange([...values, opt.value]);
        }
        if (closeOnSelect) setOpen(false);
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button type='button' disabled={disabled} className={cn(triggerClasses(size, disabled), 'h-auto', className)}>
                    {selectedOptions.length ? (
                        <span className='flex min-w-0 grow flex-wrap gap-1 text-left'>
                            {selectedOptions.map((opt) => (
                                <Badge key={String(opt.value)} variant='secondary' className='max-w-full whitespace-normal text-left'>
                                    <span className='min-w-0 break-words'>{opt.label}</span>
                                    <span
                                        role='button'
                                        className='opacity-60 hover:opacity-100'
                                        onClick={(e) => { e.stopPropagation(); toggle(opt); }}
                                    >
                                        <Icon name='xmark' style={{ fontSize: 10 }} />
                                    </span>
                                </Badge>
                            ))}
                        </span>
                    ) : (
                        <span className='grow truncate text-left text-muted-foreground'>{placeholder}</span>
                    )}
                    <Icon name='sort' size='sm' className='shrink-0 opacity-50' />
                </button>
            </PopoverTrigger>
            <PopoverContent className={listClasses} align='start'>
                <Command shouldFilter={!onSearchChange}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        onValueChange={onSearchChange ? (term) => onSearchChange(term) : undefined}
                    />
                    <CommandList>
                        {loading ? (
                            <div className='py-3 text-center'><Spinner size='sm' className='text-muted-foreground' /></div>
                        ) : (
                            <CommandEmpty>{emptyText}</CommandEmpty>
                        )}
                        {options.map((opt) => (
                            <CommandItem
                                key={String(opt.value)}
                                value={String(opt.value)}
                                keywords={[String(opt.label)]}
                                onSelect={() => toggle(opt)}
                            >
                                <Icon name='check' size='sm' className={cn('shrink-0', stringValues.includes(String(opt.value)) ? 'opacity-100' : 'opacity-0')} />
                                <span className='min-w-0 break-words'>{opt.label}</span>
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

export { Combobox, MultiCombobox };
