import React from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { cn } from './utils';

/**
 * Popover shadcn-style: pannello ancorato a un trigger, per contenuti
 * interattivi (form, select, filtri). A differenza di DropdownMenu non ha
 * semantica da menu, quindi input e react-select ci funzionano dentro.
 */
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

const PopoverContent = React.forwardRef(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
            ref={ref}
            align={align}
            sideOffset={sideOffset}
            className={cn(
                'z-[1100] w-72 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
                className
            )}
            {...props}
        />
    </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent };
