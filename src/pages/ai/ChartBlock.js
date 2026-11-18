/**
 * Un grafico dentro una risposta dell'assistente (vedi charts.js per il
 * formato). Chart.js via react-chartjs-2, come le pagine di Analytics.
 *
 * Scelte:
 * - i colori del testo, della griglia e delle serie seguono il tema: si
 *   leggono le variabili CSS del framework e la tavolozza chiara/scura di
 *   charts.js; il cambio tema e' osservato sulla classe di <html>;
 * - una serie sola: niente legenda (il titolo la nomina); da due in su la
 *   legenda c'e' sempre, cosi' l'identita' non e' affidata al solo colore;
 * - il bottone "Tabella" mostra gli stessi numeri in tabella: serve a chi
 *   non legge il grafico e a chi vuole copiarli;
 * - nessun numero su ogni punto: i valori esatti stanno nel tooltip.
 *
 * Lo stesso componente rendera' i widget in dashboard: riceve solo `spec`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { formatAxis, formatValue, PALETTE } from './charts';

/* register() e' idempotente: Analytics registra le stesse parti. */
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const DARK_CLASS = 'dark-theme-active';

/** true se il tema scuro e' attivo; si aggiorna al cambio tema. */
function useDarkTheme() {
    const read = () => document.documentElement.classList.contains(DARK_CLASS);
    const [dark, setDark] = useState(read);
    useEffect(() => {
        const obs = new MutationObserver(() => setDark(read()));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return dark;
}

/** Colori del tema dalle variabili CSS del framework (esadecimali). */
function themeColors() {
    const css = getComputedStyle(document.documentElement);
    const v = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
    return {
        text: v('--foreground', '#212529'),
        muted: v('--muted-foreground', '#6c757d'),
        grid: v('--border', '#e4e4e7'),
        surface: v('--card', '#ffffff'),
    };
}

function withAlpha(hex, alpha) {
    const h = hex.replace('#', '');
    if (h.length !== 6) return hex;
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export default function ChartBlock({ spec, onSave }) {
    const dark = useDarkTheme();
    const [table, setTable] = useState(false);
    const colors = useMemo(() => themeColors(), [dark]); // eslint-disable-line react-hooks/exhaustive-deps
    const palette = dark ? PALETTE.dark : PALETTE.light;

    const font = { family: 'inherit', size: 11 };
    const { type, title, format, labels, series } = spec;
    const multi = series.length > 1;

    const tooltip = {
        backgroundColor: colors.surface,
        titleColor: colors.text,
        bodyColor: colors.text,
        borderColor: colors.grid,
        borderWidth: 1,
        padding: 8,
        titleFont: { ...font, weight: '600' },
        bodyFont: font,
        displayColors: multi || type === 'pie',
        boxPadding: 3,
        callbacks: {
            label: (ctx) => {
                const name = type === 'pie' ? ctx.label : ctx.dataset.label;
                const value = type === 'pie' ? ctx.parsed : ctx.parsed.y;
                return (name ? name + ': ' : '') + formatValue(value, format);
            },
        },
    };

    const legend = {
        display: multi || type === 'pie',
        position: 'bottom',
        labels: { color: colors.muted, font, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', padding: 12 },
    };

    let data;
    let options;
    let Component;

    if (type === 'pie') {
        Component = Doughnut;
        data = {
            labels,
            datasets: [{
                label: series[0].name,
                data: series[0].values,
                backgroundColor: labels.map((_, i) => palette[i % palette.length]),
                borderColor: colors.surface, /* 2px di superficie tra le fette */
                borderWidth: 2,
                hoverOffset: 4,
            }],
        };
        options = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: { legend, tooltip },
        };
    } else {
        Component = type === 'line' ? Line : Bar;
        data = {
            labels,
            datasets: series.map((s, i) => {
                const color = palette[i % palette.length];
                return type === 'line'
                    ? {
                        label: s.name,
                        data: s.values,
                        borderColor: color,
                        backgroundColor: withAlpha(color, 0.12),
                        borderWidth: 2,
                        pointRadius: labels.length > 30 ? 0 : 2.5,
                        pointHoverRadius: 5,
                        pointHitRadius: 10,
                        pointBackgroundColor: color,
                        pointBorderColor: colors.surface,
                        pointBorderWidth: 1,
                        fill: !multi,
                        tension: 0.25,
                        spanGaps: true,
                    }
                    : {
                        label: s.name,
                        data: s.values,
                        backgroundColor: color,
                        borderColor: colors.surface, /* 2px di superficie tra barre vicine */
                        borderWidth: { left: 1, right: 1, top: 0, bottom: 0 },
                        borderRadius: 4,
                        borderSkipped: 'start',
                        maxBarThickness: 36,
                        categoryPercentage: 0.75,
                        barPercentage: multi ? 0.95 : 0.8,
                    };
            }),
        };
        options = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend, tooltip },
            scales: {
                x: {
                    grid: { display: false },
                    border: { color: colors.grid },
                    ticks: { color: colors.muted, font, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: withAlpha(colors.grid, 0.7), drawTicks: false },
                    border: { display: false },
                    ticks: { color: colors.muted, font, padding: 6, maxTicksLimit: 6, callback: (v) => formatAxis(Number(v), format) },
                },
            },
        };
    }

    return (
        <figure className={'ai-chart ai-chart-' + type}>
            <figcaption className='ai-chart-head'>
                <span className='ai-chart-title'>{title || (type === 'pie' ? series[0].name : '')}</span>
                <span className='ai-chart-tools'>
                    {onSave ? (
                        <button type='button' className='ai-chart-toggle' onClick={onSave} title='Salva come widget nella dashboard'>
                            Salva in dashboard
                        </button>
                    ) : null}
                    <button type='button' className='ai-chart-toggle' onClick={() => setTable(!table)}>
                        {table ? 'Grafico' : 'Tabella'}
                    </button>
                </span>
            </figcaption>
            {table ? (
                <div className='ai-chart-table'>
                    <table>
                        <thead>
                            <tr>
                                <th />
                                {series.map((s, i) => <th key={i}>{s.name}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {labels.map((l, r) => (
                                <tr key={r}>
                                    <td>{l}</td>
                                    {series.map((s, i) => <td key={i} className='num'>{formatValue(s.values[r], format)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className='ai-chart-canvas'>
                    <Component key={dark ? 'dark' : 'light'} data={data} options={options} />
                </div>
            )}
        </figure>
    );
}

/** Blocco che non passa la validazione: si vede il JSON e il motivo. */
export function ChartError({ raw, error }) {
    return (
        <div className='ai-chart ai-chart-error'>
            <div className='ai-chart-head'>
                <span className='ai-chart-title'>Grafico non disegnato: {error}</span>
            </div>
            <pre><code>{raw}</code></pre>
        </div>
    );
}
