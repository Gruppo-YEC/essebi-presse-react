/*
 * Componenti comuni alle pagine custom del catalogo: modale di modifica di un'entità
 * collegata, conferma di eliminazione, campo immagine con trascinamento del file.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { SwitchField } from '../../components/ui/switch';
import { Combobox } from '../../components/ui/combobox';
import { Spinner } from '../../components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../components/ui/dialog';
import Icon from '../../components/BodyElements/Icon';
import { codify, fileUrl, slugify, uploadImage } from './shared';

/**
 * Campo immagine: anteprima, sostituzione con clic o trascinando un file sopra, rimozione.
 * value è il file del gestionale ({ hash, extension, … }) o null.
 */
export function ImageField({ value, onChange, entity, label = 'Immagine' }) {
    const [busy, setBusy] = useState(false);
    const [over, setOver] = useState(false);
    const input = useRef(null);
    const url = fileUrl(value, entity);

    async function take(file) {
        if (!file) return;
        setBusy(true);
        const uploaded = await uploadImage(file, entity);
        setBusy(false);
        if (uploaded) onChange(uploaded);
    }

    return (
        <div className='flex flex-col gap-2'>
            <Label>{label}</Label>
            <div
                className={'relative flex h-36 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/40 ' + (over ? 'border-primary bg-primary/10' : 'border-border')}
                onClick={() => input.current?.click()}
                onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setOver(true); } }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
            >
                {busy ? <Spinner /> : url ? (
                    <img src={url} alt='' className='size-full object-cover' />
                ) : (
                    <span className='flex flex-col items-center gap-1 text-xs text-muted-foreground'>
                        <Icon name='image' size='lg' />
                        Trascina qui un'immagine o clicca
                    </span>
                )}
                {url && !busy && (
                    <button
                        type='button'
                        title='Rimuovi immagine'
                        className='absolute top-2 right-2 flex size-7 items-center justify-center rounded-md bg-background/90 text-danger shadow-xs'
                        onClick={(e) => { e.stopPropagation(); onChange(null); }}
                    >
                        <Icon name='xmark' />
                    </button>
                )}
            </div>
            <input ref={input} type='file' accept='image/*' hidden onChange={(e) => { take(e.target.files[0]); e.target.value = ''; }} />
        </div>
    );
}

/**
 * Modale di creazione/modifica di una riga, descritta da un elenco di campi:
 *   { key, label, type, … }
 *   type: 'text' | 'slug' (from: chiave sorgente) | 'code' (from) | 'textarea' | 'number'
 *         | 'switch' | 'select' (options [{ value, label }], clearable) | 'image' (entity)
 *   required: true  →  il salvataggio è bloccato finché è vuoto
 *   full: true      →  a tutta riga
 * initial: valori semplici (id, stringhe, numeri, file). onSave(values) → true se salvato.
 * Slug e codice si compilano dal campo sorgente finché non vengono toccati a mano.
 */
export function EntityDialog({ open, onOpenChange, title, fields, initial, onSave, saveLabel = 'Salva' }) {
    const [values, setValues] = useState({});
    const [touched, setTouched] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setValues({ ...(initial || {}) });
            // Su una riga esistente slug e codice non seguono più il nome: si cambiano solo a mano
            const locked = {};
            fields.forEach((f) => { if ((f.type === 'slug' || f.type === 'code') && initial && initial[f.key]) locked[f.key] = true; });
            setTouched(locked);
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    function set(key, value) {
        setValues((prev) => {
            const next = { ...prev, [key]: value };
            fields.forEach((f) => {
                if (f.from === key && !touched[f.key]) {
                    next[f.key] = f.type === 'code' ? codify(value) : slugify(value);
                }
            });
            return next;
        });
    }

    const missing = fields.filter((f) => f.required && (values[f.key] === undefined || values[f.key] === null || String(values[f.key]).trim() === ''));

    async function submit(e) {
        e.preventDefault();
        if (missing.length) return;
        setSaving(true);
        const ok = await onSave(values);
        setSaving(false);
        if (ok) onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size='lg'>
                <form onSubmit={submit}>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            {fields.map((f) => (
                                <div key={f.key} className={'flex flex-col gap-2 ' + (f.full || f.type === 'textarea' ? 'sm:col-span-2' : '')}>
                                    {f.type === 'switch' ? (
                                        <SwitchField
                                            id={'f-' + f.key}
                                            label={f.label}
                                            checked={!!values[f.key]}
                                            onCheckedChange={(v) => set(f.key, v ? 1 : 0)}
                                        />
                                    ) : f.type === 'image' ? (
                                        <ImageField label={f.label} entity={f.entity} value={values[f.key] || null} onChange={(v) => set(f.key, v)} />
                                    ) : (
                                        <>
                                            <Label htmlFor={'f-' + f.key}>
                                                {f.label}{f.required ? ' *' : ''}
                                            </Label>
                                            {f.type === 'textarea' ? (
                                                <Textarea id={'f-' + f.key} rows={4} value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                                            ) : f.type === 'select' ? (
                                                <Combobox
                                                    options={f.options}
                                                    value={values[f.key] ?? null}
                                                    clearable={f.clearable}
                                                    placeholder={f.placeholder || 'Seleziona…'}
                                                    onChange={(o) => set(f.key, o ? o.value : null)}
                                                />
                                            ) : (
                                                <Input
                                                    id={'f-' + f.key}
                                                    type={f.type === 'number' ? 'number' : 'text'}
                                                    step={f.step}
                                                    value={values[f.key] ?? ''}
                                                    className={f.type === 'slug' || f.type === 'code' ? 'font-mono text-xs' : ''}
                                                    onChange={(e) => {
                                                        if (f.type === 'slug' || f.type === 'code') setTouched((t) => ({ ...t, [f.key]: true }));
                                                        set(f.key, e.target.value);
                                                    }}
                                                />
                                            )}
                                            {f.help && <p className='mb-0 text-xs text-muted-foreground'>{f.help}</p>}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button type='button' variant='outline-secondary' onClick={() => onOpenChange(false)}>Annulla</Button>
                        <Button type='submit' disabled={saving || missing.length > 0}>
                            {saving && <Icon name='spinner' spin className='me-2' />}
                            {saveLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** Conferma di eliminazione: message spiega cosa succede; blocked impedisce l'eliminazione */
export function ConfirmDialog({ open, onOpenChange, title, message, blocked = false, onConfirm, confirmLabel = 'Elimina' }) {
    const [busy, setBusy] = useState(false);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent size='sm'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <p className='mb-0 text-sm'>{message}</p>
                </DialogBody>
                <DialogFooter>
                    <Button variant='outline-secondary' onClick={() => onOpenChange(false)}>{blocked ? 'Chiudi' : 'Annulla'}</Button>
                    {!blocked && (
                        <Button
                            variant='danger'
                            disabled={busy}
                            onClick={async () => {
                                setBusy(true);
                                const ok = await onConfirm();
                                setBusy(false);
                                if (ok !== false) onOpenChange(false);
                            }}
                        >
                            {busy && <Icon name='spinner' spin className='me-2' />}
                            {confirmLabel}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Pulsante icona compatto per le righe delle liste */
export function IconButton({ icon, title, onClick, danger = false, className = '' }) {
    return (
        <button
            type='button'
            title={title}
            aria-label={title}
            onClick={(e) => { e.stopPropagation(); onClick(e); }}
            className={'flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent ' + (danger ? 'hover:text-danger ' : 'hover:text-foreground ') + className}
        >
            <Icon name={icon} />
        </button>
    );
}

/** Riga vuota di aggiunta rapida: si scrive il nome e si preme Invio */
export function QuickAdd({ placeholder, onAdd, disabled = false, autoFocus = false, onCancel }) {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    async function add() {
        const name = text.trim();
        if (!name) return;
        setBusy(true);
        const ok = await onAdd(name);
        setBusy(false);
        if (ok) setText('');
    }
    return (
        <div className='flex gap-2'>
            <Input
                size='sm'
                value={text}
                disabled={disabled || busy}
                placeholder={placeholder}
                onChange={(e) => setText(e.target.value)}
                autoFocus={autoFocus}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); add(); }
                    if (e.key === 'Escape' && onCancel) onCancel();
                }}
            />
            <Button size='sm' variant='outline-primary' disabled={disabled || busy || !text.trim()} onClick={add}>
                <Icon name={busy ? 'spinner' : 'plus'} spin={busy} />
            </Button>
        </div>
    );
}
