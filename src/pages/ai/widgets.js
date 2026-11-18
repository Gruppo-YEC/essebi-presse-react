/**
 * Widget in dashboard: client di /ai/widget_* (vedi AiWidget.php) e il
 * periodo condiviso da tutti i widget.
 *
 * Un widget e' una query parametrizzata (:from/:to) piu' un grafico o un
 * numero, creato da una risposta della chat con UNA chiamata al modello e
 * poi rieseguito senza modello a ogni caricamento. Per utente.
 */

import { call } from './aiClient';

const PERIOD_KEY = 'ai_widgets_period';

export const PRESETS = [
    ['month', 'Questo mese'],
    ['prev_month', 'Mese scorso'],
    ['30d', 'Ultimi 30 giorni'],
    ['year', "Quest'anno"],
    ['custom', 'Personalizzato'],
];

function iso(d) {
    return d.toISOString().slice(0, 10);
}

/** Intervallo [from, to] (entrambi inclusi) di un preset, in date locali. */
export function presetRange(key) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const local = (yy, mm, dd) => iso(new Date(Date.UTC(yy, mm, dd)));
    switch (key) {
        case 'prev_month':
            return { from: local(y, m - 1, 1), to: local(y, m, 0) };
        case '30d':
            return { from: local(y, m, now.getDate() - 29), to: local(y, m, now.getDate()) };
        case 'year':
            return { from: local(y, 0, 1), to: local(y, m, now.getDate()) };
        case 'month':
        default:
            return { from: local(y, m, 1), to: local(y, m, now.getDate()) };
    }
}

/** Periodo ricordato nel browser: { preset, from, to }. Default: questo mese. */
export function loadPeriod() {
    try {
        const raw = localStorage.getItem(PERIOD_KEY);
        const p = raw ? JSON.parse(raw) : null;
        if (p && PRESETS.some(([k]) => k === p.preset)) {
            if (p.preset === 'custom' && p.from && p.to) return p;
            if (p.preset !== 'custom') return { preset: p.preset, ...presetRange(p.preset) };
        }
    } catch { /* niente storage */ }
    return { preset: 'month', ...presetRange('month') };
}

export function savePeriod(p) {
    try { localStorage.setItem(PERIOD_KEY, JSON.stringify(p)); } catch { /* niente */ }
}

export function formatPeriod(p) {
    const f = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4) : '');
    return f(p.from) + ' – ' + f(p.to);
}

export async function listWidgets() {
    const d = await call('widget_list', {});
    return Array.isArray(d.widgets) ? d.widgets : [];
}

export async function runWidget(id, period) {
    return call('widget_run', { id, from: period.from, to: period.to });
}

/** { question, queries: [sql], chart?: spec, kind: 'chart'|'kpi', title? } -> widget */
export async function createWidget(input) {
    const d = await call('widget_create', input);
    return d.widget;
}

export async function renameWidget(id, title) {
    return call('widget_update', { id, title });
}

/** size: 'third' | 'half' | 'full' (larghezza su desktop; da mobile sempre intera) */
export async function resizeWidget(id, size) {
    return call('widget_update', { id, size });
}

export async function reorderWidgets(order) {
    return call('widget_update', { order });
}

export async function deleteWidget(id) {
    return call('widget_delete', { id });
}
