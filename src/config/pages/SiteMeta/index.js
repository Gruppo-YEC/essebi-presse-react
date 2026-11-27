/*
 * Impostazioni del sito (27/11/2026): /page/SiteMeta?key=<chiave>
 * Tabella site_meta, chiave → valore in testo semplice. Le chiavi sono fisse (keys.js) e
 * ognuna ha una riga sola: la pagina crea la riga se manca e altrimenti aggiorna quella
 * esistente; il controllo sui doppioni (hooks/uniqueFields.js) blocca anche gli inserimenti
 * dalla lista standard. A sinistra le chiavi con il loro stato; a destra il valore, i controlli
 * e l'anteprima di come lo userà il sito.
 * La barra annunci ha la sua tabella e la sua voce di menu (site_announcement).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Spinner } from '../../../components/ui/spinner';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';
import { AuthorizationManager } from '../../../core/authorization-manager';
import { listAll, opt, optOf, saveRow } from '../../catalog/shared';
import { META_KEYS, recipients } from './keys';
import './style.css';

const ENTITY = 'site_meta';

const can = (action) => !!AuthorizationManager.getAuthMap() && !!AuthorizationManager.checkEntityActionAuth(ENTITY, action);
const showDate = (v) => (v ? new Date(String(v).replace(' ', 'T')).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }) : '');

/** Stato di una chiave nella lista */
function keyStatus(def, rows) {
    if (!rows.length) return { label: 'Da creare', variant: 'warning' };
    if (def.check(rows[0].metaValue || '').errors.length) return { label: 'Da correggere', variant: 'danger' };
    return { label: 'Configurata', variant: 'success' };
}

