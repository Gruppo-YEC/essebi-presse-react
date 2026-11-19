/*
 * Strumenti comuni alle pagine custom del catalogo (Categorie, Attributi, Editor articolo).
 *
 * Formato dei dati: le liste arrivano da search_items con le entità collegate già risolte
 * (externalEntity → oggetto, file → { hash, extension, … }). In scrittura DataManager passa
 * per parseData, che vuole lo stesso formato "risolto":
 *   externalEntity → { id }   (stringa vuota = svuota il campo)
 *   option         → { value }
 *   file           → { hash } (null = svuota il campo)
 * Gli helper ref / opt / fileRef qui sotto costruiscono quei valori a partire da id e valori semplici.
 * Le scritture passano da DataManager, quindi valgono preInsert / preUpdate del progetto
 * (controllo di unicità di slug, sku, code).
 */
import { DataManager } from '../../core/data-manager';
import { ResourceManager } from '../../core/resource-manager';
import { toast } from '../../components/ui/toast';

/* ------------------------------------------------------------------ valori */

/** Id da un valore risolto ({ id, … }) o semplice */
export const idOf = (v) => (v && typeof v === 'object' ? (v.id ?? null) : (v === '' || v === undefined ? null : v));

/** Confronto tra id che possono arrivare come numero o stringa */
export const sameId = (a, b) => a !== null && a !== undefined && String(a) === String(b);

/** Valore di un campo option, risolto ({ value }) o semplice */
export const optOf = (v) => (v && typeof v === 'object' ? v.value : v);

/** Boolean del gestionale (0/1, "0"/"1", true/false) */
export const boolOf = (v) => v === true || v === 1 || v === '1';

/** externalEntity da scrivere: { id } oppure '' per svuotare */
export const ref = (id) => (id === null || id === undefined || id === '' ? '' : { id: Number(id) });

/** option da scrivere */
export const opt = (value) => ({ value });

/** file da scrivere: { hash } oppure null per svuotare */
export const fileRef = (file) => (file && file.hash ? { hash: file.hash } : null);

/** Slug dal testo: minuscolo, senza accenti, parole separate da trattini */
export function slugify(text) {
    return (text || '')
        .toString()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120);
}

/** Codice tecnico dal testo (attributi): minuscolo, parole unite in camelCase */
export function codify(text) {
    const words = slugify(text).split('-').filter(Boolean);
    return words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('').slice(0, 60);
}

/* ------------------------------------------------------------------ lettura */

const BY_SORT = [{ field: 'sortOrder', order: 'ASC' }, { field: 'id', order: 'ASC' }];

/**
 * Tutte le righe di un'entità (fino a 1000), senza cache: dopo una scrittura si rilegge
 * sempre il dato aggiornato.
 */
export async function listAll(entity, { constraints = [], order = BY_SORT } = {}) {
    const response = await DataManager.searchItems(entity, 1, 1000, order, '', [], constraints);
    if (!response || response.success !== 1) {
        throw new Error(response?.message || `Caricamento di ${entity} non riuscito`);
    }
    return response.body || [];
}

/** Quanti articoli usano un valore (es. idTechnicalType = 5); null se il conteggio non riesce */
export async function countItems(field, id) {
    const response = await DataManager.searchItems('item_model', 1, 1, { field: 'id', order: 'ASC' }, '', [], [
        { fieldName: field, type: 'value', value: id },
    ]);
    if (!response || response.success !== 1) return null;
    return response.total ?? response.count ?? (response.body || []).length;
}

/* ---------------------------------------------------------------- scrittura */

/**
 * Crea (id vuoto) o aggiorna una riga. Ritorna l'id salvato, o null se non riesce.
 * Gli errori dei controlli del progetto (preInsert/preUpdate) hanno già il loro toast:
 * qui si segnalano solo quelli del server.
 */
