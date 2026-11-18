/**
 * <WidgetAi /> : la griglia dei widget dell'assistente, da mettere nella
 * dashboard del progetto (src/config/Dashboard.js):
 *
 *   import WidgetAi from '../pages/ai/WidgetAi';
 *   ...
 *   <WidgetAi />
 *
 * Una barra con il periodo (preset a pillole + "dal / al") vale per tutti i
 * widget; ogni card esegue la propria query sul periodo tramite
 * /ai/widget_run, senza modello. Un widget che non dipende dalle date lo
 * dice nella card.
 *
 * MODIFICA: il bottone "Modifica" apre una modalita' in cui le card si
 * trascinano per riordinarle (HTML5 drag and drop, niente librerie), si
 * sceglie la larghezza (⅓, ½, intera: vale su desktop, da mobile e' sempre
 * intera), si rinomina e si elimina. Fuori dalla modifica le card sono
 * pulite: titolo, grafico o numero, aggiorna.
 *
 * Tutto per utente. Non mostra nulla a chi non puo' usare l'assistente o
 * non ha widget.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DatePicker } from '../../components/ui/date-picker';
import { Spinner } from '../../components/ui/spinner';
import { Input } from '../../components/ui/input';
import { SimpleTooltip } from '../../components/ui/tooltip';
import { toast } from '../../components/ui/toast';
import Icon from '../../components/BodyElements/Icon';
import { LoginManager } from '../../core/login-manager';
import { isAssistantAllowed } from './aiClient';
import ChartBlock from './ChartBlock';
import { formatValue } from './charts';
import {
    PRESETS, presetRange, loadPeriod, savePeriod, formatPeriod,
    listWidgets, runWidget, renameWidget, resizeWidget, reorderWidgets, deleteWidget,
} from './widgets';
import './style.css';

const SIZES = [
    ['third', '⅓', 'Un terzo'],
    ['half', '½', 'Meta\''],
    ['full', '1', 'Intera'],
];

export default function WidgetAi({ title = 'I miei widget' }) {
    const allowed = isAssistantAllowed(LoginManager.getUserInfo());
    const [widgets, setWidgets] = useState(null);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState(loadPeriod);
    const [editing, setEditing] = useState(false);
    const [dragId, setDragId] = useState(null);
    const [overId, setOverId] = useState(null);

    const refresh = useCallback(async () => {
        try {
            setWidgets(await listWidgets());
            setError(null);
        } catch (e) {
            setError(e?.message || 'Widget non disponibili.');
        }
    }, []);

    useEffect(() => {
        if (allowed) refresh();
    }, [allowed, refresh]);

    /* --- periodo ------------------------------------------------------- */

    function changePreset(key) {
        const next = key === 'custom' ? { preset: 'custom', from: period.from, to: period.to } : { preset: key, ...presetRange(key) };
        setPeriod(next);
        savePeriod(next);
    }

    function changeDate(field, value) {
        if (!value) return;
        const next = { ...period, preset: 'custom', [field]: value };
        setPeriod(next);
        savePeriod(next);
    }

    /* --- modifica ------------------------------------------------------ */

    async function persistOrder(list) {
        try { await reorderWidgets(list.map((w) => w.id)); } catch (e) { toast.error(e?.message || 'Ordine non salvato.'); }
    }

    function onDragStart(id) {
        setDragId(id);
    }

    function onDragOverCard(e, id) {
        if (dragId === null || id === dragId) return;
        e.preventDefault();
        if (overId !== id) setOverId(id);
    }

    function onDropCard(e, targetId) {
        e.preventDefault();
        if (dragId === null || targetId === dragId) { setDragId(null); setOverId(null); return; }
        const list = [...widgets];
        const from = list.findIndex((w) => w.id === dragId);
        const to = list.findIndex((w) => w.id === targetId);
        if (from < 0 || to < 0) return;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        setWidgets(list);
        setDragId(null);
        setOverId(null);
        persistOrder(list);
    }

    function onDragEnd() {
        setDragId(null);
        setOverId(null);
    }

    async function resize(w, size) {
        if (size === w.size) return;
        setWidgets((prev) => prev.map((x) => (x.id === w.id ? { ...x, size } : x)));
        try { await resizeWidget(w.id, size); } catch (e) { toast.error(e?.message || 'Larghezza non salvata.'); refresh(); }
    }

    async function remove(w) {
        setWidgets((prev) => prev.filter((x) => x.id !== w.id));
        try { await deleteWidget(w.id); } catch (e) { toast.error(e?.message || 'Eliminazione non riuscita.'); refresh(); }
    }

    async function rename(w, name) {
        const t = String(name || '').trim();
        if (!t || t === w.title) return;
        setWidgets((prev) => prev.map((x) => (x.id === w.id ? { ...x, title: t } : x)));
        try { await renameWidget(w.id, t); } catch (e) { toast.error(e?.message || 'Titolo non salvato.'); refresh(); }
    }

    if (!allowed || widgets === null || (widgets.length === 0 && !error)) return null;

    return (
        <section className={'ai-assistant ai-widgets' + (editing ? ' is-editing' : '')}>
            <div className='ai-widgets-head'>
                <div className='ai-widgets-heading'>
                    <h3 className='ai-widgets-title'><Icon name='wand-magic-sparkles' size='sm' className='me-2' />{title}</h3>
                    <span className='ai-widgets-count'>{widgets.length}</span>
                </div>

                <div className='ai-widgets-toolbar'>
                    <div className='ai-widgets-presets' role='group' aria-label='Periodo'>
                        {PRESETS.map(([k, label]) => (
                            <button
                                key={k}
                                type='button'
                                className={'ai-widgets-preset' + (period.preset === k ? ' is-active' : '')}
                                onClick={() => changePreset(k)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className='ai-widgets-range'>
                        <span className='ai-widgets-range-label'>dal</span>
                        <DatePicker size='sm' value={period.from} onChange={(v) => changeDate('from', v)} />
                        <span className='ai-widgets-range-label'>al</span>
                        <DatePicker size='sm' value={period.to} onChange={(v) => changeDate('to', v)} />
                    </div>
                    <button
                        type='button'
                        className={'ai-widgets-edit' + (editing ? ' is-active' : '')}
                        onClick={() => setEditing(!editing)}
                        aria-pressed={editing}
                    >
                        <Icon name={editing ? 'check' : 'pen-to-square'} size='sm' />
                        <span>{editing ? 'Fine' : 'Modifica'}</span>
                    </button>
                </div>
            </div>

            {editing ? (
                <p className='ai-widgets-hint'>Trascina le card per riordinarle, scegli la larghezza, rinomina o elimina. Da mobile i widget sono sempre a tutta larghezza.</p>
            ) : null}
            {error ? <div className='ai-widgets-error'>{error}</div> : null}

            <div className='ai-widgets-grid'>
                {widgets.map((w) => (
                    <WidgetCard
                        key={w.id}
                        widget={w}
                        period={period}
                        editing={editing}
                        dragging={dragId === w.id}
                        over={overId === w.id}
                        onDragStart={() => onDragStart(w.id)}
                        onDragOver={(e) => onDragOverCard(e, w.id)}
                        onDrop={(e) => onDropCard(e, w.id)}
                        onDragEnd={onDragEnd}
                        onResize={(size) => resize(w, size)}
                        onRemove={() => remove(w)}
                        onRename={(t) => rename(w, t)}
                    />
                ))}
            </div>
        </section>
    );
}

function WidgetCard({ widget, period, editing, dragging, over, onDragStart, onDragOver, onDrop, onDragEnd, onResize, onRemove, onRename }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [renaming, setRenaming] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [showSql, setShowSql] = useState(false);
    const [draft, setDraft] = useState(widget.title);
    const seq = useRef(0);

    const load = useCallback(async () => {
        const n = ++seq.current;
        setLoading(true);
        try {
            const d = await runWidget(widget.id, period);
            if (n === seq.current) { setData(d); setError(null); }
        } catch (e) {
            if (n === seq.current) setError(e?.message || 'Widget non eseguibile.');
        } finally {
            if (n === seq.current) setLoading(false);
        }
    }, [widget.id, period.from, period.to]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!editing) { setRenaming(false); setConfirm(false); setShowSql(false); }
    }, [editing]);

    const isKpi = widget.kind === 'kpi';
    const spec = data?.kind === 'chart' && data.spec ? { ...data.spec, title: '' } : null;

    function commitRename() {
        setRenaming(false);
        onRename(draft);
    }

    return (
        <article
            className={
                'ai-widget size-' + (widget.size || 'third')
                + (isKpi ? ' is-kpi' : ' is-chart')
                + (loading ? ' is-loading' : '')
                + (dragging ? ' is-dragging' : '')
                + (over ? ' is-over' : '')
            }
            draggable={editing && !renaming}
            onDragStart={editing ? onDragStart : undefined}
            onDragOver={editing ? onDragOver : undefined}
            onDrop={editing ? onDrop : undefined}
            onDragEnd={editing ? onDragEnd : undefined}
        >
            <div className='ai-widget-head'>
                {editing ? <span className='ai-widget-grip' title='Trascina per spostare'><Icon name='grip-vertical' size='sm' /></span> : null}
                {renaming ? (
                    <Input
                        size='sm'
                        className='ai-widget-rename'
                        value={draft}
                        autoFocus
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setRenaming(false); setDraft(widget.title); } }}
                    />
                ) : (
                    <div className='ai-widget-title' onDoubleClick={() => { if (editing) setRenaming(true); }}>{widget.title}</div>
                )}

                <div className='ai-widget-actions'>
                    {editing ? (
                        <>
                            <span className='ai-widget-sizes' role='group' aria-label='Larghezza'>
                                {SIZES.map(([k, glyph, label]) => (
                                    <SimpleTooltip key={k} content={label}>
                                        <button type='button' className={widget.size === k ? 'is-active' : ''} onClick={() => onResize(k)} aria-pressed={widget.size === k}>{glyph}</button>
                                    </SimpleTooltip>
                                ))}
                            </span>
                            <SimpleTooltip content='Mostra la query salvata'><button type='button' className={showSql ? 'is-active' : ''} onClick={() => setShowSql(!showSql)} aria-label='Query'><Icon name='code' size='sm' /></button></SimpleTooltip>
                            <SimpleTooltip content='Rinomina'><button type='button' onClick={() => setRenaming(true)} aria-label='Rinomina'><Icon name='pen' size='sm' /></button></SimpleTooltip>
                            {confirm ? (
                                <span className='ai-widget-confirm'>
                                    eliminare?
                                    <button type='button' className='is-danger' onClick={onRemove}>sì</button>
                                    <button type='button' onClick={() => setConfirm(false)}>no</button>
                                </span>
                            ) : (
                                <SimpleTooltip content='Elimina'><button type='button' onClick={() => setConfirm(true)} aria-label='Elimina'><Icon name='trash' size='sm' /></button></SimpleTooltip>
                            )}
                        </>
                    ) : (
                        <SimpleTooltip content='Aggiorna'><button type='button' onClick={load} aria-label='Aggiorna'><Icon name='rotate-right' size='sm' /></button></SimpleTooltip>
                    )}
                </div>
            </div>

            {showSql ? (
                <pre className='ai-widget-sql'>{widget.sql}</pre>
            ) : null}

            <div className='ai-widget-body'>
                {error ? (
                    <div className='ai-widget-error'>{error}</div>
                ) : !data ? (
                    <div className='ai-widget-spinner'><Spinner size='sm' /></div>
                ) : isKpi ? (
                    <div className='ai-widget-kpi'>
                        <div className='ai-widget-kpi-value'>{formatValue(data.value, data.format)}</div>
                        {data.label ? <div className='ai-widget-kpi-label'>{data.label}</div> : null}
                    </div>
                ) : spec && spec.labels.length ? (
                    <ChartBlock spec={spec} />
                ) : (
                    <div className='ai-widget-empty'>Nessun dato nel periodo.</div>
                )}
            </div>

            <div className='ai-widget-foot'>
                {widget.usesDates
                    ? <><Icon name='calendar' size='sm' className='me-1' />{formatPeriod(period)}{widget.dateNote ? <span className='ai-widget-note'> · {widget.dateNote}</span> : null}</>
                    : <><Icon name='thumbtack' size='sm' className='me-1' />non dipende dal periodo</>}
            </div>
        </article>
    );
}
