import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../../components/ui/toast';
import { LoginManager } from '../../core/login-manager';
import { DataManager } from '../../core/data-manager';
import { LanguageProvider } from '../../core/language-provider';
import { askAssistant, assistantConfig, isAssistantAllowed, isPanelEnabled, isAssistantAdmin, sendFeedback } from './aiClient';
import { buildContext, describeLocation } from './pageContext';
import {
    newConversationId, listConversations, saveConversation, deleteConversation, archiveConversation,
} from './conversations';
import { internalPath, knownEntity, entityLabel, canDo, recordPath, resolveFormPrefill, formToolResult, addPath, editPath } from './uiTools';
import { readAttachment, userContent, KEEP_TURNS, MAX_FILES } from './attachments';

/**
 * Stato dell'assistente, UNO per tutta l'applicazione.
 *
 * La stessa conversazione si vede dalla pagina /ai-assistant e dal pannello
 * laterale che si apre su qualsiasi pagina: se l'assistente porta l'utente
 * da un'altra parte (ui_navigate), la chat non si perde, continua nel
 * pannello. Per questo lo stato non sta nella pagina ma qui, montato in
 * App.js sopra le rotte.
 *
 * Il provider fa tre cose:
 *  - tiene la conversazione (messaggi, attesa, revisione, storico) ed
 *    espone send/reset/open/remove come faceva la pagina;
 *  - esegue le AZIONI UI chieste dal modello (onUiTool): naviga col router,
 *    apre la scheda di un record, apre il form di un'entita' nel pannello,
 *    precompilato (vedi uiTools.js). Non salva mai: il form e' quello del
 *    framework e a premere Salva e' l'utente;
 *  - tiene lo stato del pannello (aperto/chiuso, form in corso) e riflette
 *    l'apertura sul layout con la classe `ai-panel-open` su #column-container.
 *
 * Se l'utente non puo' usare l'assistente (settings.aiAssistant.levels) il
 * provider resta inerte: niente storico, niente chiamate.
 */

const AiContext = createContext(null);

export function useAi() {
    return useContext(AiContext);
}

const PANEL_KEY = 'ai_panel_open';
const REVIEW_KEY = 'ai_review_mode';

