import React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { cn } from './utils';

/**
 * Tabs shadcn-style: lista a "pillole" su sfondo muted,
 * tab attiva su sfondo card con ombra leggera.
 */
const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.List
        ref={ref}
        className={cn(
            /* h-auto + min-h: con tante tab su mobile la lista va a capo su più
               righe e il contenitore deve crescere, non tagliarle fuori. */
            'inline-flex h-auto min-h-9 w-fit max-w-full flex-wrap items-center justify-center gap-y-1 rounded-lg bg-muted p-1 text-muted-foreground',
            className
        )}
        {...props}
    />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger
        ref={ref}
        className={cn(
            'inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
            'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
            'disabled:pointer-events-none disabled:opacity-50',
            className
        )}
        {...props}
    />
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
    <TabsPrimitive.Content
        ref={ref}
        className={cn('pt-4 outline-none', className)}
        {...props}
    />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