export async function saveRow(entity, data, id = null) {
    const response = id ? await DataManager.updateItem(entity, data, id) : await DataManager.insertItem(entity, data);
    if (!response || response.success !== 1) {
        if (!response || response.status !== undefined) toast.error(response?.message || 'Salvataggio non riuscito');
        return null;
    }
    return id || response.id || response.body?.id || null;
}

/** Elimina una riga (cancellazione logica del framework). true se riuscita. */
export async function removeRow(entity, id) {
    const response = await DataManager.deleteItem(entity, id);
    if (!response || response.success !== 1) {
        toast.error(response?.message || 'Eliminazione non riuscita');
        return false;
    }
    return true;
}

/**
 * Salva l'ordine di una lista: sortOrder = 10, 20, 30… seguendo l'ordine dell'array.
 * Aggiorna solo le righe il cui sortOrder cambia.
 */
export async function saveOrder(entity, rows) {
    const changes = rows
        .map((row, i) => ({ row, sortOrder: (i + 1) * 10 }))
        .filter(({ row, sortOrder }) => Number(row.sortOrder) !== sortOrder);
    for (const { row, sortOrder } of changes) {
        const response = await DataManager.updateItem(entity, { sortOrder }, row.id);
        if (!response || response.success !== 1) {
            toast.error('Ordine non salvato: riprova');
            return false;
        }
    }
    return true;
}

/** Prossimo sortOrder in coda a una lista */
export const nextSort = (rows) => (rows.reduce((max, r) => Math.max(max, Number(r.sortOrder) || 0), 0) + 10);

/* ------------------------------------------------------------------- file */

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Carica un'immagine nel gestionale; ritorna il file ({ hash, extension, … }) o null */
export async function uploadImage(file, entity) {
    if (!file || !file.type.startsWith('image/')) {
        toast.error(`${file?.name || 'Il file'} non è un'immagine`);
        return null;
    }
    const response = await ResourceManager.uploadBase64(await fileToBase64(file), file.name, entity);
    if (!response || response.success !== 1) {
        toast.error(response?.message || `Caricamento di ${file.name} non riuscito`);
        return null;
    }
    return { ...response.body, entity };
}

/** URL pubblico di un file del gestionale, o null */
export const fileUrl = (file, entity) => (file && file.hash && file.extension ? ResourceManager.getFileUrl(file, file.entity || entity) : null);

/* --------------------------------------------------------- trascinamento */

/*
 * Drag and drop nativo HTML5, senza librerie. Un solo elemento trascinato alla volta
 * in tutta la pagina: `kind` dice cos'è (es. 'technical'), `item` la riga.
 * Una zona di rilascio accetta solo i kind elencati in `accept`.
 */
let current = null;

/** Proprietà da spargere sull'elemento trascinabile */
export function dragProps(kind, item, { onStart, onEnd } = {}) {
    return {
        draggable: true,
        onDragStart: (e) => {
            current = { kind, item };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(item.id ?? ''));
            onStart?.();
        },
        onDragEnd: () => {
            current = null;
            onEnd?.();
        },
    };
}

/** Proprietà da spargere sulla zona di rilascio. setOver(key | null) evidenzia la zona. */
export function dropProps({ accept, onDrop, setOver, overKey }) {
    const ok = () => current && accept.includes(current.kind);
    return {
        onDragOver: (e) => {
            if (!ok()) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setOver?.(overKey);
        },
        onDragLeave: (e) => {
            if (e.currentTarget.contains(e.relatedTarget)) return;
            setOver?.((o) => (o === overKey ? null : o));
        },
        onDrop: (e) => {
            if (!ok()) return;
            e.preventDefault();
            const dropped = current;
            current = null;
            setOver?.(null);
            onDrop(dropped);
        },
    };
}

/** Lista riordinata spostando `moving` al posto di `target` (prima o dopo, secondo la direzione) */
export function moveInList(list, moving, target) {
    const from = list.findIndex((r) => r.id === moving.id);
    const to = list.findIndex((r) => r.id === target.id);
    if (from < 0 || to < 0 || from === to) return list;
    const next = list.slice();
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    return next;
}
