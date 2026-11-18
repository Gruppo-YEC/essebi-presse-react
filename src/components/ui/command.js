import React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Command shadcn-style (libreria cmdk): lista filtrabile da tastiera,
 * base del Combobox. Di norma non si usa direttamente: vedi ui/combobox.js.
 */
const Command = React.forwardRef(({ className, ...props }, ref) => (
    <CommandPrimitive
        ref={ref}
        className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground', className)}
        {...props}
    />
));
Command.displayName = 'Command';

const CommandInput = React.forwardRef(({ className, ...props }, ref) => (
    <div className='flex items-center gap-2 border-b border-border px-3'>
        <Icon name='magnifying-glass' size='sm' className='shrink-0 opacity-50' />
        <CommandPrimitive.Input
            ref={ref}
            className={cn(
                'flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    </div>
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef(({ className, style, ...props }, ref) => (
    <CommandPrimitive.List
        ref={ref}
        className={cn('max-h-60 overflow-y-auto overflow-x-hidden p-1', className)}
        /* maxHeight inline + stopPropagation della rotella: senza, dentro un
           Dialog lo scroll-lock di Radix blocca lo scroll del popover portalato */
        style={{ maxHeight: 300, overscrollBehavior: 'contain', ...style }}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        {...props}
    />
));
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef((props, ref) => (
    <CommandPrimitive.Empty
        ref={ref}
        className='py-4 text-center text-sm text-muted-foreground'
        {...props}
    />
));
CommandEmpty.displayName = 'CommandEmpty';

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
    <CommandPrimitive.Group
        ref={ref}
        className={cn('overflow-hidden text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground', className)}
        {...props}
    />
));
CommandGroup.displayName = 'CommandGroup';

const CommandItem = React.forwardRef(({ className, ...props }, ref) => (
    <CommandPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
            'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
            className
        )}
        {...props}
    />
));
CommandItem.displayName = 'CommandItem';

const CommandLoading = CommandPrimitive.Loading;

export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandLoading };
