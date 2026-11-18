import React from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from './utils';

/**
 * Tooltip stile Bootstrap: fondo scuro, testo bianco, freccia.
 * `SimpleTooltip` è la scorciatoia usata dal framework:
 *   <SimpleTooltip content="testo" side="bottom"><span>target</span></SimpleTooltip>
 */
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(({ className, sideOffset = 4, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                'z-[1200] max-w-[220px] rounded-md bg-black/90 px-3 py-1.5 text-center text-sm text-white',
                'animate-in fade-in-0 zoom-in-95',
                className
            )}
            {...props}
        >
            {children}
            <TooltipPrimitive.Arrow className='fill-black/90' />
        </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

const SimpleTooltip = ({ content, side = 'bottom', children }) => (
    <TooltipProvider delayDuration={200}>
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side={side}>{content}</TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip };
