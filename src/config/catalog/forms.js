/*
 * Campi dei modali e conversione da/verso il formato del gestionale per le entità del catalogo.
 * Ogni entità ha: xxxFields(...) per EntityDialog, xxxInitial(row) per aprire il modale
 * su una riga esistente, xxxPayload(values) per salvarla.
 */
import { boolOf, fileRef, idOf, opt, optOf, ref } from './shared';

export const DATA_TYPES = [
    { value: 'number', label: 'Numero' },
    { value: 'enum', label: 'A scelta' },
    { value: 'boolean', label: 'Sì / No' },
    { value: 'text', label: 'Testo' },
];
export const dataTypeLabel = (v) => DATA_TYPES.find((t) => t.value === v)?.label || v;

const visible = { key: 'isShopVisible', label: 'Visibile sul sito', type: 'switch' };

/* ------------------------------------------------- categoria merceologica */

export const goodsFields = [
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true, help: 'Usato negli indirizzi del sito' },
    { key: 'description', label: 'Descrizione', type: 'textarea' },
    { key: 'image', label: 'Immagine', type: 'image', entity: 'item_goods_category' },
    visible,
];
export const goodsInitial = (r) => ({ name: r.name, slug: r.slug, description: r.description || '', image: r.image || null, isShopVisible: boolOf(r.isShopVisible) ? 1 : 0 });
export const goodsPayload = (v) => ({ name: v.name.trim(), slug: v.slug.trim(), description: v.description || '', image: fileRef(v.image), isShopVisible: v.isShopVisible ? 1 : 0 });

/* ------------------------------------------------------ categoria tecnica */

export const technicalFields = (goodsOptions) => [
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true },
    { key: 'idCategory', label: 'Categoria merceologica', type: 'select', options: goodsOptions, required: true, full: true },
    visible,
];
export const technicalInitial = (r) => ({ name: r.name, slug: r.slug, idCategory: idOf(r.idCategory), isShopVisible: boolOf(r.isShopVisible) ? 1 : 0 });
export const technicalPayload = (v) => ({ name: v.name.trim(), slug: v.slug.trim(), idCategory: ref(v.idCategory), isShopVisible: v.isShopVisible ? 1 : 0 });

/* ---------------------------------------------------------------- tipologia */

export const typeFields = (technicalOptions) => [
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true },
    { key: 'idTechnicalCategory', label: 'Categoria tecnica', type: 'select', options: technicalOptions, required: true, full: true },
    { key: 'description', label: 'Descrizione', type: 'textarea', help: 'Compare sulla card della home quando la tipologia è attiva' },
    { key: 'image', label: 'Immagine', type: 'image', entity: 'item_technical_type' },
    visible,
];
export const typeInitial = (r) => ({ name: r.name, slug: r.slug, idTechnicalCategory: idOf(r.idTechnicalCategory), description: r.description || '', image: r.image || null, isShopVisible: boolOf(r.isShopVisible) ? 1 : 0 });
export const typePayload = (v) => ({ name: v.name.trim(), slug: v.slug.trim(), idTechnicalCategory: ref(v.idTechnicalCategory), description: v.description || '', image: fileRef(v.image), isShopVisible: v.isShopVisible ? 1 : 0 });

/* -------------------------------------------------------------------- marchio */

export const brandFields = [
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'slug', label: 'Slug', type: 'slug', from: 'name', required: true },
    { key: 'logo', label: 'Logo', type: 'image', entity: 'brand', full: true },
];
export const brandInitial = (r) => ({ name: r.name, slug: r.slug, logo: r.logo || null });
export const brandPayload = (v) => ({ name: v.name.trim(), slug: v.slug.trim(), logo: fileRef(v.logo) });

/* ------------------------------------------------------------------ attributo */

/**
 * scopeOptions: [{ value: 'all' | 'g:<id>' | 't:<id>', label }] — dove vale l'attributo.
 * Nei valori del modale l'ambito è un solo campo ("scope"), che il payload divide in
 * idGoodsCategory / idTechnicalCategory.
 */
export const attributeFields = (scopeOptions) => [
    { key: 'label', label: 'Etichetta', type: 'text', required: true },
    { key: 'code', label: 'Codice', type: 'code', from: 'label', required: true, help: 'Identificativo interno, unico' },
    { key: 'dataType', label: 'Tipo di valore', type: 'select', options: DATA_TYPES, required: true },
    { key: 'unit', label: 'Unità di misura', type: 'text', help: 'Es. t, mm, kW (solo per i numeri)' },
    { key: 'scope', label: 'Vale per', type: 'select', options: scopeOptions, required: true, full: true },
    { key: 'isFilterable', label: 'Filtro nel catalogo', type: 'switch' },
    { key: 'isShopVisible', label: 'Visibile nella scheda', type: 'switch' },
];

export const scopeOf = (r) => {
    const t = idOf(r.idTechnicalCategory);
    const g = idOf(r.idGoodsCategory);
    return t ? 't:' + t : g ? 'g:' + g : 'all';
};

/** Divide l'ambito nei due campi; per una categoria tecnica serve anche la sua merceologica */
export function scopeFields(scope, technicals) {
    if (!scope || scope === 'all') return { idGoodsCategory: '', idTechnicalCategory: '' };
    const [kind, id] = scope.split(':');
    if (kind === 'g') return { idGoodsCategory: ref(id), idTechnicalCategory: '' };
    const tech = technicals.find((t) => String(t.id) === id);
    return { idGoodsCategory: ref(idOf(tech?.idCategory)), idTechnicalCategory: ref(id) };
}

export const attributeInitial = (r) => ({
    label: r.label, code: r.code, dataType: optOf(r.dataType), unit: r.unit || '', scope: scopeOf(r),
    isFilterable: boolOf(r.isFilterable) ? 1 : 0, isShopVisible: boolOf(r.isShopVisible) ? 1 : 0,
});
export const attributePayload = (v, technicals) => ({
    label: v.label.trim(), code: v.code.trim(), dataType: opt(v.dataType), unit: (v.unit || '').trim(),
    ...scopeFields(v.scope, technicals),
    isFilterable: v.isFilterable ? 1 : 0, isShopVisible: v.isShopVisible ? 1 : 0,
});

/* ------------------------------------------------- valore di un attributo */

export const optionFields = [
    { key: 'label', label: 'Etichetta', type: 'text', required: true },
    { key: 'value', label: 'Valore', type: 'slug', from: 'label', required: true, help: 'Valore interno; di solito uguale all\'etichetta' },
];
export const optionInitial = (r) => ({ label: r.label, value: r.value });
export const optionPayload = (v, idAttributeDefinition) => ({ label: v.label.trim(), value: v.value.trim(), idAttributeDefinition: Number(idAttributeDefinition) });
