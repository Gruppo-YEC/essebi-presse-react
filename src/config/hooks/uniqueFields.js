import { DataManager } from '../../core/data-manager';

/*
 * Campi univoci del catalogo. Nel database non c'è un vincolo UNIQUE (tables.json di
 * essebi-presse-ckd): l'unicità la controllano preInsert e preUpdate prima di salvare.
 * Il confronto lo fa MySQL (collation utf8mb4_unicode_ci): maiuscole e minuscole contano
 * come lo stesso valore. I record cancellati (deleted = 1) non contano.
 *
 * Tenere allineato a tables.json: un campo aggiunto qui va descritto come univoco lì.
 */
export const UNIQUE_FIELDS = {
    item_goods_category: { slug: 'Slug' },
    item_technical_category: { slug: 'Slug' },
    item_technical_type: { slug: 'Slug' },
    brand: { slug: 'Slug' },
    item_model: { sku: 'SKU', slug: 'Slug' },
    item_attribute_definition: { code: 'Codice' },
};

/**
 * Controlla che i campi univoci di `data` non siano già usati da un altro record.
 * `id` è il record in modifica (escluso dal confronto); null in inserimento.
 * Controlla solo i campi presenti in `data`: una modifica parziale (es. modifica in blocco)
 * che non tocca il campo non lo ricontrolla.
 * Ritorna { success: 1 } oppure { success: 0, message }.
 */
export async function checkUniqueFields(entity, data, id = null) {
    const fields = UNIQUE_FIELDS[entity];
    if (!fields) return { success: 1 };

    const duplicates = [];
    for (const [field, label] of Object.entries(fields)) {
        if (!(field in data)) continue;
        const value = typeof data[field] === 'string' ? data[field].trim() : data[field];
        if (value === null || value === undefined || value === '') continue;

        const constraints = [{ fieldName: field, type: 'value', value: value }];
        if (id !== null && id !== undefined && id !== '') {
            constraints.push({ fieldName: 'id', type: 'different_from_value', value: id });
        }

        // searchItems (senza cache): deve vedere anche i record appena salvati da altri
        const response = await DataManager.searchItems(entity, 1, 1, { field: 'id', order: 'ASC' }, '', [], constraints);
        if (!response || response.success !== 1) {
            return { success: 0, message: `Impossibile verificare che ${label} sia univoco: riprova.` };
        }
        if (response.body && response.body.length > 0) {
            duplicates.push(`${label} "${value}"`);
        }
    }

    if (duplicates.length > 0) {
        return { success: 0, message: `Già usato da un altro record: ${duplicates.join(', ')}.` };
    }
    return { success: 1 };
}

/** Toglie gli spazi in testa e in coda ai campi univoci, prima del controllo e del salvataggio. */
export function trimUniqueFields(entity, data) {
    const fields = UNIQUE_FIELDS[entity];
    if (!fields) return data;
    const d = { ...data };
    for (const field of Object.keys(fields)) {
        if (typeof d[field] === 'string') d[field] = d[field].trim();
    }
    return d;
}
