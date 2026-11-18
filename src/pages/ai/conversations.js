/**
 * Conversazioni passate dell'assistente, salvate a database per utente.
 *
 * Tre chiamate a /ai/history_*: la tabella `ai_history` la crea il backend
 * alla prima scrittura, qui non c'e' nulla da predisporre. L'id lo genera il
 * client, cosi' una conversazione si puo' salvare gia' dal primo messaggio.
 *
 * Le conversazioni che una versione precedente teneva in localStorage
 * vengono importate una volta sola e la chiave locale poi sparisce.
 */

import { call } from './aiClient';

const LEGACY_KEY = 'ai_conversations';
const TITLE_LEN = 48;

export function newConversationId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** Titolo = prima domanda, accorciata. */
export function conversationTitle(messages) {
    const first = messages.find((m) => m.role === 'user');
    const text = String(first?.content || '').replace(/\s+/g, ' ').trim();
    if (!text) return 'Nuova conversazione';
    return text.length > TITLE_LEN ? text.slice(0, TITLE_LEN - 1).trimEnd() + '…' : text;
}

/** Elenco ordinato dalla piu' recente (ordina il server): attive, o archiviate. */
export async function listConversations({ archived = false } = {}) {
    await importLegacy();
    const data = await call('history_list', { archived });
    return Array.isArray(data.conversations) ? data.conversations : [];
}

/** Mette da parte una conversazione (o la ripristina): non la cancella. */
export async function archiveConversation(id, archived = true) {
    await call('history_archive', { id, archived });
}

export async function saveConversation({ id, messages }) {
    await call('history_save', {
        id,
        title: conversationTitle(messages),
        messages: messages.map(({ role, content, queries, feedback, attachments, page }) => ({
            role, content,
            ...(queries ? { queries } : {}),
            ...(feedback ? { feedback } : {}),
            ...(page ? { page } : {}),
            /* degli allegati resta solo nome/tipo/dimensione, mai il contenuto */
            ...(attachments?.length ? { attachments: attachments.map(({ name, kind, size }) => ({ name, kind, size })) } : {}),
        })),
    });
}

export async function deleteConversation(id) {
    await call('history_delete', { id });
}

/** Porta a database quel che era rimasto in localStorage, poi lo cancella. */
async function importLegacy() {
    let list = [];
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        list = raw ? JSON.parse(raw) : [];
    } catch {
        return;
    }
    if (!Array.isArray(list) || !list.length) {
        try { localStorage.removeItem(LEGACY_KEY); } catch { /* niente */ }
        return;
    }
    /* Dalla piu' vecchia, cosi' l'ordine per updated_at resta sensato. */
    const ordered = [...list].sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    for (const c of ordered) {
        if (!c?.id || !Array.isArray(c.messages) || !c.messages.length) continue;
        await saveConversation({ id: String(c.id).replace(/[^a-z0-9]/gi, '').slice(0, 32), messages: c.messages });
    }
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* niente */ }
}

/** "venerdì 11:46" se recente, altrimenti data completa. */
export function formatConversationDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const sameWeek = Date.now() - ts < 6 * 24 * 60 * 60 * 1000;
    const opts = sameWeek
        ? { weekday: 'long', hour: '2-digit', minute: '2-digit' }
        : { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return d.toLocaleString('it-IT', opts);
}
