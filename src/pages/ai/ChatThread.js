import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Alert } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { SimpleTooltip } from '../../components/ui/tooltip';
import Icon from '../../components/BodyElements/Icon';
import { renderChatMarkdown } from './chatMarkdown';
import { splitChartBlocks } from './charts';
import ChartBlock, { ChartError } from './ChartBlock';
import { formatConversationDate } from './conversations';
import { useAi } from './AiProvider';
import { useDictation } from './dictation';
import { exportQuery } from './aiClient';
import { ACCEPT, formatSize } from './attachments';
import { createWidget } from './widgets';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../components/ui/dialog';
import { toast } from '../../components/ui/toast';

/**
 * Pezzi della conversazione, condivisi dalla pagina a tutto schermo e dal
 * pannello laterale: lo stato e' in AiProvider, qui solo presentazione.
 *
 *   <ChatThread compact />   messaggi + revisione + attesa + errore, scrollabile
 *   <Composer />             barra di scrittura con interruttore revisione
 *   <Disclaimer />
 */

/** La conversazione. `compact` stringe i margini per il pannello. */
export function ChatThread({ compact = false }) {
    const ai = useAi();
    const scrollRef = useRef(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [ai.messages, ai.pending, ai.step, ai.review]);

    return (
        <div ref={scrollRef} className={'ai-chat-scroll' + (compact ? ' is-compact' : '')}>
            <div className='ai-chat-thread'>
                {ai.conv?.createdAt ? <div className='ai-chat-date'>{formatConversationDate(ai.conv.createdAt)}</div> : null}
                {ai.messages.map((m, i) => (
                    <ChatMessage key={i} index={i} role={m.role} content={m.content} queries={m.queries} feedback={m.feedback} attachments={m.attachments} />
                ))}
                {ai.pending && ai.review ? <ReviewCard review={ai.review} onDecide={ai.decide} /> : null}
                {ai.pending && !ai.review ? <Thinking step={ai.step} /> : null}
                {ai.error ? (
                    <Alert variant='danger' className='ai-chat-error'>
                        <div>{ai.error}</div>
                        {ai.messages[ai.messages.length - 1]?.role === 'user' ? (
                            <Button variant='outline-danger' size='sm' className='mt-2' onClick={ai.retry} disabled={ai.pending}>
                                <Icon name='rotate-right' className='me-2' />Riprova
                            </Button>
                        ) : null}
                    </Alert>
                ) : null}
            </div>
        </div>
    );
}

/**
 * Barra di scrittura: textarea che cresce col testo, sotto a sinistra
 * l'interruttore "Approva le query", a destra il tasto invio.
 */
export const Composer = React.forwardRef(function Composer({ rows = 1, placeholder, autoFocus = false }, ref) {
    const ai = useAi();
    const innerRef = useRef(null);
    const fileRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    /* Dettatura: il testo riconosciuto si accoda a quello gia' scritto; la
       base viene fissata all'avvio, cosi' le trascrizioni parziali si
       sostituiscono tra loro invece di sommarsi. */
    const dictationBase = useRef('');
    const dictation = useDictation({
        onText: (text) => {
            const base = dictationBase.current;
            ai.setInput(base + (base && !base.endsWith(' ') && text ? ' ' : '') + text);
        },
        onEnd: () => setTimeout(() => innerRef.current?.focus(), 0)
    });

    function toggleDictation() {
        if (!dictation.listening) dictationBase.current = ai.input || '';
        dictation.toggle();
    }

    function onDrop(e) {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer?.files?.length) ai.addFiles(e.dataTransfer.files);
    }

    function onDragOver(e) {
        if (!e.dataTransfer?.types?.includes('Files')) return;
        e.preventDefault();
        if (!dragging) setDragging(true);
    }

    function onPaste(e) {
        const files = Array.from(e.clipboardData?.files || []);
        if (files.length) {
            e.preventDefault();
            ai.addFiles(files);
        }
    }
    const setRefs = (el) => {
        innerRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
    };

    /* Auto-grow: altezza azzerata e poi ripresa dallo scrollHeight, con il
       tetto lasciato al CSS (max-height). */
    useEffect(() => {
        const el = innerRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    }, [ai.input, rows]);

    useEffect(() => {
        if (autoFocus) setTimeout(() => innerRef.current?.focus(), 0);
    }, [autoFocus]);

    /* Invio: la dettatura si interrompe senza consegnare il testo in coda,
       che altrimenti tornerebbe nell'input gia' svuotato. */
    function sendNow() {
        if (dictation.listening) dictation.abort();
        dictationBase.current = '';
        ai.send(ai.input);
    }

    function onKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendNow();
        }
    }

    return (
        <div
            className={'ai-composer' + (dragging ? ' is-dragging' : '')}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={() => setDragging(false)}
        >
            {ai.attachments.length ? (
                <div className='ai-attachments'>
                    {ai.attachments.map((a, i) => (
                        <AttachmentChip key={i} attachment={a} onRemove={() => ai.removeAttachment(i)} />
                    ))}
                </div>
            ) : null}
            <Textarea
                ref={setRefs}
                rows={rows}
                value={ai.input}
                onChange={(e) => ai.setInput(e.target.value)}
                onKeyDown={onKeyDown}
                onPaste={onPaste}
                disabled={ai.pending}
                placeholder={dragging ? 'Lascia qui il file' : dictation.listening ? 'Sto ascoltando...' : (placeholder || 'Scrivi un messaggio')}
                className='ai-composer-input'
            />
            <div className='ai-composer-bar'>
                <div className='ai-composer-left'>
                <input ref={fileRef} type='file' accept={ACCEPT} multiple hidden onChange={(e) => { ai.addFiles(e.target.files); e.target.value = ''; }} />
                <SimpleTooltip content='Allega PDF, immagini, Excel o CSV'>
                    <button type='button' className='ai-attach-btn' onClick={() => fileRef.current?.click()} disabled={ai.pending || ai.reading} aria-label='Allega un file'>
                        {ai.reading ? <Icon name='spinner' spin size='sm' /> : <Icon name='paperclip' size='sm' />}
                    </button>
                </SimpleTooltip>
                {dictation.supported ? (
                    <SimpleTooltip content={dictation.listening ? 'Ferma la dettatura' : 'Detta il messaggio'}>
                        <button
                            type='button'
                            className={'ai-attach-btn' + (dictation.listening ? ' is-listening' : '')}
                            onClick={toggleDictation}
                            disabled={ai.pending}
                            aria-pressed={dictation.listening}
                            aria-label={dictation.listening ? 'Ferma la dettatura' : 'Detta il messaggio'}
                        >
                            <Icon name={dictation.listening ? 'microphone-lines' : 'microphone'} size='sm' />
                        </button>
                    </SimpleTooltip>
                ) : null}
                {/* L'interruttore c'e' solo se il progetto lascia scegliere
                    (settings.aiAssistant.approveQueries = 'user'). */}
                {ai.reviewByUser ? (
                    <SimpleTooltip content={ai.reviewMode ? 'Ogni query si ferma per la tua approvazione' : 'Le query vengono eseguite direttamente'}>
                        <button
                            type='button'
                            className={'ai-approve-toggle' + (ai.reviewMode ? ' is-on' : '')}
                            onClick={ai.toggleReviewMode}
                            disabled={ai.pending}
                            aria-pressed={ai.reviewMode}
                        >
                            <Icon name='hand' size='sm' />
                            <span className='ai-approve-label'>Approva le query</span>
                        </button>
                    </SimpleTooltip>
                ) : null}
                </div>
                <button
                    type='button'
                    className='ai-send'
                    onClick={sendNow}
                    disabled={ai.pending || ai.reading || (!ai.input.trim() && !ai.attachments.length)}
                    aria-label='Invia'
                >
                    {ai.pending ? <Icon name='spinner' spin /> : <Icon name='arrow-up' />}
                </button>
            </div>
        </div>
    );
});

