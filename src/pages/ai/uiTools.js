import { DataManager } from '../../core/data-manager';
import { ViewManager } from '../../core/view-manager';
import { AuthorizationManager } from '../../core/authorization-manager';
import { LanguageProvider } from '../../core/language-provider';

/**
 * Azioni UI dell'assistente (tool `ui_*`): il modello le chiede, il browser
 * le esegue. Qui c'e' la parte senza React: validare la rotta, controllare i
 * permessi, tradurre i valori scalari del modello nella forma che il form del
 * framework si aspetta. Chi naviga e chi apre il pannello e' AiProvider.
 *
 * Il modello parla per scalari (id, nomi, valori tecnici); il form del
 * framework vuole oggetti: externalEntity = il record intero (almeno `id` e
 * il labelField), option = { value, label }, boolean = true/false. La
 * traduzione sta in resolveFormPrefill. Un valore che non si riesce a
 * risolvere NON blocca: il form si apre senza, e la nota torna al modello.
 */

/** Rotta interna valida: comincia con '/', niente protocollo, niente '//'. */
export function internalPath(path) {
    const p = String(path || '').trim();
    if (!p.startsWith('/') || p.startsWith('//')) return null;
    if (/[\s<>"']/.test(p)) return null;
    return p;
}

export function entityListPath(entity) {
    return `/entity/${entity}`;
}

export function recordPath(entity, id) {
    return `/entity/${entity}/item?id=${id}`;
}

export function addPath(entity) {
    return `/entity/${entity}/add`;
}

export function editPath(entity, id) {
    return `/entity/${entity}/edit?id=${id}`;
}

/** Nome tecnico pulito di un'entita', o null se non esiste per questo utente. */
export function knownEntity(name) {
    const e = String(name || '').trim();
    if (!/^[a-z0-9_]+$/i.test(e)) return null;
    return ViewManager.getEntityProperties(e) ? e : null;
}

export function entityLabel(entity) {
    return LanguageProvider.get('entity.' + entity, entity);
}

/** L'utente puo' fare `action` (create | edit | view) su questa entita'? */
export function canDo(entity, action) {
    try {
        const v = AuthorizationManager.checkEntityActionAuth(entity, action);
        return v !== false && v !== undefined && v !== null;
    } catch {
        return true; /* in dubbio lascia fare: il backend rifiuta comunque */
    }
}

function singleItem(r) {
    if (!r || r.success !== 1 || !r.body) return null;
    if (Array.isArray(r.body)) return r.body.length ? r.body[0] : null;
    return typeof r.body === 'object' ? r.body : null;
}

/** Record di un'entita' per id o per etichetta esatta (poi parziale, se unica). */
async function resolveReference(targetEntity, labelField, value) {
    if (value && typeof value === 'object' && value.id) return value;

    const asId = typeof value === 'number' ? value : (/^\d+$/.test(String(value)) ? parseInt(value, 10) : null);
    if (asId !== null) {
        const item = singleItem(await DataManager.getItemSimple(targetEntity, asId));
        return item || null;
    }

    const text = String(value || '').trim();
    if (!text || !labelField) return null;
    const r = await DataManager.searchItemsSimple(
        targetEntity, 1, 10, { field: labelField, order: 'asc' }, text, [labelField], []);
    const rows = r?.success === 1 && Array.isArray(r.body) ? r.body : [];
    if (!rows.length) return null;
    const exact = rows.find((x) => String(x[labelField] || '').toLowerCase() === text.toLowerCase());
    if (exact) return exact;
    return rows.length === 1 ? rows[0] : null;
}

/**
 * { colonna: valore } dal modello -> initData per FormEntityInstanceCompiler.
 *
 * I campi deepExternalEntity (righe figlie: contatti di un cliente, servizi
 * di un preventivo) NON si precompilano: il modello dice all'utente di
 * aggiungerli a mano nella sezione del form. Provato e tolto: troppi modi di
 * sbagliare le righe, meglio un form pulito e un'istruzione chiara.
 *
 * @returns {Promise<{initData:object, applied:string[], skipped:Array<{field:string, reason:string}>}>}
 */
/**
 * Il modello non sempre usa il nome tecnico della colonna: "service" per
 * idService, "cliente" per idCustomer, l'etichetta tradotta. Cerca la
 * colonna vera in quest'ordine: nome esatto, nome senza maiuscole/minuscole,
 * "id" + nome, colonna FK che punta all'entita' con quel nome, etichetta.
 */
function findColumn(entity, columns, field) {
    if (columns[field]) return field;
    const f = String(field || '').trim();
    if (!f) return null;
    const low = f.toLowerCase();
    const names = Object.keys(columns);
    let hit = names.find((n) => n.toLowerCase() === low);
    if (hit) return hit;
    hit = names.find((n) => n.toLowerCase() === 'id' + low);
    if (hit) return hit;
    hit = names.find((n) => columns[n].input_type === 'externalEntity' && String(columns[n].options?.entity || '').toLowerCase() === low);
    if (hit) return hit;
    hit = names.find((n) => String(LanguageProvider.getLabel(entity, n) || '').toLowerCase() === low);
    return hit || null;
}

export async function resolveFormPrefill(entity, values) {
    const props = ViewManager.getEntityProperties(entity);
    const columns = props?.columns || {};
    const initData = {};
    const applied = [];
    const skipped = [];

    for (const [rawField, raw] of Object.entries(values || {})) {
        const field = findColumn(entity, columns, rawField);
        const col = field ? columns[field] : null;
        if (!col) { skipped.push({ field: rawField, reason: `campo inesistente (colonne: ${Object.keys(columns).filter((n) => columns[n].options?.editable !== false).join(', ')})` }); continue; }
        if (col.options && col.options.editable === false) { skipped.push({ field, reason: 'campo non modificabile' }); continue; }
        if (raw === null || raw === undefined || raw === '') continue;

        switch (col.input_type) {
            case 'externalEntity': {
                const target = col.options?.entity;
                const labelField = col.options?.labelField;
                const item = target ? await resolveReference(target, labelField, raw) : null;
                if (item) { initData[field] = item; applied.push(field); }
                else skipped.push({ field, reason: `nessun record ${target} trovato per "${raw}"` });
                break;
            }
            case 'multipleExternalEntity': {
                const target = col.options?.entity;
                const labelField = col.options?.labelField;
                const list = Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
                const items = [];
                for (const v of list) {
                    const item = target ? await resolveReference(target, labelField, v) : null;
                    if (item) items.push(item);
                }
                if (items.length) { initData[field] = items; applied.push(field); }
                else skipped.push({ field, reason: `nessun record ${target} trovato` });
                break;
            }
            case 'deepExternalEntity': {
                const child = col.options?.entity;
                skipped.push({ field, reason: `le righe figlie (${child || 'tabella figlia'}) non si precompilano: l'utente le aggiunge a mano nella sezione "${LanguageProvider.getLabel(entity, field)}" del form` });
                break;
            }
            case 'file':
                skipped.push({ field, reason: 'si compila solo nel form' });
                break;
            case 'option': {
                const allowed = (col.options?.options || []).map((o) => (typeof o === 'object' ? o.value : o));
                const v = String(raw);
                const match = allowed.find((a) => String(a) === v)
                    ?? allowed.find((a) => String(a).toLowerCase() === v.toLowerCase());
                if (match !== undefined) { initData[field] = { value: match, label: match }; applied.push(field); }
                else skipped.push({ field, reason: `valore "${v}" non ammesso (ammessi: ${allowed.join(', ')})` });
                break;
            }
            case 'boolean': {
                const v = raw === true || raw === 1 || String(raw).toLowerCase() === 'true' || String(raw) === '1';
                initData[field] = v;
                applied.push(field);
                break;
            }
            default:
                initData[field] = typeof raw === 'object' ? JSON.stringify(raw) : raw;
                applied.push(field);
        }
    }

    return { initData, applied, skipped };
}

/** Riga di risultato per il modello dopo un ui_open_form. */
export function formToolResult(entity, id, applied, skipped) {
    const label = entityLabel(entity);
    const res = {
        ok: true,
        opened: id ? `pagina di modifica di ${label} (id ${id})` : `pagina di inserimento di ${label}`,
        prefilled: applied,
    };
    if (skipped.length) res.not_prefilled = skipped;
    res.note = 'L\'utente e\' ora nella pagina del form, con l\'assistente a lato: controlla e salva. Non e\' stato salvato nulla.';
    return res;
}
