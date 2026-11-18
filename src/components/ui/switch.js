import React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';
import { cn } from './utils';

const Switch = React.forwardRef(({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
        ref={ref}
        className={cn(
            'inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-input bg-card transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary',
            className
        )}
        {...props}
    >
        <SwitchPrimitive.Thumb
            className={cn(
                'pointer-events-none block h-4 w-4 rounded-full bg-muted-foreground shadow transition-transform translate-x-0.5',
                'data-[state=checked]:translate-x-[1.1rem] data-[state=checked]:bg-white'
            )}
        />
    </SwitchPrimitive.Root>
));
Switch.displayName = 'Switch';

/**
 * Switch con etichetta a fianco, equivalente di <Form.Check type="switch">.
 */
const SwitchField = React.forwardRef(({ className, label, id, ...props }, ref) => {
    const autoId = React.useId();
    const fieldId = id || autoId;
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Switch ref={ref} id={fieldId} {...props} />
            {label ? <label htmlFor={fieldId} className="cursor-pointer select-none">{label}</label> : null}
        </div>
    );
});
SwitchField.displayName = 'SwitchField';

export { Switch, SwitchField };