export function AiProvider({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const locationRef = useRef(location);
    locationRef.current = location;

    const userInfo = LoginManager.getUserInfo();
    const allowed = isAssistantAllowed(userInfo);
    const panelEnabled = isPanelEnabled(userInfo);
    const admin = isAssistantAdmin(userInfo);

    /* --- conversazione ------------------------------------------------- */
    const [messages, setMessages] = useState([]);   // { role, content, queries?, feedback?, attachments? }
    const [input, setInput] = useState('');
    /* File in attesa di essere inviati col prossimo messaggio (vedi attachments.js). */
    const [attachments, setAttachments] = useState([]);
    const [reading, setReading] = useState(false);
    const [pending, setPending] = useState(false);
    const [step, setStep] = useState('');
    const [error, setError] = useState(null);
    /* Revisione delle query: fissata dal progetto (approveQueries true/false)
       o scelta dall'utente ('user', con memoria nel browser). */
    const reviewChoice = assistantConfig().approveQueries;
    const reviewByUser = reviewChoice === 'user';
    const [reviewMode, setReviewMode] = useState(() => {
        if (!reviewByUser) return reviewChoice === true;
        try { return localStorage.getItem(REVIEW_KEY) === 'on'; } catch { return false; }
    });
    const [conv, setConv] = useState(null);         // { id, createdAt }
    const [history, setHistory] = useState([]);
    const [historyError, setHistoryError] = useState(null);
    /* Conversazioni archiviate: caricate solo quando la vista le chiede. */
    const [archived, setArchived] = useState([]);
    const archivedLoadedRef = useRef(false);
    const [review, setReview] = useState(null);
    const skipSaveRef = useRef(false);

    /* --- pannello ------------------------------------------------------ */
    const [panelOpen, setPanelOpen] = useState(() => {
        try { return localStorage.getItem(PANEL_KEY) === 'on'; } catch { return false; }
    });
    const onAssistantPage = location.pathname === '/ai-assistant';

    /* Il pannello ha senso solo fuori dalla pagina a tutto schermo. Sul
       layout: margine a destra per non coprire la pagina (vedi style.css). */
    useEffect(() => {
        const el = document.getElementById('column-container');
        if (!el) return;
        const open = panelEnabled && panelOpen && !onAssistantPage;
        el.classList.toggle('ai-panel-open', open);
        return () => el.classList.remove('ai-panel-open');
    }, [panelEnabled, panelOpen, onAssistantPage]);

    async function refreshHistory() {
        try {
            setHistory(await listConversations());
            if (archivedLoadedRef.current) setArchived(await listConversations({ archived: true }));
            setHistoryError(null);
        } catch (e) {
            setHistoryError(e?.message || 'Storico non disponibile.');
        }
    }

    async function refreshArchived() {
        archivedLoadedRef.current = true;
        try {
            setArchived(await listConversations({ archived: true }));
            setHistoryError(null);
        } catch (e) {
            setHistoryError(e?.message || 'Archivio non disponibile.');
        }
    }

    /** Archivia (o ripristina) una conversazione; quella aperta, se archiviata, si chiude. */
    async function archive(c, flag = true) {
        if (pending) return;
        try {
            await archiveConversation(c.id, flag);
            if (flag && c.id === conv?.id) reset();
        } catch (e) {
            setHistoryError(e?.message || 'Archiviazione non riuscita.');
        }
        refreshHistory();
    }

    useEffect(() => {
        if (allowed) refreshHistory();
    }, [allowed]);

    /* Ogni cambio ai messaggi finisce a database: anche la domanda da sola,
       cosi' una conversazione interrotta da un errore non si perde. Un
       salvataggio fallito non disturba la chat: lo storico e' accessorio. */
    useEffect(() => {
        if (skipSaveRef.current) { skipSaveRef.current = false; return; }
        if (!conv || !messages.length) return;
        saveConversation({ ...conv, messages })
            .then(refreshHistory)
            .catch((e) => setHistoryError(e?.message || 'Salvataggio non riuscito.'));
    }, [messages, conv]);

    function toggleReviewMode() {
        if (!reviewByUser) return;
        const on = !reviewMode;
        setReviewMode(on);
        try { localStorage.setItem(REVIEW_KEY, on ? 'on' : 'off'); } catch { /* niente storage, pazienza */ }
    }

    function openPanel() {
        setPanelOpen(true);
        try { localStorage.setItem(PANEL_KEY, 'on'); } catch { /* niente */ }
    }

    function closePanel() {
        setPanelOpen(false);
        try { localStorage.setItem(PANEL_KEY, 'off'); } catch { /* niente */ }
    }

    function togglePanel() {
        if (panelOpen) closePanel(); else openPanel();
    }

    /** aiClient si ferma qui: la promise si risolve quando l'utente ha deciso su tutte. */
    function onReview(pendingQueries) {
        return new Promise((resolve) => {
            setReview({ pending: pendingQueries, index: 0, decisions: [], resolve });
        });
    }

    function decide(action, sql, reason) {
        setReview((r) => {
            if (!r) return null;
            const current = r.pending[r.index];
            const decisions = [...r.decisions, {
                toolUseId: current.toolUseId,
                action,
                ...(action === 'run' ? { sql } : {}),
                ...(action === 'reject' && reason ? { reason } : {}),
            }];
            if (r.index + 1 < r.pending.length) {
                return { ...r, index: r.index + 1, decisions };
            }
            r.resolve(decisions);
            return null;
        });
    }

    /* --- azioni UI ----------------------------------------------------- */

    /**
     * Esegue un tool ui_* e ritorna l'oggetto per il modello. Gli errori
     * tornano come { error } (il modello li legge), mai come eccezioni.
     */
    async function onUiTool(name, input) {
        switch (name) {

            case 'ui_navigate': {
                const path = internalPath(input.path);
                if (!path) return { error: 'Rotta non valida: serve una rotta interna che inizia con "/".' };
                goTo(path);
                return { ok: true, navigated_to: path };
            }

            case 'ui_open_record': {
                const entity = knownEntity(input.entity);
                const id = parseInt(input.id, 10);
                if (!entity) return { error: `Entita' sconosciuta o non accessibile: "${input.entity}".` };
                if (!Number.isFinite(id) || id <= 0) return { error: 'Id del record mancante o non valido.' };
                const path = recordPath(entity, id);
                goTo(path);
                return { ok: true, navigated_to: path };
            }

            case 'ui_open_form': {
                const entity = knownEntity(input.entity);
                if (!entity) return { error: `Entita' sconosciuta o non accessibile: "${input.entity}".` };
                const id = input.id !== undefined && input.id !== null && input.id !== '' ? parseInt(input.id, 10) : null;
                if (id !== null && (!Number.isFinite(id) || id <= 0)) return { error: 'Id del record non valido.' };
                if (!canDo(entity, id ? 'edit' : 'create')) {
                    return { error: `L'utente non ha il permesso di ${id ? 'modificare' : 'creare'} ${entityLabel(entity)}.` };
                }

                if (id) {
                    const r = await DataManager.getItem(entity, id);
                    const item = r?.success === 1 && Array.isArray(r.body) && r.body.length ? r.body[0] : null;
                    if (!item) return { error: `Record ${entity} con id ${id} non trovato.` };
                }

                const values = input.values && typeof input.values === 'object' ? input.values : {};
                const { initData, applied, skipped } = await resolveFormPrefill(entity, values);

                /* Niente form dentro la chat: si va alla pagina standard di
                   inserimento o modifica, col pannello aperto a lato. I valori
                   viaggiano nello state del router (add.js e edit.js leggono
                   state.body), quindi il form e' quello vero, con i suoi hook. */
                const path = id ? editPath(entity, id) : addPath(entity);
                goTo(path, { body: initData, aiPrefill: { applied } });
                if (applied.length) {
                    toast.info(`Form precompilato dall'assistente (${applied.length === 1 ? '1 campo' : applied.length + ' campi'}): controlla e salva.`);
                }
                return formToolResult(entity, id, applied, skipped);
            }

            default:
                return { error: `Azione sconosciuta: ${name}` };
        }
    }

    /**
     * Ripete un'azione UI dal registro sotto la risposta (bottone "Rifai"):
     * chi torna in chat dopo aver cambiato pagina puo' rifarla senza
     * richiedere al modello. Stesso codice di onUiTool, stessi controlli.
     */
    async function redoAction(tool, input) {
        if (pending) return;
        try {
            const r = await onUiTool(tool, input || {});
            if (r?.error) toast.error(r.error);
        } catch (e) {
            toast.error(e?.message || 'Azione non riuscita.');
        }
    }

    /** L'ultima pagina da cui l'utente ha scritto in questa conversazione (null se nessuna). */
    const lastPage = [...messages].reverse().find((m) => m.role === 'user' && m.page)?.page || null;

    /** Torna alla pagina della conversazione, con il pannello aperto per continuare li'. */
    function goToPage(route) {
        if (!route || !internalPath(route)) return;
        goTo(route);
    }

    /** Navigazione chiesta dall'assistente: dalla pagina intera si passa al pannello. */
    function goTo(path, state) {
        if (onAssistantPage && panelEnabled) openPanel();
        navigate(path, state ? { state } : undefined);
    }

    /* --- allegati ------------------------------------------------------ */

    /** Aggiunge file (da drop o da selezione): letti e convertiti subito. */
    async function addFiles(files) {
        const list = Array.from(files || []);
        if (!list.length || pending) return;
        setReading(true);
        try {
            for (const f of list) {
                if (attachments.length + 1 > MAX_FILES) {
                    toast.warning(`Al massimo ${MAX_FILES} allegati per messaggio.`);
                    break;
                }
                try {
                    const a = await readAttachment(f);
                    setAttachments((prev) => (prev.length >= MAX_FILES ? prev : [...prev, a]));
                } catch (e) {
                    toast.error(e?.message || 'File non leggibile.');
                }
            }
        } finally {
            setReading(false);
        }
    }

    function removeAttachment(index) {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    }

    /**
     * La conversazione per l'API. Gli allegati con contenuto viaggiano solo
     * negli ultimi KEEP_TURNS messaggi dell'utente; prima resta il nome.
     */
    function apiHistory(list) {
        let userTurns = 0;
        const out = [];
        for (let i = list.length - 1; i >= 0; i--) {
            const m = list[i];
            if (m.role === 'user') {
                userTurns++;
                out.push({ role: 'user', content: userContent(m.content, m.attachments, userTurns <= KEEP_TURNS) });
            } else {
                out.push({ role: m.role, content: m.content });
            }
        }
        return out.reverse();
    }

    /* --- invio --------------------------------------------------------- */

    async function send(text, files) {
        const question = String(text || '').trim();
        /* `files` esplicito solo da retry(): lo stato non sarebbe ancora aggiornato. */
        const toSend = Array.isArray(files) ? files : attachments;
        if ((!question && !toSend.length) || pending || reading || !allowed) return;

        const current = conv || { id: newConversationId(), createdAt: Date.now() };
        if (!conv) setConv(current);

        /* Se il giro precedente e' andato in errore, in coda e' rimasta una
           domanda senza risposta: va sostituita, non accodata. */
        const answered = messages.length && messages[messages.length - 1].role === 'user'
            ? messages.slice(0, -1)
            : messages;

        /* Da quale pagina si scrive: resta sul messaggio (e nello storico), cosi'
           dalla pagina intera si vede a cosa si riferiva la conversazione e ci
           si torna con un clic. Dalla pagina intera stessa non c'e' pagina. */
        const loc = locationRef.current;
        const pageLabel = loc?.pathname === '/ai-assistant' ? '' : describeLocation(loc);
        const page = pageLabel ? { route: (loc.pathname || '/') + (loc.search || ''), label: pageLabel } : null;

        const next = [...answered, {
            role: 'user',
            content: question,
            ...(toSend.length ? { attachments: toSend } : {}),
            ...(page ? { page } : {}),
        }];
        setMessages(next);
        setInput('');
        setAttachments([]);
        setError(null);
        setStep('');
        setPending(true);
        try {
            const history = apiHistory(next);
            const res = await askAssistant(history, {
                context: buildContext(locationRef.current, current.id),
                onStep: setStep,
                onReview,
                onUiTool,
                reviewMode,
            });
            const log = [...(res.queries || []), ...(res.actions || [])];
            setMessages((prev) => [...prev, { role: 'assistant', content: res.text, ...(log.length ? { queries: log } : {}) }]);
        } catch (e) {
            /* La domanda resta a schermo: e' il riferimento per riformulare. */
            setError(e?.message || 'Richiesta non riuscita.');
        } finally {
            setPending(false);
            setStep('');
            setReview(null);
        }
    }

    /**
     * Voto su una risposta: si scrive subito nel messaggio (e quindi nello
     * storico) e si manda al server con domanda e risposta. Un errore di rete
     * toglie il voto e lo dice.
     */
    async function vote(index, value, comment) {
        if (!conv) return;
        const m = messages[index];
        if (!m || m.role !== 'assistant') return;
        const previous = m.feedback || null;
        const next = value === 0 ? null : { vote: value, ...(comment ? { comment } : {}) };
        setMessages((prev) => prev.map((x, i) => (i === index ? { ...x, feedback: next } : x)));
        const question = [...messages.slice(0, index)].reverse().find((x) => x.role === 'user')?.content || '';
        try {
            await sendFeedback({ conversation: conv.id, index, vote: value, comment, question, answer: m.content });
        } catch (e) {
            setMessages((prev) => prev.map((x, i) => (i === index ? { ...x, feedback: previous } : x)));
            toast.error(e?.message || 'Voto non salvato.');
        }
    }

    /** Rimanda l'ultima domanda rimasta senza risposta. */
    function retry() {
        const last = messages[messages.length - 1];
        if (last?.role !== 'user') return;
        /* send() sostituisce l'ultima domanda: gli allegati viaggiano con lei. */
        send(last.content, last.attachments || []);
    }

    function reset() {
        if (pending) return;
        setConv(null);
        setMessages([]);
        setError(null);
        setStep('');
        setInput('');
        setAttachments([]);
    }

    function open(c) {
        if (pending || c.id === conv?.id) return;
        skipSaveRef.current = true;
        setConv({ id: c.id, createdAt: c.createdAt });
        setMessages(c.messages || []);
        setError(null);
        setStep('');
        setInput('');
        setAttachments([]);
    }

    async function remove(c) {
        if (pending) return;
        try {
            await deleteConversation(c.id);
            if (c.id === conv?.id) reset();
        } catch (e) {
            setHistoryError(e?.message || 'Cancellazione non riuscita.');
        }
        refreshHistory();
    }

    const started = messages.length > 0 || pending;

    const value = useMemo(() => ({
        allowed, admin, panelEnabled, panelOpen, onAssistantPage,
        messages, input, setInput, pending, step, error, reviewMode, reviewByUser, conv, history, historyError, review, started,
        attachments, reading, lastPage, archived,
        send, retry, reset, open, remove, archive, refreshArchived, decide, toggleReviewMode, vote, addFiles, removeAttachment, redoAction, goToPage,
        openPanel, closePanel, togglePanel,
    }), [allowed, admin, panelEnabled, panelOpen, onAssistantPage, messages, input, pending, step, error, reviewMode, reviewByUser,
        conv, history, historyError, review, started, attachments, reading, archived]);

    return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}
