import { ApiManager } from '../../core/api-manager';
import { settings } from '../../config/settings';
import { Utils } from '../../core/utils';

/**
 * Assistente AI: client dei due endpoint /ai/message e /ai/tool.
 *
 * Il giro agentico sta qui, nel browser. Una domanda si risolve alternando due
 * chiamate: si manda la conversazione al modello, e se il modello chiede dei
 * tool li si esegue e gli si rimandano i risultati, finche' non risponde a
 * parole. Il backend fa un passo per volta e non tiene stato.
 *
 * Perche' non tutto nel backend: un ciclo completo dentro una sola richiesta
 * PHP puo' durare un minuto, e i timeout (max_execution_time, reverse proxy)
 * sarebbero la prima cosa a rompersi in produzione. In piu' da qui si vede
 * cosa sta facendo, che durante l'attesa e' l'unica cosa utile da mostrare.
 *
 * TRE FAMIGLIE DI TOOL:
 *  - run_select / search_schema / distinct_values: li esegue il server
 *    (/ai/tool) con l'utente MySQL in sola lettura;
 *  - i tool di progetto (custom/ai_tools.php nel backend): stessa strada;
 *  - ui_navigate / ui_open_form / ui_open_record: li esegue QUESTO browser,
 *    tramite la callback onUiTool (vedi uiTools.js). Non passano dal server:
 *    aprono pagine e form, non toccano il database.
 *
 * CONTESTO DI PAGINA: ogni chiamata a /ai/message porta `context` (rotta,
 * entita' e id aperti, menu ed etichette del progetto, vedi pageContext.js),
 * cosi' "quanto ci deve questo cliente?" dalla sua scheda ha un senso.
 *
 * MODALITA' REVISIONE: quando il modello vuole eseguire una SELECT, il giro si
 * ferma e la query — gia' validata e normalizzata dal backend, LIMIT incluso —
 * viene mostrata all'utente tramite la callback onReview. L'utente puo'
 * eseguirla, correggerla nel riquadro (parte la sua versione, rivalidata dal
 * server) o rifiutarla con una motivazione che torna al modello come risultato
 * del tool, cosi' riformula. Una query che la validazione rifiuta non viene
 * mostrata: l'errore va dritto al modello che si corregge da solo.
 * search_schema e distinct_values non chiedono mai approvazione: sono letture
 * innocue di metadati, e farle approvare renderebbe la revisione insostenibile.
 *
 * Cosa NON viaggia da qui: il system prompt, l'elenco dei tool, il modello.
 * Ogni SQL (anche quello approvato o corretto) viene RI-validato dal server.
 */

/** Quanti giri modello -> tool -> modello prima di arrendersi. */
const MAX_STEPS = 10;

/** Cosa dire mentre un tool sta girando. */
const TOOL_LABELS = {
    run_select: 'Interrogo il database',
    search_schema: 'Consulto lo schema',
    distinct_values: 'Cerco i valori esatti',
    ui_navigate: 'Apro la pagina',
    ui_open_form: 'Preparo il form',
    ui_open_record: 'Apro la scheda',
    read_file: 'Leggo un allegato',
};

/**
 * Configurazione dell'assistente in src/config/settings.js:
 *
 *   aiAssistant: { enabled: true, levels: [0], panel: true, approveQueries: 'user' }
 *
 *   enabled         false spegne tutto (pagina, pannello, bottone in header)
 *   levels          livelli utente ammessi: solo UI, la guardia vera e' nel
 *                   backend (ai_assistant.levels in config/settings.json)
 *   panel           pannello laterale su ogni pagina (bottone in header)
 *   approveQueries  'user' (default): l'utente sceglie con l'interruttore
 *                   "Approva le query" e la scelta resta nel browser;
 *                   true: ogni SELECT si ferma sempre in revisione, senza
 *                   interruttore; false: mai, senza interruttore.
 *
 * Retrocompatibile con la forma precedente, `aiAssistantLevels: [0]`.
 */
export function assistantConfig() {
    const cfg = settings.aiAssistant;
    if (cfg && typeof cfg === 'object') {
        const a = cfg.approveQueries;
        return {
            enabled: cfg.enabled !== false,
            levels: Array.isArray(cfg.levels) ? cfg.levels.map(Number) : [0],
            panel: cfg.panel !== false,
            approveQueries: a === true || a === false ? a : 'user',
            adminLevels: Array.isArray(cfg.adminLevels) ? cfg.adminLevels.map(Number) : [0],
        };
    }
    const legacy = Array.isArray(settings.aiAssistantLevels) ? settings.aiAssistantLevels.map(Number) : null;
    return { enabled: legacy !== null, levels: legacy || [0], panel: false, approveQueries: 'user', adminLevels: [0] };
}

