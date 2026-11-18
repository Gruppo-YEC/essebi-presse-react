import React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
const Slot = SlotPrimitive.Root;
import { cva } from 'class-variance-authority';
import { cn } from './utils';

/**
 * Button shadcn-style. Le varianti mantengono i nomi storici del framework
 * (primary, secondary, success, danger, warning, info, light, dark, outline-*)
 * ma il look è quello shadcn: compatto, font-medium, radius medio, hover soft.
 */
const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                'primary': 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
                'secondary': 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/85',
                'success': 'bg-success text-success-foreground shadow-xs hover:bg-success/90',
                'danger': 'bg-danger text-danger-foreground shadow-xs hover:bg-danger/90',
                'warning': 'bg-warning text-warning-foreground shadow-xs hover:bg-warning/85',
                'info': 'bg-info text-info-foreground shadow-xs hover:bg-info/85',
                'light': 'bg-light text-light-foreground hover:bg-accent',
                'dark': 'bg-dark text-dark-foreground shadow-xs hover:bg-dark/85',
                'outline-primary': 'border border-input bg-transparent text-primary shadow-xs hover:bg-primary/10',
                'outline-secondary': 'border border-input bg-transparent text-foreground/70 shadow-xs hover:bg-accent hover:text-accent-foreground',
                'outline-success': 'border border-input bg-transparent text-success shadow-xs hover:bg-success/10',
                'outline-danger': 'border border-input bg-transparent text-danger shadow-xs hover:bg-danger/10',
                'outline-warning': 'border border-input bg-transparent text-warning-foreground shadow-xs hover:bg-warning/20',
                'outline-info': 'border border-input bg-transparent text-info-foreground shadow-xs hover:bg-info/20',
                'outline-light': 'border border-input bg-transparent text-foreground/70 shadow-xs hover:bg-accent',
                'outline-dark': 'border border-input bg-transparent text-foreground shadow-xs hover:bg-accent',
                'ghost': 'hover:bg-accent hover:text-accent-foreground',
                'link': 'text-primary underline-offset-4 hover:underline'
            },
            size: {
                sm: 'h-8 rounded-md px-3 text-xs',
                default: 'h-9 px-4 py-2',
                lg: 'h-10 rounded-md px-6'
            }
        },
        defaultVariants: {
            variant: 'primary',
            size: 'default'
        }
    }
);

const Button = React.forwardRef(({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
        <Comp
            ref={ref}
            type={asChild ? undefined : (type || 'button')}
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    );
});
Button.displayName = 'Button';

export { Button, buttonVariants };
