import React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

/**
 * Dialog shadcn-style basato su Radix: centrato, sopra header e sidebar.
 *
 * Uso tipico nel framework:
 *   <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose() }}>
 *     <DialogContent size="lg">
 *       <DialogHeader><DialogTitle>...</DialogTitle></DialogHeader>
 *       <DialogBody>...</DialogBody>
 *       <DialogFooter>...</DialogFooter>
 *     </DialogContent>
 *   </Dialog>
 *
 * `size`: 'sm' | 'default'/'md' | 'lg' | 'xl' | 'fullscreen'.
 */
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            /* sopra header (z-1020) e sidebar (z-1021).
               Stesso z-index del contenuto: così, a parità di z, vince l'ordine
               nel DOM e l'overlay di un dialog aperto sopra un altro oscura
               anche il dialog precedente, non solo lo sfondo. */
            'fixed inset-0 z-[1050] bg-black/60',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
            className
        )}
        {...props}
    />
));
DialogOverlay.displayName = 'DialogOverlay';

const sizeClasses = {
    sm: 'max-w-sm',
    default: 'max-w-lg',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    xl: 'max-w-6xl',
    fullscreen: 'max-w-none w-screen h-dvh rounded-none border-0'
};

/**
 * Come in shadcn: "X" in alto a destra, più i bottoni di chiusura nel
 * DialogFooter. `hideClose` toglie la X (es. modali bloccanti).
 */
const DialogContent = React.forwardRef(({ className, size = 'default', hideClose = false, children, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                'fixed left-1/2 top-1/2 z-[1050] flex w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
                'rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none duration-200',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
                size === 'fullscreen' ? 'max-h-dvh' : 'max-h-[calc(100dvh-4rem)]',
                sizeClasses[size] || sizeClasses.default,
                className
            )}
            {...props}
        >
            {children}
            {!hideClose && (
                <DialogPrimitive.Close
                    /* h-[18px] = riga del titolo (text-lg leading-none) e top uguale
                       al padding del header: X e titolo condividono lo stesso asse */
                    className="absolute right-4 top-3.5 flex h-[18px] cursor-pointer items-center rounded-sm opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label="Close"
                >
                    <Icon name="xmark" />
                </DialogPrimitive.Close>
            )}
        </DialogPrimitive.Content>
    </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }) => (
    <div className={cn('flex shrink-0 flex-col gap-1 rounded-t-xl border-b border-border bg-muted/60 px-5 py-3.5 pr-12', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn('mb-0 text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
    />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
DialogDescription.displayName = 'DialogDescription';

const DialogBody = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('grow overflow-y-auto px-5 py-2', className)} {...props} />
));
DialogBody.displayName = 'DialogBody';

const DialogFooter = ({ className, ...props }) => (
    <div className={cn('flex shrink-0 flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-border bg-muted/60 px-5 py-3', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

export {
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogClose,
    DialogOverlay,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogBody,
    DialogFooter
};