/** L'utente vede il pannello admin (spesa, uso, segnalazioni)? Rispecchia ai_assistant.admin_levels. */
export function isAssistantAdmin(userInfo) {
    const cfg = assistantConfig();
    return cfg.enabled && cfg.adminLevels.includes(Number(userInfo?.level));
}

/** L'utente puo' usare l'assistente (pagina e pannello)? */
export function isAssistantAllowed(userInfo) {
    const cfg = assistantConfig();
    return cfg.enabled && cfg.levels.includes(Number(userInfo?.level));
}

/** Il pannello laterale e' attivo per questo utente? */
export function isPanelEnabled(userInfo) {
    return assistantConfig().panel && isAssistantAllowed(userInfo);
}

/** Messaggi d'errore leggibili, per codice del backend. */
export function humanError(code, fallback) {
    switch (code) {
        case 'ai.forbidden':
            return 'L\'assistente e\' riservato agli amministratori.';
        case 'ai.no_key':
            return 'Assistente non configurato: manca la chiave API sul server (api_keys.anthropic_api_key).';
        case 'ai.no_readonly':
            return 'Assistente non configurato: manca l\'utente database read-only sul server (ai_assistant.db_readonly).';
        case 'ai.too_long':
            return 'La conversazione e\' diventata troppo lunga: aprine una nuova.';
        case 'ai.upstream':
            return fallback || 'Il servizio AI non ha risposto. Riprova tra poco.';
        case 'ai.max_steps':
            return 'Non sono riuscito a completare la richiesta. Prova a riformularla.';
        case 'ai.budget':
            return fallback || 'Tetto di spesa mensile dell\'assistente raggiunto.';
        default:
            return fallback || 'Richiesta non riuscita.';
    }
}

export class AssistantError extends Error {
    constructor(code, message) {
        super(humanError(code, message));
        this.code = code;
    }
}

export async function call(action, body) {
    const res = await ApiManager.sendAuthenticatedRequest('/ai/' + action, body);
    if (res?.success !== 1) {
        throw new AssistantError(res?.error_code, res?.message);
    }
    return res.data || {};
}

/**
 * Excel del risultato completo di una query del registro (/ai/export): il
 * server rivalida il SQL, lo riesegue con un tetto dedicato e torna il file
 * in base64; qui parte il download. Non passa dal modello. Torna
 * { rowCount, truncated, maxRows } per il messaggio all'utente.
 */
export async function exportQuery(sql, purpose) {
    const data = await call('export', { sql: sql, purpose: purpose || null });
    Utils.downloadBase64(data);
    return { rowCount: data.row_count, truncated: data.truncated === true, maxRows: data.max_rows };
}

/**
 * Pollice su/giu' su una risposta (/ai/feedback). `vote` 1, -1 o 0 per
 * togliere il voto. Domanda e risposta viaggiano insieme al voto, cosi' il
 * pannello admin le mostra anche se la conversazione viene cancellata.
 */
export async function sendFeedback({ conversation, index, vote, comment, question, answer }) {
    return call('feedback', { conversation, index, vote, comment: comment || null, question, answer });
}

/** Statistiche del pannello admin (/ai/admin_stats). period: month | prev_month | 30d | year | all */
export async function adminStats(period) {
    return call('admin_stats', { period });
}

/** Testo di una risposta: i soli blocchi di testo, concatenati. */
function replyText(content) {
    return (content || [])
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
}

/** Esegue run_select sul server e costruisce tool_result + riga di log. */
async function executeSelect(toolUseId, sql, purpose, edited, queries) {
    try {
        const out = await call('tool', {
            name: 'run_select',
            input: { sql: sql, purpose: purpose },
            edited: edited === true,
        });
        const result = out.result || {};
        queries.push({
            sql: result.sql || sql,
            purpose: purpose,
            rowCount: result.row_count,
            durationMs: result.duration_ms,
            truncated: result.truncated === true,
            error: result.error || null,
            edited: edited === true,
        });
        return { tool_use_id: toolUseId, content: JSON.stringify(result), is_error: !!result.error };
    } catch (e) {
        queries.push({ sql: sql, purpose: purpose, error: e?.message || 'query non riuscita', edited: edited === true });
        return {
            tool_use_id: toolUseId,
            content: JSON.stringify({ error: e?.message || 'query non riuscita' }),
            is_error: true,
        };
    }
}

