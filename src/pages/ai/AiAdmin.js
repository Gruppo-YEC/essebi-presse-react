/**
 * Pannello admin dell'assistente: spesa, uso, domande frequenti,
 * segnalazioni. Dati da /ai/admin_stats (vedi AiAdmin.php), riservato ai
 * livelli in settings.aiAssistant.adminLevels (il gate vero e' nel backend,
 * ai_assistant.admin_levels).
 *
 * Il costo e' calcolato dal backend sui token con il listino per modello
 * (ai_assistant.prices); un modello senza prezzo compare a 0 con un avviso.
 * Il grafico della spesa per giorno usa lo stesso ChartBlock delle risposte.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from '../../components/ui/alert';
import { Select } from '../../components/ui/select';
import { Spinner } from '../../components/ui/spinner';
import { Stat } from '../../components/ui/panel';
import Icon from '../../components/BodyElements/Icon';
import { adminStats } from './aiClient';
import ChartBlock from './ChartBlock';

const PERIODS = [
    ['month', 'Questo mese'],
    ['prev_month', 'Mese scorso'],
    ['30d', 'Ultimi 30 giorni'],
    ['year', "Quest'anno"],
    ['all', 'Sempre'],
];

const num = (v, digits = 0) => new Intl.NumberFormat('it-IT', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Number(v) || 0);
const money = (v, currency) => num(v, 2) + ' ' + currency;
const tokens = (v) => (v >= 1e6 ? num(v / 1e6, 2) + ' M' : v >= 1e3 ? num(v / 1e3, 1) + ' k' : num(v));
const when = (s) => (s ? new Date(String(s).replace(' ', 'T')).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

export default function AiAdmin() {
    const [period, setPeriod] = useState('month');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        adminStats(period)
            .then((d) => { if (alive) setData(d); })
            .catch((e) => { if (alive) setError(e?.message || 'Statistiche non disponibili.'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [period]);

    const chart = useMemo(() => {
        if (!data || !data.by_day.length) return null;
        return {
            type: 'bar',
            title: `Spesa per giorno (${data.currency})`,
            format: 'number',
            labels: data.by_day.map((d) => d.day.slice(8, 10) + '/' + d.day.slice(5, 7)),
            series: [{ name: 'Spesa', values: data.by_day.map((d) => d.cost) }],
        };
    }, [data]);

    const currency = data?.currency || 'USD';
    const budget = data?.budget || 0;
    const spentPct = budget > 0 ? Math.min(100, Math.round((data.spent_month / budget) * 100)) : 0;
    const unpriced = data ? data.by_model.filter((m) => !m.priced) : [];

    return (
        <div className='ai-admin'>
            <div className='ai-admin-head'>
                <h3 className='ai-admin-title'>Utilizzo e spesa</h3>
                <Select size='sm' className='ai-admin-period' value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {PERIODS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </Select>
            </div>

            {error ? <Alert variant='danger'>{error}</Alert> : null}
            {loading && !data ? <div className='ai-admin-loading'><Spinner /></div> : null}

            {data ? (
                <div className={'ai-admin-body' + (loading ? ' is-loading' : '')}>

                    <div className='ai-admin-stats'>
                        <Stat label='Spesa nel periodo' value={money(data.totals.cost, currency)} icon='coins' />
                        <Stat label='Chiamate al modello' value={num(data.totals.calls)} icon='bolt'>
                            <div className='ai-admin-stat-note'>{num(data.totals.conversations)} conversazioni · {num(data.totals.users)} utenti</div>
                        </Stat>
                        <Stat label='Token' value={tokens(data.totals.input_tokens + data.totals.output_tokens + data.totals.cache_read_tokens + data.totals.cache_write_tokens)} icon='microchip'>
                            <div className='ai-admin-stat-note'>
                                in {tokens(data.totals.input_tokens)} · out {tokens(data.totals.output_tokens)} · cache {tokens(data.totals.cache_read_tokens)}
                            </div>
                        </Stat>
                        <Stat label='Tetto mensile' value={budget > 0 ? money(budget, currency) : 'nessuno'} icon='gauge-high'>
                            {budget > 0 ? (
                                <>
                                    <div className='ai-admin-budget'><div className={'ai-admin-budget-fill' + (spentPct >= 90 ? ' is-hot' : '')} style={{ width: spentPct + '%' }} /></div>
                                    <div className='ai-admin-stat-note'>{money(data.spent_month, currency)} spesi questo mese ({spentPct}%)</div>
                                </>
                            ) : <div className='ai-admin-stat-note'>ai_assistant.monthly_budget in settings.json</div>}
                        </Stat>
                    </div>

                    {unpriced.length ? (
                        <Alert variant='warning' className='ai-admin-alert'>
                            Modelli senza prezzo nel listino, contati a 0: {unpriced.map((m) => m.model).join(', ')}. Aggiungili in ai_assistant.prices.
                        </Alert>
                    ) : null}

                    {chart ? <ChartBlock spec={chart} /> : <div className='ai-admin-empty'>Nessuna chiamata nel periodo.</div>}

                    <div className='ai-admin-grid'>
                        <section className='ai-admin-card'>
                            <h4>Per modello</h4>
                            {data.by_model.length ? (
                                <table>
                                    <thead><tr><th>Modello</th><th className='num'>Chiamate</th><th className='num'>In</th><th className='num'>Out</th><th className='num'>Cache</th><th className='num'>Spesa</th></tr></thead>
                                    <tbody>
                                        {data.by_model.map((m) => (
                                            <tr key={m.model}>
                                                <td>{m.model}{!m.priced ? <Icon name='triangle-exclamation' size='sm' className='ms-1 text-warning' /> : null}</td>
                                                <td className='num'>{num(m.calls)}</td>
                                                <td className='num'>{tokens(m.input_tokens)}</td>
                                                <td className='num'>{tokens(m.output_tokens)}</td>
                                                <td className='num'>{tokens(m.cache_read_tokens)}</td>
                                                <td className='num'>{money(m.cost, currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <div className='ai-admin-empty'>—</div>}
                        </section>

                        <section className='ai-admin-card'>
                            <h4>Per utente</h4>
                            {data.by_user.length ? (
                                <table>
                                    <thead><tr><th>Utente</th><th className='num'>Conv.</th><th className='num'>Chiamate</th><th className='num'>Spesa</th><th>Ultima</th></tr></thead>
                                    <tbody>
                                        {data.by_user.map((u) => (
                                            <tr key={u.user_id}>
                                                <td>{u.name}</td>
                                                <td className='num'>{num(u.conversations)}</td>
                                                <td className='num'>{num(u.calls)}</td>
                                                <td className='num'>{money(u.cost, currency)}</td>
                                                <td className='muted'>{when(u.last_call)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <div className='ai-admin-empty'>—</div>}
                        </section>

                        <section className='ai-admin-card'>
                            <h4>Domande piu' frequenti</h4>
                            {data.questions.length ? (
                                <ol className='ai-admin-questions'>
                                    {data.questions.map((q, i) => (
                                        <li key={i}><span className='ai-admin-count'>{q.count}×</span> {q.text}</li>
                                    ))}
                                </ol>
                            ) : <div className='ai-admin-empty'>Nessuna domanda nel periodo.</div>}
                        </section>

                        <section className='ai-admin-card'>
                            <h4>
                                Segnalazioni
                                <span className='ai-admin-votes'>
                                    <Icon name='thumbs-up' size='sm' /> {num(data.feedback.up)}
                                    <Icon name='thumbs-down' size='sm' className='ms-2' /> {num(data.feedback.down)}
                                </span>
                            </h4>
                            {data.feedback.items.length ? (
                                <div className='ai-admin-feedback'>
                                    {data.feedback.items.map((f) => (
                                        <FeedbackItem key={f.id} item={f} />
                                    ))}
                                </div>
                            ) : <div className='ai-admin-empty'>Nessun voto nel periodo.</div>}
                        </section>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function FeedbackItem({ item }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={'ai-admin-feedback-item' + (item.vote === -1 ? ' is-down' : '')}>
            <div className='ai-admin-feedback-head'>
                <Icon name={item.vote === -1 ? 'thumbs-down' : 'thumbs-up'} size='sm' />
                <span className='ai-admin-feedback-user'>{item.user}</span>
                <span className='muted'>{when(item.date)}</span>
            </div>
            {item.comment ? <div className='ai-admin-feedback-comment'>{item.comment}</div> : null}
            {item.question ? <div className='ai-admin-feedback-q'>{item.question}</div> : null}
            {item.answer ? (
                <button type='button' className='ai-admin-feedback-toggle' onClick={() => setOpen(!open)}>
                    {open ? 'nascondi la risposta' : 'vedi la risposta'}
                </button>
            ) : null}
            {open ? <pre className='ai-admin-feedback-a'>{item.answer}</pre> : null}
        </div>
    );
}
