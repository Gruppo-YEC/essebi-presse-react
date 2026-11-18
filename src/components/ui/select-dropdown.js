import React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Select shadcn-style basata su Radix: dropdown con popper, check sull'opzione
 * selezionata, tastiera e typeahead. Usata dai campi `option` del framework.
 *
 * La `Select` nativa di ui/select.js resta per i contesti utilitari (filtri,
 * page-size) e per compatibilità con le pagine custom esistenti.
 *
 * Dentro un <form> Radix renderizza una select nativa nascosta, quindi
 * `required` partecipa a checkValidity() come prima; l'evidenziazione visiva
 * di .was-validated sul trigger è in tailwind.css via [data-slot=select-trigger].
 */

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef(({ className, size, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
        ref={ref}
        data-slot='select-trigger'
        className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card py-1 pl-3 pr-2.5 text-sm text-foreground transition-colors',
            'focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40',
            'disabled:cursor-default disabled:bg-muted disabled:opacity-70',
            'data-[placeholder]:text-muted-foreground [&>span]:truncate',
            size === 'sm' && 'h-8 pl-2',
            size === 'lg' && 'h-10 pl-4 text-base',
            className
        )}
        {...props}
    >
        {children}
        <SelectPrimitive.Icon asChild>
            <Icon name='chevron-down' className='shrink-0 text-muted-foreground' style={{ fontSize: 12 }} />
        </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = 'SelectTrigger';

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollUpButton
        ref={ref}
        className={cn('flex cursor-default items-center justify-center py-1', className)}
        {...props}
    >
        <Icon name='chevron-up' style={{ fontSize: 11 }} />
    </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = 'SelectScrollUpButton';

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
    <SelectPrimitive.ScrollDownButton
        ref={ref}
        className={cn('flex cursor-default items-center justify-center py-1', className)}
        {...props}
    >
        <Icon name='chevron-down' style={{ fontSize: 11 }} />
    </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

const SelectContent = React.forwardRef(({ className, children, position = 'popper', ...props }, ref) => (
    <SelectPrimitive.Portal>
        <SelectPrimitive.Content
            ref={ref}
            position={position}
            className={cn(
                'z-[1100] max-h-[min(380px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
                position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
                className
            )}
            {...props}
        >
            <SelectScrollUpButton />
            <SelectPrimitive.Viewport
                className={cn('p-1', position === 'popper' && 'w-full min-w-[var(--radix-select-trigger-width)]')}
            >
                {children}
            </SelectPrimitive.Viewport>
            <SelectScrollDownButton />
        </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
));
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
    <SelectPrimitive.Label
        ref={ref}
        className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)}
        {...props}
    />
));
SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
            'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className
        )}
        {...props}
    >
        <span className='flex w-4 shrink-0 items-center justify-center'>
            <SelectPrimitive.ItemIndicator>
                <Icon name='check' size='sm' />
            </SelectPrimitive.ItemIndicator>
        </span>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
));
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
    <SelectPrimitive.Separator
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-border', className)}
        {...props}
    />
));
SelectSeparator.displayName = 'SelectSeparator';

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
};