/** Un tool di progetto o di schema: sul server, senza revisione. */
async function executeServerTool(t, queries) {
    try {
        const out = await call('tool', { name: t.name, input: t.input || {} });
        const result = out.result ?? {};
        if (!['search_schema', 'distinct_values'].includes(t.name)) {
            /* I tool di progetto finiscono nel log come le query: si vede cosa ha usato. */
            queries.push({ tool: t.name, input: t.input || {}, error: result.error || null });
        }
        /* read_file: il file torna come blocchi (document/image) da mettere
           nel tool_result accanto ai metadati; il JSON da solo non basta. */
        if (Array.isArray(result.blocks) && result.blocks.length) {
            const { blocks, ...meta } = result;
            return { tool_use_id: t.id, content: [{ type: 'text', text: JSON.stringify(meta) }, ...blocks], is_error: false };
        }
        return { tool_use_id: t.id, content: JSON.stringify(result), is_error: !!result.error };
    } catch (e) {
        /* Anche il fallimento della chiamata (risposta non JSON, rete) va
           nel registro: altrimenti l'operazione sparisce e resta solo la
           spiegazione del modello, che non sa cosa e' successo. */
        const error = e?.message || 'lettura non riuscita';
        if (!['search_schema', 'distinct_values'].includes(t.name)) {
            queries.push({ tool: t.name, input: t.input || {}, error: 'chiamata fallita: ' + error });
        }
        return {
            tool_use_id: t.id,
            content: JSON.stringify({ error: 'Il tool ' + t.name + ' non ha risposto: ' + error }),
            is_error: true,
        };
    }
}

/** Un'azione UI: nel browser, tramite la callback. */
async function executeUiTool(t, onUiTool, actions) {
    if (typeof onUiTool !== 'function') {
        return {
            tool_use_id: t.id,
            content: JSON.stringify({ error: 'Azioni UI non disponibili in questa vista.' }),
            is_error: true,
        };
    }
    try {
        const result = (await onUiTool(t.name, t.input || {})) || { ok: true };
        actions.push({ tool: t.name, input: t.input || {}, error: result.error || null });
        return { tool_use_id: t.id, content: JSON.stringify(result), is_error: !!result.error };
    } catch (e) {
        const error = e?.message || 'azione non riuscita';
        actions.push({ tool: t.name, input: t.input || {}, error });
        return { tool_use_id: t.id, content: JSON.stringify({ error }), is_error: true };
    }
}

/**
 * Chiede all'assistente.
 *
 * @param {Array<{role:'user'|'assistant', content:string}>} history
 *   la conversazione a parole, compresa la domanda appena scritta
 * @param {object} [opts]
 * @param {object} [opts.context] contesto di pagina (vedi pageContext.js),
 *   mandato al server con ogni chiamata al modello
 * @param {(label:string)=>void} [opts.onStep] chiamata a ogni passo, per dire
 *   a schermo cosa sta facendo
 * @param {boolean} [opts.reviewMode] default true: le SELECT si fermano in
 *   revisione prima di essere eseguite
 * @param {(pending:Array<{toolUseId:string,sql:string,purpose?:string}>)
 *   => Promise<Array<{toolUseId:string,action:'run'|'reject',sql?:string,reason?:string}>>}
 *   [opts.onReview] mostra le query all'utente e risolve con le sue decisioni.
 *   Obbligatoria se reviewMode e' attivo.
 * @param {(name:string, input:object)=>Promise<object>} [opts.onUiTool]
 *   esegue un'azione UI (ui_*) e risolve con l'oggetto da rimandare al modello
 * @returns {Promise<{text:string, usage:{input:number,output:number}, steps:number,
 *   queries:Array, actions:Array}>}
 * @throws {AssistantError} con `code` gia' tradotto in `message`
 */
