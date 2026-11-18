import React, { useEffect, useState } from 'react';
import { cn } from './utils';
import { Spinner } from './spinner';
import Icon from '../BodyElements/Icon';

/**
 * Toast shadcn/sonner-style, senza dipendenze.
 *
 * API imperativa compatibile con l'uso storico del framework:
 *   toast.success('Salvato')
 *   toast.error('Errore')
 *   const id = toast.loading('Caricamento...')
 *   toast.update(id, { render: 'Fatto', type: 'success', isLoading: false, autoClose: 1500 })
 *
 * Il componente <Toaster /> va montato una sola volta (lo fa App.js).
 * Le opzioni non riconosciute (es. theme: 'colored') vengono ignorate.
 */

let listeners = [];
let toasts = [];
let count = 0;

function emit() {
    listeners.forEach((l) => l([...toasts]));
}

function scheduleDismiss(id, ms) {
    setTimeout(() => dismiss(id), ms);
}

function add(type, content, options = {}) {
    const id = ++count;
    const autoClose = options.autoClose !== undefined ? options.autoClose : 5000;
    toasts = [...toasts, { id, type, content, isLoading: type === 'loading' }];
    emit();
    if (type !== 'loading' && autoClose !== false) {
        scheduleDismiss(id, autoClose);
    }
    return id;
}

function dismiss(id) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
}

function update(id, { render, type = 'default', isLoading = false, autoClose = 5000 } = {}) {
    toasts = toasts.map((t) => t.id === id ? { ...t, content: render !== undefined ? render : t.content, type, isLoading } : t);
    emit();
    if (!isLoading && autoClose !== false) {
        scheduleDismiss(id, autoClose);
    }
}

export const toast = Object.assign(
    (content, options) => add('default', content, options),
    {
        success: (content, options) => add('success', content, options),
        error: (content, options) => add('error', content, options),
        info: (content, options) => add('info', content, options),
        warning: (content, options) => add('warning', content, options),
        loading: (content, options) => add('loading', content, options),
        update,
        dismiss
    }
);

const TYPE_ICON = {
    success: { name: 'circle-check', className: 'text-success' },
    error: { name: 'circle-xmark', className: 'text-danger' },
    warning: { name: 'triangle-exclamation', className: 'text-warning' },
    info: { name: 'circle-info', className: 'text-info' }
};

function ToastItem({ item }) {
    const icon = TYPE_ICON[item.type];
    return (
        <div
            role="status"
            className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg',
                'animate-in fade-in-0 slide-in-from-bottom-4'
            )}
        >
            {item.isLoading ? (
                <Spinner size="sm" className="mt-0.5 shrink-0 text-muted-foreground" />
            ) : icon ? (
                <span className={cn('mt-0.5 shrink-0', icon.className)}>
                    <Icon name={icon.name} size="lg" />
                </span>
            ) : null}
            <div className="grow [overflow-wrap:anywhere]">{item.content}</div>
            <button
                type="button"
                aria-label="Close"
                onClick={() => dismiss(item.id)}
                className="shrink-0 cursor-pointer rounded-sm opacity-50 transition-opacity hover:opacity-100"
            >
                <Icon name="xmark" />
            </button>
        </div>
    );
}

export function Toaster() {
    const [items, setItems] = useState(toasts);

    useEffect(() => {
        listeners.push(setItems);
        return () => {
            listeners = listeners.filter((l) => l !== setItems);
        };
    }, []);

    if (!items.length) return null;

    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[1200] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
            {items.map((item) => (
                <ToastItem key={item.id} item={item} />
            ))}
        </div>
    );
}