/** Un allegato: icona per tipo, nome, dimensione, X per toglierlo (solo prima dell'invio). */
function AttachmentChip({ attachment, onRemove }) {
    const icon = attachment.kind === 'pdf' ? 'file-pdf' : attachment.kind === 'image' ? 'file-image' : 'file-csv';
    return (
        <span className='ai-attachment' title={attachment.name}>
            <Icon name={icon} size='sm' />
            <span className='ai-attachment-name'>{attachment.name}</span>
            <span className='ai-attachment-size'>{formatSize(attachment.size)}{attachment.truncated ? ' · troncato' : ''}</span>
            {onRemove ? (
                <button type='button' className='ai-attachment-remove' onClick={onRemove} aria-label='Rimuovi'>
                    <Icon name='xmark' size='sm' />
                </button>
            ) : null}
        </span>
    );
}

export function Disclaimer() {
    return (
        <p className='ai-disclaimer'>
            L'assistente legge i dati e non li modifica. Puo' sbagliare: verifica sempre i numeri prima di usarli.
        </p>
    );
}

export function ChatMessage({ index, role, content, queries, feedback, attachments }) {
    const navigate = useNavigate();
    const ai = useAi();
    const [saving, setSaving] = useState(null);   /* { kind, chart, title } mentre la finestra e' aperta */

    if (role === 'user') {
        return (
            <div className='ai-chat-row is-user'>
                <div className='ai-chat-bubble'>
                    {attachments?.length ? (
                        <div className='ai-attachments is-sent'>
                            {attachments.map((a, i) => <AttachmentChip key={i} attachment={a} />)}
                        </div>
                    ) : null}
                    {content}
                </div>
            </div>
        );
    }

    /* I link interni (data-internal, vedi chatMarkdown) vanno col router:
       niente ricarica, e il pannello resta aperto con la conversazione. */
    function onClick(e) {
        const a = e.target.closest && e.target.closest('a[data-internal]');
        if (!a) return;
        e.preventDefault();
        navigate(a.getAttribute('href'));
    }

    /* La risposta e' markdown prodotto dal modello, con eventuali blocchi
       ```chart in mezzo (vedi charts.js): i segmenti di testo passano da
       renderChatMarkdown, che escapa tutto prima di qualsiasi altra cosa;
       quelli grafico vanno a ChartBlock, o a ChartError se il JSON non regge. */
    const segments = splitChartBlocks(content);

    /* Widget: servono le query riuscite del giro e la domanda che ha
       prodotto la risposta (l'ultimo messaggio utente prima di questo). */
    const sqlList = (queries || []).filter((q) => q.sql && !q.error).map((q) => q.sql);
    /* Risposte da tool di progetto (es. crm_cashflow): il widget nasce da una
       SELECT equivalente scritta dal modello al salvataggio. */
    const toolList = (queries || []).filter((q) => q.tool && !q.tool.startsWith('ui_') && !q.error).map((q) => ({ name: q.tool, input: q.input || {} }));
    const canSave = index !== undefined && ai && (sqlList.length > 0 || toolList.length > 0);
    const question = canSave ? [...ai.messages.slice(0, index)].reverse().find((m) => m.role === 'user')?.content || '' : '';

    return (
        <div className='ai-chat-row'>
            <div className='ai-chat-answer'>
                {segments.map((seg, i) => {
                    if (seg.kind === 'chart') {
                        return seg.spec
                            ? <ChartBlock key={i} spec={seg.spec} onSave={canSave ? () => setSaving({ kind: 'chart', chart: seg.spec, title: seg.spec.title }) : undefined} />
                            : <ChartError key={i} raw={seg.raw} error={seg.error} />;
                    }
                    if (!seg.text.trim()) return null;
                    return <div key={i} className='ai-chat-md' onClick={onClick} dangerouslySetInnerHTML={{ __html: renderChatMarkdown(seg.text) }} />;
                })}
                {queries && queries.length ? <QueryLog queries={queries} onSaveKpi={canSave ? () => setSaving({ kind: 'kpi', chart: null, title: '' }) : null} /> : null}
                {index !== undefined && ai?.conv ? <FeedbackBar index={index} feedback={feedback} /> : null}
            </div>
            {saving ? (
                <SaveWidgetDialog
                    kind={saving.kind}
                    chart={saving.chart}
                    initialTitle={saving.title}
                    question={question}
                    queries={sqlList}
                    tools={toolList}
                    onClose={() => setSaving(null)}
                />
            ) : null}
        </div>
    );
}

