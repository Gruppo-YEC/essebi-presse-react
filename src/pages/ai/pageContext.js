import { menu } from '../../config/menu';
import { entity_language } from '../../config/entity_language';

/**
 * Contesto che accompagna ogni chiamata al modello: dove si trova l'utente
 * e come si chiamano le cose in questo progetto.
 *
 * Due parti con due vite diverse:
 *  - la PAGINA (rotta, entita', id, nome della pagina custom) cambia a ogni
 *    navigazione e il backend la mette nel blocco di prompt fuori cache;
 *  - MENU ed ETICHETTE stanno in src/config e non cambiano mai durante la
 *    sessione: il backend li mette nel manuale, che e' in cache. Mandarli a
 *    ogni chiamata costa qualche KB di richiesta e niente di token.
 *
 * Il backend ripulisce tutto (AiAssistant::context): qui non serve difendersi.
 */

/** Rotta corrente -> { route, entity, id, page }. */
export function pageContextFromLocation(location) {
    const pathname = location?.pathname || '/';
    const search = location?.search || '';
    const params = new URLSearchParams(search);
    const ctx = { route: pathname + search };

    const entity = pathname.match(/^\/entity\/([^/]+)(?:\/(add|edit|clone|item))?\/?$/);
    if (entity) {
        ctx.entity = entity[1];
        const id = params.get('id');
        if (id && /^\d+$/.test(id) && (entity[2] === 'item' || entity[2] === 'edit')) ctx.id = id;
        return ctx;
    }

    const page = pathname.match(/^\/page\/([^/]+)\/?$/);
    if (page) {
        ctx.page = page[1];
        const id = params.get('id');
        if (id && /^\d+$/.test(id)) ctx.id = id;
    }
    return ctx;
}

let stableCache = null;

/** Menu appiattito ed etichette delle entita': calcolati una volta. */
export function stableContext() {
    if (stableCache) return stableCache;

    const items = [];
    const walk = (list, parent) => {
        (list || []).forEach((el) => {
            if (!el || !el.label) return;
            if (el.type === 'folder') { walk(el.items, el.label); return; }
            if (el.type === 'item' && el.href && el.href !== '#') {
                items.push({
                    label: String(el.label),
                    href: String(el.href),
                    ...(el.entity ? { entity: String(el.entity) } : {}),
                    ...(parent ? { parent: String(parent) } : {}),
                });
            }
        });
    };
    walk(Array.isArray(menu) ? menu : [], null);

    const labels = {};
    const dict = entity_language?.entity || {};
    Object.keys(dict).forEach((k) => {
        if (typeof dict[k] === 'string') labels[k] = dict[k];
    });

    stableCache = { menu: items, labels };
    return stableCache;
}

/** Il contesto completo da mandare al server. */
/**
 * Etichetta leggibile della pagina corrente, per l'intestazione del pannello:
 * "Articoli · Aggiungi", "Clienti · Scheda #12", "Calendario". Vuota sulla
 * home e sulle rotte senza nome. E' la stessa informazione che parte come
 * contesto: l'utente vede cosa sa l'assistente.
 */
export function describeLocation(location) {
    const ctx = pageContextFromLocation(location);
    const { labels, menu } = stableContext();
    if (ctx.entity) {
        const name = (labels && labels[ctx.entity]) || ctx.entity;
        const mode = (location?.pathname || '').match(/\/(add|edit|clone|item)\/?$/)?.[1];
        const modes = { add: 'Aggiungi', edit: 'Modifica', clone: 'Duplica', item: 'Scheda' };
        if (!mode) return name;
        return name + ' · ' + modes[mode] + (ctx.id ? ' #' + ctx.id : '');
    }
    const pathname = location?.pathname || '/';
    if (pathname === '/') return '';
    const hit = (menu || []).find((m) => m.href === pathname || m.href === pathname + (location?.search || ''));
    if (hit) return hit.label + (ctx.id ? ' #' + ctx.id : '');
    if (ctx.page) return ctx.page.replace(/([a-z])([A-Z])/g, '$1 $2') + (ctx.id ? ' #' + ctx.id : '');
    return '';
}

export function buildContext(location, conversationId) {
    return {
        ...pageContextFromLocation(location),
        ...stableContext(),
        ...(conversationId ? { conversation: conversationId } : {}),
    };
}
