import React from 'react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { cn } from './utils';
import Icon from '../BodyElements/Icon';

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-input bg-card cursor-pointer align-middle',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground',
            className
        )}
        {...props}
    >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
            <Icon name="check" style={{ fontSize: 10 }} />
        </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

/**
 * Checkbox con etichetta a fianco, equivalente di <Form.Check>.
 */
const CheckField = React.forwardRef(({ className, label, id, ...props }, ref) => {
    const autoId = React.useId();
    const fieldId = id || autoId;
    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Checkbox ref={ref} id={fieldId} {...props} />
            {label ? <label htmlFor={fieldId} className="cursor-pointer select-none">{label}</label> : null}
        </div>
    );
});
CheckField.displayName = 'CheckField';

export { Checkbox, CheckField };