export default function SiteMeta() {
    const [params, setParams] = useSearchParams();
    const current = META_KEYS.find((k) => k.key === params.get('key')) || META_KEYS[0];
    const [rows, setRows] = useState(null);
    const [text, setText] = useState('');
    const [savedText, setSavedText] = useState('');
    const [saving, setSaving] = useState(false);

    async function load() {
        try {
            setRows(await listAll(ENTITY, { order: [{ field: 'id', order: 'DESC' }] }));
        } catch (e) {
            toast.error(e.message);
            setRows([]);
        }
    }
    useEffect(() => { load(); }, []);

    // Righe per chiave, la più recente prima (è quella che legge il sito)
    const byKey = useMemo(() => {
        const out = {};
        META_KEYS.forEach((k) => { out[k.key] = []; });
        (rows || []).forEach((r) => { const k = optOf(r.metaKey); if (out[k]) out[k].push(r); });
        return out;
    }, [rows]);
    const row = byKey[current.key]?.[0] || null;

    // Cambiando chiave (o dopo un salvataggio) il campo riparte dal valore salvato
    useEffect(() => {
        if (rows === null) return;
        const start = row ? row.metaValue || '' : '';
        setText(start);
        setSavedText(start);
    }, [current.key, rows]); // eslint-disable-line react-hooks/exhaustive-deps

    const dirty = text !== savedText;
    useEffect(() => {
        if (!dirty) return;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const checks = current.check(text);
    const allowed = row ? can('edit') : can('create');
    const canSave = allowed && (dirty || (!row && text.trim() !== '')) && checks.errors.length === 0 && !saving;

    function open(key) {
        if (key === current.key) return;
        if (dirty && !window.confirm('Ci sono modifiche non salvate. Vuoi lasciarle?')) return;
        setParams({ key });
    }

    async function save() {
        if (!canSave) return;
        setSaving(true);
        // Nuova riga solo se la chiave manca: il controllo sui doppioni (preInsert) fa il resto
        const id = await saveRow(ENTITY, { metaKey: opt(current.key), metaValue: text.trim() }, row?.id || null);
        setSaving(false);
        if (!id) return;
        toast.success(`${current.label} salvata`);
        await load();
    }

    if (rows === null) return <div className='flex justify-center py-10'><Spinner /></div>;

    const Field = current.multiline ? Textarea : Input;

    return (
        <div className='site-meta'>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                    <h3 className='mb-0'>Impostazioni sito</h3>
                    {dirty && <span className='text-xs text-warning-foreground'>Modifiche non salvate</span>}
                </div>
                <div className='flex items-center gap-2'>
                    {dirty && (
                        <Button size='sm' variant='outline-secondary' onClick={() => setText(savedText)}>
                            <Icon name='rotate-left' className='me-2' />Annulla modifiche
                        </Button>
                    )}
                    <Button size='sm' disabled={!canSave} onClick={save}>
                        <Icon name={saving ? 'spinner' : 'floppy-disk'} spin={saving} className='me-2' />
                        {row ? 'Salva' : 'Crea'}
                    </Button>
                </div>
            </div>

            <div className='grid gap-3 lg:grid-cols-[18rem_1fr]'>
                {/* Chiavi */}
                <Card className='self-start'>
                    <CardBody className='flex flex-col gap-1 p-2'>
                        {META_KEYS.map((k) => {
                            const status = keyStatus(k, byKey[k.key]);
                            const active = k.key === current.key;
                            return (
                                <button
                                    key={k.key}
                                    type='button'
                                    onClick={() => open(k.key)}
                                    aria-current={active ? 'page' : undefined}
                                    className={'flex items-start gap-3 rounded-md px-3 py-2 text-start ' + (active ? 'bg-accent' : 'hover:bg-accent/60')}
                                >
                                    <Icon name={k.icon} className='mt-1 shrink-0 text-muted-foreground' />
                                    <span className='min-w-0 flex-1'>
                                        <span className='block text-sm font-medium'>{k.label}</span>
                                        <span className='block truncate font-mono text-xs text-muted-foreground'>{k.key}</span>
                                    </span>
                                    <Badge variant={status.variant} className='mt-0.5'>{status.label}</Badge>
                                </button>
                            );
                        })}
                    </CardBody>
                </Card>

                <div className='flex min-w-0 flex-col gap-3'>
                    {/* Valore */}
                    <Card>
                        <CardBody className='flex flex-col gap-3'>
                            <div>
                                <p className='mb-0 text-sm font-medium'>{current.label}</p>
                                <p className='mb-0 text-xs text-muted-foreground'>{current.help}</p>
                            </div>
                            {byKey[current.key].length > 1 && (
                                <p className='mb-0 rounded-md bg-warning/15 px-3 py-2 text-xs'>
                                    Ci sono {byKey[current.key].length} righe per questa chiave: il sito usa la più recente (qui sotto). Elimina le altre dalla lista standard.
                                </p>
                            )}
                            <div className='flex flex-col gap-2'>
                                <div className='flex items-center justify-between gap-2'>
                                    <Label htmlFor='meta-value'>Valore</Label>
                                    {!text.trim() && (
                                        <button type='button' className='text-xs text-primary hover:underline' onClick={() => setText(current.example)}>
                                            Usa l'esempio ({current.example})
                                        </button>
                                    )}
                                </div>
                                <Field
                                    id='meta-value'
                                    className='font-mono text-sm'
                                    rows={current.multiline ? 3 : undefined}
                                    value={text}
                                    placeholder={current.placeholder}
                                    disabled={!allowed}
                                    aria-invalid={checks.errors.length > 0 || undefined}
                                    onChange={(e) => setText(e.target.value)}
                                />
                                <p className='mb-0 text-xs text-muted-foreground'>
                                    {current.format} {row ? `Ultima modifica ${showDate(row.lastUpdate || row.date)}.` : 'Non ancora creata: verrà creata al salvataggio.'}
                                </p>
                            </div>
                            <Checks checks={checks} />
                            {!allowed && <p className='mb-0 text-xs text-muted-foreground'>Il tuo utente può vedere questa impostazione ma non {row ? 'modificarla' : 'crearla'}.</p>}
                        </CardBody>
                    </Card>

                    {/* Anteprima */}
                    <Card>
                        <CardBody className='flex flex-col gap-3'>
                            <p className='mb-0 text-sm font-medium'>Anteprima</p>
                            {current.key === 'admin_email' ? <EmailPreview text={text} /> : <VersionPreview text={text} />}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
}

/** Esito dei controlli sotto il campo */
function Checks({ checks }) {
    if (!checks.errors.length && !checks.warnings.length) {
        return <p className='mb-0 flex items-center gap-2 text-xs text-success'><Icon name='circle-check' />Valore valido</p>;
    }
    return (
        <ul className='mb-0 flex list-none flex-col gap-1 p-0 text-xs'>
            {checks.errors.map((m) => <li key={'e' + m} className='flex items-start gap-2 text-danger'><Icon name='circle-xmark' className='mt-0.5' />{m}</li>)}
            {checks.warnings.map((m) => <li key={'w' + m} className='flex items-start gap-2 text-warning-foreground'><Icon name='triangle-exclamation' className='mt-0.5' />{m}</li>)}
        </ul>
    );
}

/* -------------------------------------------------------------- anteprime */

function EmailPreview({ text }) {
    const list = recipients(text);
    if (!list.length) return <p className='mb-0 text-xs text-muted-foreground'>Nessun destinatario.</p>;
    return (
        <div className='flex flex-col gap-2'>
            <p className='mb-0 text-xs text-muted-foreground'>Ogni richiesta dal sito arriva a:</p>
            <ul className='mb-0 flex list-none flex-wrap gap-2 p-0'>
                {list.map((r, i) => (
                    <li key={r.email + i} className={'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ' + (r.ok ? '' : 'border-danger text-danger')}>
                        <Icon name={r.ok ? 'envelope' : 'circle-xmark'} className={r.ok ? 'text-muted-foreground' : ''} />{r.email}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function VersionPreview({ text }) {
    const version = String(text || '').trim();
    return version ? (
        <div className='flex items-center gap-3'>
            <span className='rounded-md border px-3 py-1.5 font-mono text-lg'>v{version}</span>
            <span className='text-xs text-muted-foreground'>Quella che il sito riceve da /public/site_meta.</span>
        </div>
    ) : (
        <p className='mb-0 text-xs text-muted-foreground'>Nessuna versione.</p>
    );
}