export async function askAssistant(history, { context, onStep, onReview, onUiTool, reviewMode = true } = {}) {
    const messages = (history || []).map((m) => ({ role: m.role, content: m.content }));
    const usage = { input: 0, output: 0 };
    const queries = [];
    const actions = [];

    for (let step = 0; step < MAX_STEPS; step++) {
        if (onStep) onStep('');
        const res = await call('message', { messages, context: context || {} });

        usage.input += Number(res.usage?.input_tokens || 0);
        usage.output += Number(res.usage?.output_tokens || 0);

        const content = Array.isArray(res.content) ? res.content : [];
        const toolUses = content.filter((b) => b?.type === 'tool_use');

        if (toolUses.length === 0) {
            /* Un rifiuto arriva come risposta valida, non come errore HTTP. */
            if (res.stop_reason === 'refusal') {
                throw new AssistantError('ai.refusal', 'La richiesta non e\' stata accettata dal modello. Riformulala.');
            }
            const text = replyText(content);
            if (!text) {
                throw new AssistantError('ai.empty', 'Il modello non ha prodotto una risposta. Riprova.');
            }
            return {
                text: res.stop_reason === 'max_tokens'
                    ? text + '\n\n*(risposta interrotta perche\' troppo lunga: chiedi un dettaglio per volta)*'
                    : text,
                usage,
                steps: step + 1,
                queries,
                actions,
            };
        }

        messages.push({ role: 'assistant', content });

        if (onStep) {
            const labels = toolUses.map((t) => TOOL_LABELS[t.name] || 'Consulto i dati');
            onStep([...new Set(labels)].join(', ') + '...');
        }

        /* Con la revisione attiva le run_select si separano dagli altri tool:
           prima si validano (una query invalida NON si mostra, l'errore torna
           al modello), poi quelle valide passano dall'utente. */
        const results = [];
        const pending = [];

        for (const t of toolUses) {
            if (t.name.startsWith('ui_')) {
                results.push(await executeUiTool(t, onUiTool, actions));
                continue;
            }

            if (t.name === 'run_select' && reviewMode && typeof onReview === 'function') {
                const rawSql = String(t.input?.sql || '');
                const purpose = t.input?.purpose ? String(t.input.purpose) : undefined;
                try {
                    const out = await call('tool', { name: 'run_select', input: t.input || {}, validate: true });
                    if (out.valid === true) {
                        pending.push({ toolUseId: t.id, sql: out.sql, purpose });
                    } else {
                        const result = out.result || { error: 'query non valida' };
                        queries.push({ sql: rawSql, purpose, error: result.error });
                        results.push({ tool_use_id: t.id, content: JSON.stringify(result), is_error: true });
                    }
                } catch (e) {
                    queries.push({ sql: rawSql, purpose, error: e?.message || 'validazione non riuscita' });
                    results.push({
                        tool_use_id: t.id,
                        content: JSON.stringify({ error: e?.message || 'validazione non riuscita' }),
                        is_error: true,
                    });
                }
                continue;
            }

            if (t.name === 'run_select') {
                results.push(await executeSelect(
                    t.id, String(t.input?.sql || ''), t.input?.purpose ? String(t.input.purpose) : undefined, false, queries));
                continue;
            }

            /* search_schema, distinct_values e tool di progetto: mai in revisione. */
            results.push(await executeServerTool(t, queries));
        }

        if (pending.length) {
            const decisions = await onReview(pending);
            const byId = new Map((decisions || []).map((d) => [d.toolUseId, d]));

            for (const p of pending) {
                const d = byId.get(p.toolUseId);
                if (!d || d.action === 'reject') {
                    const reason = d?.reason?.trim();
                    queries.push({ sql: p.sql, purpose: p.purpose, error: reason ? `rifiutata: ${reason}` : 'rifiutata dall\'utente', rejected: true });
                    results.push({
                        tool_use_id: p.toolUseId,
                        content: JSON.stringify({
                            error: 'Query rifiutata dall\'utente.',
                            reason: reason || 'nessuna motivazione fornita',
                            hint: 'Riformula la query tenendo conto dell\'obiezione, oppure chiedi un chiarimento.',
                        }),
                        is_error: true,
                    });
                    continue;
                }
                const sql = d.sql?.trim() || p.sql;
                const edited = sql !== p.sql;
                results.push(await executeSelect(p.toolUseId, sql, p.purpose, edited, queries));
            }
        }

        /* Tutti i tool_result in UN SOLO messaggio utente, nell'ordine dei
           tool_use: spezzarli insegnerebbe al modello a non chiedere piu'
           letture insieme. */
        const order = new Map(toolUses.map((t, i) => [t.id, i]));
        results.sort((a, b) => (order.get(a.tool_use_id) ?? 0) - (order.get(b.tool_use_id) ?? 0));
        messages.push({
            role: 'user',
            content: results.map((r) => ({
                type: 'tool_result',
                tool_use_id: r.tool_use_id,
                content: r.content,
                ...(r.is_error ? { is_error: true } : {}),
            })),
        });
    }

    throw new AssistantError('ai.max_steps');
}