/**
 * Salvataggio di un widget: titolo, poi una chiamata al modello sul server
 * che riscrive la query con il periodo (:from/:to) e la prova. Puo' volerci
 * qualche secondo.
 */
function SaveWidgetDialog({ kind, chart, initialTitle, question, queries, tools, onClose }) {
    const [title, setTitle] = useState(initialTitle || '');
    const [busy, setBusy] = useState(false);

    async function save() {
        if (busy) return;
        setBusy(true);
        try {
            const w = await createWidget({ kind, chart: chart || undefined, question, queries, tools, title: title.trim() || undefined });
            toast.success(`Widget "${w?.title || title}" salvato: lo trovi in dashboard.`);
            onClose();
        } catch (e) {
            toast.error(e?.message || 'Widget non salvato.');
            setBusy(false);
        }
    }

    return (
        <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
            <DialogContent size='sm'>
                <DialogHeader>
                    <DialogTitle>{kind === 'kpi' ? 'Salva come indicatore' : 'Salva come grafico'} in dashboard</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <p className='ai-save-widget-hint'>
                        {kind === 'kpi'
                            ? 'Il numero chiave di questa risposta diventa un riquadro nella dashboard, ricalcolato sul periodo che scegli li\u0027.'
                            : 'Il grafico diventa un widget nella dashboard, ricalcolato sul periodo che scegli li\u0027.'}
                        {' '}La query viene adattata al filtro data una volta sola, adesso.
                        {!queries.length && tools.length ? ' Questa risposta viene da un tool del progetto: il widget usera\u0027 una query equivalente, controlla che i numeri coincidano.' : ''}
                    </p>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Titolo del widget (facoltativo)' disabled={busy} autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
                </DialogBody>
                <DialogFooter>
                    <Button variant='outline-secondary' size='sm' onClick={onClose} disabled={busy}>Annulla</Button>
                    <Button variant='primary' size='sm' onClick={save} disabled={busy}>
                        {busy ? <><Spinner size='sm' className='me-2' />Preparo il widget…</> : 'Salva'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Pollice su / giu' sotto una risposta. Il pollice giu' apre un campo per
 * dire cosa non va (facoltativo): il voto parte subito, il commento quando
 * si preme Invia. Rivotare lo stesso pollice toglie il voto.
 */
function FeedbackBar({ index, feedback }) {
    const ai = useAi();
    const [comment, setComment] = useState('');
    const [askComment, setAskComment] = useState(false);
    const current = feedback?.vote || 0;

    function onVote(v) {
        if (ai.pending) return;
        if (current === v) {
            ai.vote(index, 0);
            setAskComment(false);
            return;
        }
        ai.vote(index, v, v === -1 ? comment : '');
        setAskComment(v === -1);
    }

    function sendComment() {
        ai.vote(index, -1, comment.trim());
        setAskComment(false);
    }

    return (
        <div className='ai-feedback'>
            <div className='ai-feedback-buttons'>
                <SimpleTooltip content='Risposta utile'>
                    <button type='button' className={'ai-feedback-btn' + (current === 1 ? ' is-on' : '')} onClick={() => onVote(1)} aria-pressed={current === 1}>
                        <Icon name='thumbs-up' size='sm' />
                    </button>
                </SimpleTooltip>
                <SimpleTooltip content='Risposta sbagliata o inutile'>
                    <button type='button' className={'ai-feedback-btn' + (current === -1 ? ' is-on is-down' : '')} onClick={() => onVote(-1)} aria-pressed={current === -1}>
                        <Icon name='thumbs-down' size='sm' />
                    </button>
                </SimpleTooltip>
                {current === -1 && !askComment && feedback?.comment ? (
                    <button type='button' className='ai-feedback-edit' onClick={() => { setComment(feedback.comment); setAskComment(true); }}>
                        segnalazione inviata · modifica
                    </button>
                ) : null}
                {current === -1 && !askComment && !feedback?.comment ? (
                    <button type='button' className='ai-feedback-edit' onClick={() => setAskComment(true)}>
                        aggiungi cosa non va
                    </button>
                ) : null}
            </div>
            {askComment ? (
                <div className='ai-feedback-form'>
                    <Input
                        size='sm'
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendComment(); if (e.key === 'Escape') setAskComment(false); }}
                        placeholder='Cosa non va? (facoltativo)'
                        autoFocus
                    />
                    <Button variant='outline-secondary' size='sm' onClick={sendComment}>Invia</Button>
                </div>
            ) : null}
        </div>
    );
}

/** Elenco richiudibile di query, tool di progetto e azioni UI del giro. */
export function QueryLog({ queries, onSaveKpi }) {
    const ai = useAi();
    const [open, setOpen] = useState(false);
    const n = queries.length;
    const sqlCount = queries.filter((q) => q.sql).length;
    const label = sqlCount === n
        ? (n === 1 ? '1 query' : n + ' query')
        : (n === 1 ? '1 operazione' : n + ' operazioni');
    /* Rifai sta anche nella riga di testa, visibile a registro chiuso: con
       piu' azioni i bottoni sono numerati nell'ordine delle voci. Di Excel in
       testa ce n'e' uno solo, quello dell'ultima query, che e' la risposta;
       le query intermedie hanno il loro dentro il registro aperto. */
    const exportable = queries.map((q, i) => ({ q, i })).filter(({ q }) => q.sql && !q.error && q.rowCount > 0);
    const headExport = exportable.length ? [exportable[exportable.length - 1]] : [];
    const redoable = queries.map((q, i) => ({ q, i })).filter(({ q }) => q.tool?.startsWith('ui_') && !q.error);
    return (
        <div className='ai-query-log'>
            <div className='ai-query-log-head'>
                <button type='button' className='ai-query-log-toggle' onClick={() => setOpen(!open)}>
                    <Icon name={open ? 'chevron-down' : 'chevron-right'} size='sm' className='me-1' />
                    {label}
                </button>
                {headExport.map(({ q, i }) => (
                    <ExportButton key={'x' + i} sql={q.sql} purpose={q.purpose} />
                ))}
                {redoable.map(({ q, i }, k) => (
                    <RedoButton key={'r' + i} action={q} label={redoable.length > 1 ? `${redoLabel(q)} ${k + 1}` : redoLabel(q)} />
                ))}
            </div>
            {open && onSaveKpi ? (
                <button type='button' className='ai-query-log-toggle ai-query-log-kpi' onClick={onSaveKpi}>
                    <Icon name='gauge-high' size='sm' className='me-1' />Salva il numero chiave come indicatore in dashboard
                </button>
            ) : null}
            {open ? (
                <div className='ai-query-log-items'>
                    {queries.map((q, i) => (
                        <div key={i} className='ai-query-log-item'>
                            {q.sql
                                ? <code>{q.sql}</code>
                                : <code>{q.tool}({JSON.stringify(q.input || {})})</code>}
                            <div className='ai-query-log-meta'>
                                {q.purpose ? <span>{q.purpose} · </span> : null}
                                {q.error
                                    ? <span className='text-danger'>{q.error}</span>
                                    : q.sql
                                        ? <span>{q.rowCount} righe{q.truncated ? ' (troncate in chat)' : ''} · {q.durationMs} ms{q.edited ? ' · corretta a mano' : ''}</span>
                                        : <span>{q.tool?.startsWith('ui_') ? 'azione nel browser' : 'tool di progetto'}</span>}
                                {q.sql && !q.error && q.rowCount > 0 ? <ExportButton sql={q.sql} purpose={q.purpose} /> : null}
                                {q.tool?.startsWith('ui_') && !q.error ? <RedoButton action={q} label={redoLabel(q)} /> : null}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

/**
 * "Excel" accanto a una query del registro: scarica il risultato completo
 * (vedi exportQuery). Lavora anche sulle conversazioni riaperte dallo
 * storico, perche' serve solo il SQL.
 */
function redoLabel(q) {
    return q.tool === 'ui_open_form' ? 'Riapri il form' : 'Rifai';
}

/** "Rifai" su un'azione nel browser del registro: ripete la navigazione o riapre il form. */
function RedoButton({ action, label }) {
    const ai = useAi();
    if (!ai?.redoAction) return null;
    return (
        <button type='button' className='ai-query-export is-redo' onClick={() => ai.redoAction(action.tool, action.input)} disabled={ai.pending} title='Ripeti questa azione'>
            <Icon name='rotate-right' size='sm' />
            <span>{label}</span>
        </button>
    );
}

function ExportButton({ sql, purpose, label = 'Excel' }) {
    const [busy, setBusy] = useState(false);

    async function onClick() {
        if (busy) return;
        setBusy(true);
        try {
            const out = await exportQuery(sql, purpose);
            if (out.truncated) {
                toast.warning(`File troncato a ${out.maxRows} righe: restringi il filtro per averle tutte.`);
            }
        } catch (e) {
            toast.error(e?.message || 'Export non riuscito.');
        } finally {
            setBusy(false);
        }
    }

    return (
        <button type='button' className='ai-query-export is-excel' onClick={onClick} disabled={busy} title='Scarica il risultato completo in Excel'>
            {busy ? <Spinner size='sm' /> : <Icon name='file-excel' size='sm' />}
            <span>{label}</span>
        </button>
    );
}

/**
 * Card di approvazione: il SQL e' esattamente la stringa che verra' eseguita
 * (gia' validata e normalizzata, LIMIT incluso). Si puo' correggere nel
 * riquadro — parte la versione corretta, rivalidata dal server — o rifiutare
 * con una motivazione che torna al modello.
 */
export function ReviewCard({ review, onDecide }) {
    const current = review.pending[review.index];
    const [sql, setSql] = useState(current.sql);
    const [reason, setReason] = useState('');

    /* Con piu' query in coda la card viene riusata: al cambio di query lo
       stato riparte da quella nuova. */
    useEffect(() => {
        setSql(current.sql);
        setReason('');
    }, [current.toolUseId]);

    return (
        <div className='ai-chat-row'>
            <div className='ai-review-card'>
                <div className='ai-review-head'>
                    <Icon name='database' size='sm' className='me-2' />
                    Query proposta{review.pending.length > 1 ? ` (${review.index + 1} di ${review.pending.length})` : ''}
                    {current.purpose ? <span className='ai-review-purpose'> — {current.purpose}</span> : null}
                </div>
                <Textarea
                    rows={Math.min(10, Math.max(3, sql.split('\n').length + 1))}
                    value={sql}
                    onChange={(e) => setSql(e.target.value)}
                    className='ai-review-sql'
                />
                <div className='ai-review-actions'>
                    <Button variant='primary' size='sm' onClick={() => onDecide('run', sql)}>
                        <Icon name='play' className='me-2' />Esegui
                    </Button>
                    <Input
                        size='sm'
                        type='text'
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder='Motivo del rifiuto (opzionale)'
                        className='ai-review-reason'
                    />
                    <Button variant='outline-danger' size='sm' onClick={() => onDecide('reject', null, reason)}>
                        <Icon name='xmark' className='me-2' />Rifiuta
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function Thinking({ step }) {
    return (
        <div className='ai-chat-row'>
            <div className='ai-chat-thinking'>
                <Spinner size='sm' className='me-2' />
                {step ? step : 'Ci penso...'}
            </div>
        </div>
    );
}
