/*
 * Prima foto di un articolo, per la miniatura nell'elenco Articoli (DataGridLastTdHook).
 * L'elenco usa le API "simple", che non portano le foto: qui le richieste delle righe di una
 * stessa pagina vengono raccolte e risolte con UNA sola ricerca su item_model_photo.
 * I risultati restano in memoria per un minuto.
 */
import { DataManager } from '../../core/data-manager';
import { fileUrl } from './shared';

const TTL = 60 * 1000;
const cache = new Map(); // idArticolo → { url, at }
let pending = new Map(); // idArticolo → [resolve…]
let timer = null;

async function flush() {
    const batch = pending;
    pending = new Map();
    timer = null;
    const ids = [...batch.keys()];
    const found = {};
    try {
        const response = await DataManager.searchItems(
            'item_model_photo', 1, 1000, [{ field: 'sortOrder', order: 'ASC' }, { field: 'id', order: 'ASC' }], '', [],
            [{ fieldName: 'idItemModel', type: 'in', value: ids.join(',') }],
        );
        for (const row of (response && response.success === 1 ? response.body || [] : [])) {
            const key = String(row.idItemModel);
            if (!(key in found)) found[key] = fileUrl(row.photo, 'item_model_photo');
        }
    } catch (e) {
        console.warn('Foto articoli non caricate', e);
    }
    const now = Date.now();
    for (const [id, resolvers] of batch) {
        const url = found[String(id)] || null;
        cache.set(String(id), { url, at: now });
        resolvers.forEach((r) => r(url));
    }
}

/** URL della prima foto dell'articolo (o null) */
export function firstPhoto(id) {
    const hit = cache.get(String(id));
    if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.url);
    return new Promise((resolve) => {
        const list = pending.get(id) || [];
        list.push(resolve);
        pending.set(id, list);
        if (!timer) timer = setTimeout(flush, 30);
    });
}

/** URL già in memoria, per disegnare subito senza attese */
export function cachedPhoto(id) {
    const hit = cache.get(String(id));
    return hit ? hit.url : undefined;
}
