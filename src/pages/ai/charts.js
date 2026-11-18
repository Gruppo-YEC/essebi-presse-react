/**
 * Blocchi grafico nelle risposte dell'assistente.
 *
 * Il modello emette un blocco di codice con linguaggio `chart` che contiene
 * solo JSON (il formato e' nel system prompt del backend):
 *
 *   ```chart
 *   { "type": "bar", "title": "...", "format": "currency",
 *     "labels": ["Gen", "Feb"], "series": [{ "name": "gruppoyec", "values": [1, 2] }] }
 *   ```
 *
 * Qui si spezza il testo in segmenti (markdown | chart) e si valida la
 * specifica: ChatMessage rende i segmenti markdown con chatMarkdown e quelli
 * chart con ChartBlock. Un blocco che non passa la validazione resta a
 * schermo come codice, con il motivo: meglio di un grafico sbagliato.
 *
 * Il blocco resta nel testo del messaggio, quindi finisce nella history e
 * il grafico si rivede riaprendo la conversazione. Lo stesso formato e' la
 * base dei widget in dashboard.
 */

export const CHART_TYPES = ['bar', 'line', 'pie'];
export const CHART_FORMATS = ['currency', 'number', 'percent', 'hours'];
export const MAX_SERIES = 4;
export const MAX_POINTS = 60;
export const MAX_PIE_SLICES = 6;

const FENCE = /```chart[^\n]*\n([\s\S]*?)```/g;

/** Testo -> [{ kind: 'md', text } | { kind: 'chart', spec, raw, error }] */
export function splitChartBlocks(text) {
    const src = String(text ?? '');
    const out = [];
    let last = 0;
    let m;
    FENCE.lastIndex = 0;
    while ((m = FENCE.exec(src)) !== null) {
        if (m.index > last) out.push({ kind: 'md', text: src.slice(last, m.index) });
        const raw = m[1].trim();
        const parsed = parseChartSpec(raw);
        out.push({ kind: 'chart', raw, spec: parsed.spec, error: parsed.error });
        last = m.index + m[0].length;
    }
    if (last < src.length) out.push({ kind: 'md', text: src.slice(last) });
    return out.length ? out : [{ kind: 'md', text: src }];
}

/** C'e' almeno un grafico valido nel testo? (per il log e i widget) */
export function hasChart(text) {
    return splitChartBlocks(text).some((s) => s.kind === 'chart' && s.spec);
}

function toNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/**
 * JSON -> { spec, error }. La specifica valida ha sempre: type, title,
 * format, labels[], series[{ name, values[] }] con lunghezze coerenti.
 */
export function parseChartSpec(raw) {
    let obj;
    try {
        obj = JSON.parse(raw);
    } catch (e) {
        return { spec: null, error: 'JSON non valido' };
    }
    if (!obj || typeof obj !== 'object') return { spec: null, error: 'specifica vuota' };

    const type = CHART_TYPES.includes(obj.type) ? obj.type : null;
    if (!type) return { spec: null, error: `tipo "${obj.type}" non supportato (bar, line, pie)` };

    const labels = Array.isArray(obj.labels) ? obj.labels.map((l) => String(l ?? '')) : [];
    if (!labels.length) return { spec: null, error: 'mancano le etichette' };
    if (labels.length > MAX_POINTS) return { spec: null, error: `troppi punti (${labels.length}, massimo ${MAX_POINTS})` };

    const rawSeries = Array.isArray(obj.series) ? obj.series : [];
    const series = [];
    for (const s of rawSeries) {
        if (!s || !Array.isArray(s.values)) continue;
        const values = s.values.map(toNumber);
        if (values.length !== labels.length) {
            return { spec: null, error: `la serie "${s.name ?? ''}" ha ${values.length} valori per ${labels.length} etichette` };
        }
        series.push({ name: String(s.name ?? '').trim() || `Serie ${series.length + 1}`, values });
        if (series.length >= MAX_SERIES) break;
    }
    if (!series.length) return { spec: null, error: 'nessuna serie di valori' };

    if (type === 'pie') {
        if (labels.length > MAX_PIE_SLICES) return { spec: null, error: `troppe fette (${labels.length}, massimo ${MAX_PIE_SLICES})` };
        series.splice(1); /* una torta, una serie */
    }

    return {
        spec: {
            type,
            title: String(obj.title ?? '').trim(),
            format: CHART_FORMATS.includes(obj.format) ? obj.format : 'number',
            labels,
            series,
        },
        error: null,
    };
}

/** Formattazione dei valori, stile italiano. */
export function formatValue(v, format) {
    if (v === null || v === undefined || !Number.isFinite(v)) return '—';
    switch (format) {
        case 'currency':
            return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(v);
        case 'percent':
            return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v) + '%';
        case 'hours':
            return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v) + ' h';
        default:
            return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(v);
    }
}

/** Versione corta per gli assi (1.2k, 3,5M) per non affollare i tick. */
export function formatAxis(v, format) {
    if (!Number.isFinite(v)) return '';
    const abs = Math.abs(v);
    let s;
    if (abs >= 1e6) s = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v / 1e6) + 'M';
    else if (abs >= 1e3) s = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v / 1e3) + 'k';
    else s = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 }).format(v);
    if (format === 'currency') return s + ' €';
    if (format === 'percent') return s + '%';
    if (format === 'hours') return s + ' h';
    return s;
}

/**
 * Tavolozza categorica, ordine fisso (mai a rotazione): blu, arancio,
 * acqua, giallo, magenta, verde. I passi scuri sono gli stessi colori
 * ricalibrati per la superficie scura, non un'inversione.
 */
export const PALETTE = {
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
};
