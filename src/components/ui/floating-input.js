import React from 'react';
import { cn } from './utils';

/**
 * Input con etichetta flottante, equivalente del FloatingLabel di Bootstrap:
 * l'etichetta sta sopra il testo e si rimpicciolisce quando il campo è
 * compilato o a fuoco.
 */
const FloatingInput = React.forwardRef(({ className, label, id, ...props }, ref) => {
    const autoId = React.useId();
    const fieldId = id || autoId;
    return (
        <div className={cn('relative', className)}>
            <input
                ref={ref}
                id={fieldId}
                placeholder=" "
                className={cn(
                    'peer block h-[54px] w-full rounded-md border border-input bg-card px-3 pb-1.5 pt-5 text-sm text-foreground transition-colors',
                    'focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/40',
                    'disabled:bg-muted'
                )}
                {...props}
            />
            <label
                htmlFor={fieldId}
                className={cn(
                    'pointer-events-none absolute left-3 top-2 mb-0 text-xs text-muted-foreground transition-all',
                    'peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base',
                    'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs'
                )}
            >
                {label}
            </label>
        </div>
    );
});
FloatingInput.displayName = 'FloatingInput';

export { FloatingInput };
