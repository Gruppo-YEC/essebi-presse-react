/*
 * Editor articolo del catalogo, tutto in una pagina: /page/CatalogoArticolo?id=<id>
 * (senza id: nuovo articolo).
 * - In alto: ricerca di un articolo per SKU, codice o descrizione, "Nuovo", "Salva".
 * - Dati principali, classificazione a cascata (scegliendo la tipologia si compilano da sole
 *   categoria tecnica e merceologica), marchio. Accanto a ogni scelta: "+" crea una nuova
 *   voce in un modale, la matita modifica quella scelta.
 * - Dati tecnici: solo gli attributi che valgono per la categoria scelta, col campo adatto
 *   al tipo (numero, sì/no, testo, elenco). Per gli elenchi "+" aggiunge un valore nuovo.
 * - Foto: trascina i file dal computer per caricarli, trascina le miniature per ordinarle;
 *   la prima è la copertina.
 * Un solo salvataggio scrive articolo, dati tecnici e foto (campi deep del gestionale).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { SwitchField } from '../../../components/ui/switch';
import { Combobox } from '../../../components/ui/combobox';
import { Spinner } from '../../../components/ui/spinner';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';
import { DataManager } from '../../../core/data-manager';
import {
    boolOf, dragProps, dropProps, fileRef, fileUrl, idOf, listAll, moveInList, nextSort, opt, optOf, ref, sameId, saveRow, slugify, uploadImage,
} from '../../catalog/shared';
import { EntityDialog, IconButton } from '../../catalog/components';
import {
    attributeFields, attributeInitial, attributePayload, brandFields, brandInitial, brandPayload, dataTypeLabel, goodsFields, goodsInitial, goodsPayload,
    optionFields, optionPayload, scopeOf, technicalFields, technicalInitial, technicalPayload, typeFields, typeInitial, typePayload,
} from '../../catalog/forms';
import './style.css';

const CONDITIONS = [{ value: 'usato', label: 'Usato' }, { value: 'nuovo', label: 'Nuovo' }];
const MARKED = [{ value: 'forSell', label: 'In vendita' }, { value: 'sold', label: 'Venduto' }];
const STATUS = [{ value: 'draft', label: 'Bozza' }, { value: 'publish', label: 'Pubblicato' }];
const YES_NO = [{ value: '1', label: 'Sì' }, { value: '0', label: 'No' }];

const EMPTY = {
    sku: '', slug: '', code: '', description: '', notes: '', idBrand: null, year: '',
    itemCondition: 'usato', marked: 'forSell', publishStatus: 'draft', isFeatured: 0, readyToShip: 0,
    idGoodsCategory: null, idTechnicalCategory: null, idTechnicalType: null,
};

/** Valore di un attributo letto da una riga item_model_attribute, nel formato del form */
function attributeValue(row, dataType) {
    if (dataType === 'number') return row.valueNumber === null || row.valueNumber === undefined ? '' : String(Number(row.valueNumber));
    if (dataType === 'boolean') return row.valueBoolean === null || row.valueBoolean === undefined ? null : String(Number(row.valueBoolean));
    if (dataType === 'enum') return idOf(row.idAttributeOption);
    return row.valueText || '';
}
const hasValue = (v) => v !== null && v !== undefined && String(v).trim() !== '';

/** Segmenti a scelta singola (condizione, stato…) */
function Segmented({ options, value, onChange }) {
    return (
        <div className='inline-flex rounded-md border bg-muted/40 p-0.5'>
            {options.map((o) => (
                <button
                    key={o.value}
                    type='button'
                    onClick={() => onChange(o.value)}
                    className={'rounded px-3 py-1 text-sm ' + (value === o.value ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground')}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** Scelta da elenco con "+" (nuova voce) e matita (modifica la voce scelta) accanto */
function PickWithActions({ label, options, value, onChange, onAdd, onEdit, placeholder, disabled, addTitle }) {
    return (
        <div className='flex flex-col gap-2'>
            <Label>{label}</Label>
            <div className='flex gap-1'>
                <div className='min-w-0 flex-1'>
                    <Combobox options={options} value={value} clearable disabled={disabled} placeholder={placeholder} onChange={(o) => onChange(o ? o.value : null)} />
                </div>
                {onEdit && value && <IconButton icon='pen-to-square' title='Modifica la voce scelta' onClick={onEdit} className='size-9' />}
                {onAdd && <IconButton icon='plus' title={addTitle || 'Aggiungi una voce'} onClick={onAdd} className='size-9' />}
            </div>
        </div>
    );
}

export default function CatalogoArticolo() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const itemId = params.get('id') || null;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refs, setRefs] = useState({ goods: [], technicals: [], types: [], brands: [], definitions: [], options: [] });
    const [form, setForm] = useState(EMPTY);
    const [saved, setSaved] = useState(null); // ultimo stato salvato, per "modifiche non salvate"
    const [slugTouched, setSlugTouched] = useState(false);
    const [attrs, setAttrs] = useState({}); // idDefinizione → { rowId, value }
    const [photos, setPhotos] = useState([]); // [{ key, id?, photo, title }]
    const [uploading, setUploading] = useState(0);
    const [dropOver, setDropOver] = useState(false);
    const [over, setOver] = useState(null);
    const [dialog, setDialog] = useState(null);
    const [search, setSearch] = useState({ query: '', options: [], loading: false });
    const fileInput = useRef(null);
    const photoKey = useRef(0);

    /* ------------------------------------------------------------ dati */

    async function loadRefs() {
        const [goods, technicals, types, brands, definitions, options] = await Promise.all([
            listAll('item_goods_category'), listAll('item_technical_category'), listAll('item_technical_type'),
            listAll('brand', { order: { field: 'name', order: 'ASC' } }), listAll('item_attribute_definition'), listAll('item_attribute_option'),
        ]);
        setRefs({ goods, technicals, types, brands, definitions, options });
        return { definitions };
    }

    async function loadItem(id, definitions) {
        if (!id) {
            setForm(EMPTY); setSaved(JSON.stringify({ f: EMPTY, a: {}, p: [] })); setAttrs({}); setPhotos([]); setSlugTouched(false);
            return;
        }
        const response = await DataManager.getItem('item_model', id);
        // get_item restituisce la riga dentro un array
        const r = response && response.success === 1 ? (Array.isArray(response.body) ? response.body[0] : response.body) : null;
        if (!r) {
            toast.error('Articolo non trovato');
            setParams({});
            return;
        }
        const f = {
            sku: r.sku || '', slug: r.slug || '', code: r.code || '', description: r.description || '', notes: r.notes || '',
            idBrand: idOf(r.idBrand), year: r.year ? String(r.year) : '',
            itemCondition: optOf(r.itemCondition) || 'usato', marked: optOf(r.marked) || 'forSell', publishStatus: optOf(r.publishStatus) || 'draft',
            isFeatured: boolOf(r.isFeatured) ? 1 : 0, readyToShip: boolOf(r.readyToShip) ? 1 : 0,
            idGoodsCategory: idOf(r.idGoodsCategory), idTechnicalCategory: idOf(r.idTechnicalCategory), idTechnicalType: idOf(r.idTechnicalType),
        };
        const a = {};
        (r.attributes || []).forEach((row) => {
            const defId = idOf(row.idAttributeDefinition);
            const def = definitions.find((d) => sameId(d.id, defId));
            const entry = { rowId: row.id, value: attributeValue(row, def ? optOf(def.dataType) : 'text') };
            // Numero con intervallo: "da" è value, "a" è valueMax (valueNumberMax)
            if (row.valueNumberMax !== null && row.valueNumberMax !== undefined && row.valueNumberMax !== '') {
                entry.range = true;
                entry.hadRange = true;
                entry.valueMax = String(Number(row.valueNumberMax));
            }
            a[defId] = entry;
        });
        const p = (r.photos || [])
            .slice()
            .sort((x, y) => (Number(x.sortOrder) || 0) - (Number(y.sortOrder) || 0))
            .map((row) => ({ key: 'p' + photoKey.current++, id: row.id, photo: row.photo, title: row.title || '' }));
        setForm(f); setAttrs(a); setPhotos(p); setSlugTouched(true);
        setSaved(JSON.stringify({ f, a, p: p.map((x) => [x.id, x.photo?.hash, x.title]) }));
    }

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const { definitions } = await loadRefs();
                await loadItem(itemId, definitions);
            } catch (e) {
                toast.error(e.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [itemId]); // eslint-disable-line react-hooks/exhaustive-deps

    const dirty = saved !== null && saved !== JSON.stringify({ f: form, a: attrs, p: photos.map((x) => [x.id, x.photo?.hash, x.title]) });

    // Avviso del browser se si chiude la pagina con modifiche non salvate
    useEffect(() => {
        if (!dirty) return;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    /* ------------------------------------------------------ form principale */

    const brandName = (id) => refs.brands.find((b) => sameId(b.id, id))?.name || '';

    function set(key, value) {
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            // Slug automatico (marchio + codice, altrimenti SKU) finché non lo si tocca a mano
            if (!slugTouched && ['sku', 'code', 'idBrand'].includes(key)) {
                const base = next.code ? `${brandName(next.idBrand)} ${next.code}` : next.sku;
                next.slug = slugify(base);
            }
            return next;
        });
    }

    // Classificazione: scegliendo un livello si compilano i genitori e si svuotano i figli incoerenti
    function setGoods(id) {
        setForm((prev) => {
            const tech = refs.technicals.find((t) => sameId(t.id, prev.idTechnicalCategory));
            const keep = id && tech && sameId(idOf(tech.idCategory), id);
            return { ...prev, idGoodsCategory: id, idTechnicalCategory: keep ? prev.idTechnicalCategory : null, idTechnicalType: keep ? prev.idTechnicalType : null };
        });
    }
    function setTechnical(id) {
        setForm((prev) => {
            const tech = refs.technicals.find((t) => sameId(t.id, id));
            const type = refs.types.find((t) => sameId(t.id, prev.idTechnicalType));
            const keep = id && type && sameId(idOf(type.idTechnicalCategory), id);
            return { ...prev, idTechnicalCategory: id, idGoodsCategory: tech ? idOf(tech.idCategory) ?? prev.idGoodsCategory : prev.idGoodsCategory, idTechnicalType: keep ? prev.idTechnicalType : null };
        });
    }
    function setType(id) {
        setForm((prev) => {
            const type = refs.types.find((t) => sameId(t.id, id));
            const tech = type && refs.technicals.find((t) => sameId(t.id, idOf(type.idTechnicalCategory)));
            return {
                ...prev, idTechnicalType: id,
                idTechnicalCategory: tech ? tech.id : prev.idTechnicalCategory,
                idGoodsCategory: tech && idOf(tech.idCategory) ? idOf(tech.idCategory) : prev.idGoodsCategory,
            };
        });
    }

    const goodsOptions = refs.goods.map((g) => ({ value: g.id, label: g.name }));
    const technicalOptions = refs.technicals
        .filter((t) => !form.idGoodsCategory || sameId(idOf(t.idCategory), form.idGoodsCategory))
        .map((t) => ({ value: t.id, label: t.name }));
    const allTechnicalOptions = refs.technicals.map((t) => {
        const g = refs.goods.find((x) => sameId(x.id, idOf(t.idCategory)));
        return { value: t.id, label: (g ? g.name + ' › ' : '') + t.name };
    });
    const typeOptions = refs.types
        .filter((t) => {
            if (form.idTechnicalCategory) return sameId(idOf(t.idTechnicalCategory), form.idTechnicalCategory);
            if (form.idGoodsCategory) return technicalOptions.some((o) => sameId(o.value, idOf(t.idTechnicalCategory)));
            return true;
        })
        .map((t) => {
            const tech = refs.technicals.find((x) => sameId(x.id, idOf(t.idTechnicalCategory)));
            return { value: t.id, label: form.idTechnicalCategory || !tech ? t.name : `${tech.name} › ${t.name}` };
        });
    const brandOptions = refs.brands.map((b) => ({ value: b.id, label: b.name }));

    /* ------------------------------------------------------------ dati tecnici */

    const scopeOptions = useMemo(() => [
        { value: 'all', label: 'Tutte le categorie' },
        ...refs.goods.map((g) => ({ value: 'g:' + g.id, label: g.name })),
        ...refs.technicals.map((t) => {
            const g = refs.goods.find((x) => sameId(x.id, idOf(t.idCategory)));
            return { value: 't:' + t.id, label: (g ? g.name + ' › ' : '') + t.name };
        }),
    ], [refs.goods, refs.technicals]);

    // Attributi che valgono per la classificazione scelta, a gruppi
    const applies = (d) => {
        const s = scopeOf(d);
        return s === 'all' || (form.idGoodsCategory && s === 'g:' + form.idGoodsCategory) || (form.idTechnicalCategory && s === 't:' + form.idTechnicalCategory);
    };
    const applicable = refs.definitions.filter(applies);
    const groups = [
        { key: 'all', label: 'Comuni', rows: applicable.filter((d) => scopeOf(d) === 'all') },
        { key: 'g', label: refs.goods.find((g) => sameId(g.id, form.idGoodsCategory))?.name, rows: applicable.filter((d) => scopeOf(d).startsWith('g:')) },
        { key: 't', label: refs.technicals.find((t) => sameId(t.id, form.idTechnicalCategory))?.name, rows: applicable.filter((d) => scopeOf(d).startsWith('t:')) },
    ].filter((g) => g.rows.length);
    // Valori già inseriti su attributi che con la classificazione attuale non valgono più
    const orphanAttrs = Object.entries(attrs)
        .filter(([defId, a]) => hasValue(a.value) && !applicable.some((d) => sameId(d.id, defId)))
        .map(([defId]) => refs.definitions.find((d) => sameId(d.id, defId))?.label || 'Attributo ' + defId);

    const setAttr = (defId, value) => setAttrs((prev) => ({ ...prev, [defId]: { ...(prev[defId] || {}), value } }));
    const optionsOf = (defId) => refs.options.filter((o) => sameId(o.idAttributeDefinition, defId)).map((o) => ({ value: o.id, label: o.label }));

    function AttributeInput({ def }) {
        const type = optOf(def.dataType);
        const value = attrs[def.id]?.value ?? (type === 'boolean' || type === 'enum' ? null : '');
        if (type === 'number') {
            const unit = def.unit && <span className='shrink-0 text-sm text-muted-foreground'>{def.unit}</span>;
            const range = boolOf(def.allowRange) && !!attrs[def.id]?.range;
            const single = (
                <div className='flex items-center gap-2'>
                    <Input type='number' step='any' value={value} onChange={(e) => setAttr(def.id, e.target.value)} />
                    {unit}
                </div>
            );
            if (!boolOf(def.allowRange)) return single;
            // Attributo che ammette un intervallo (es. forza di chiusura): valore solo oppure da X a Y
            return (
                <div className='flex flex-col gap-2'>
                    <Segmented
                        options={[{ value: 'single', label: 'Valore' }, { value: 'range', label: 'Intervallo' }]}
                        value={range ? 'range' : 'single'}
                        onChange={(v) => setAttrs((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] || { value: '' }), range: v === 'range' } }))}
                    />
                    {range ? (
                        <div className='flex items-center gap-2'>
                            <span className='shrink-0 text-sm text-muted-foreground'>da</span>
                            <Input type='number' step='any' value={value} aria-label={`${def.label} da`} onChange={(e) => setAttr(def.id, e.target.value)} />
                            <span className='shrink-0 text-sm text-muted-foreground'>a</span>
                            <Input
                                type='number' step='any' value={attrs[def.id]?.valueMax ?? ''} aria-label={`${def.label} a`}
                                onChange={(e) => setAttrs((prev) => ({ ...prev, [def.id]: { ...(prev[def.id] || { value: '' }), valueMax: e.target.value } }))}
                            />
                            {unit}
                        </div>
                    ) : single}
                </div>
            );
        }
        if (type === 'boolean') {
            return <Combobox options={YES_NO} value={value} clearable placeholder='—' onChange={(o) => setAttr(def.id, o ? o.value : null)} />;
        }
        if (type === 'enum') {
            return (
                <div className='flex gap-1'>
                    <div className='min-w-0 flex-1'>
                        <Combobox options={optionsOf(def.id)} value={value} clearable placeholder='—' onChange={(o) => setAttr(def.id, o ? o.value : null)} />
                    </div>
                    <IconButton icon='plus' title='Nuovo valore' className='size-9' onClick={() => setDialog({ kind: 'option', def })} />
                </div>
            );
        }
        return <Input value={value} onChange={(e) => setAttr(def.id, e.target.value)} />;
    }

    /* ------------------------------------------------------------------ foto */

    async function addFiles(files) {
        const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
        if (!list.length) return;
        setUploading((n) => n + list.length);
        for (const file of list) {
            const uploaded = await uploadImage(file, 'item_model_photo');
            setUploading((n) => n - 1);
            if (uploaded) setPhotos((prev) => [...prev, { key: 'p' + photoKey.current++, photo: uploaded, title: '' }]);
        }
    }

    /* ------------------------------------------------------------- salvataggio */

    async function save() {
        if (!form.sku.trim() || !form.slug.trim()) {
            toast.error('SKU e slug sono obbligatori');
            return;
        }
        // Intervalli: servono "da" e "a", con "a" non minore di "da"
        const badRange = applicable.find((d) => {
            const a = attrs[d.id];
            if (optOf(d.dataType) !== 'number' || !boolOf(d.allowRange) || !a?.range) return false;
            const hasMin = hasValue(a.value);
            const hasMax = hasValue(a.valueMax);
            if (!hasMin && !hasMax) return false;
            return !hasMin || !hasMax || Number(a.valueMax) < Number(a.value);
        });
        if (badRange) {
            toast.error(`${badRange.label}: completa l'intervallo (da… a…) con "a" non minore di "da", oppure scegli "Valore"`);
            return;
        }
        const attributes = applicable
            .filter((d) => hasValue(attrs[d.id]?.value))
            .map((d) => {
                const type = optOf(d.dataType);
                const a = attrs[d.id];
                const row = { idAttributeDefinition: ref(d.id) };
                const isRange = type === 'number' && boolOf(d.allowRange) && a.range && hasValue(a.valueMax) && Number(a.valueMax) !== Number(a.value);
                // Una riga che era un intervallo e torna valore solo si ricrea (senza id): così
                // valueNumberMax non resta quello vecchio
                if (a.rowId && (isRange || !a.hadRange)) row.id = a.rowId;
                if (type === 'number') {
                    row.valueNumber = Number(a.value);
                    if (isRange) row.valueNumberMax = Number(a.valueMax);
                }
                else if (type === 'boolean') row.valueBoolean = Number(a.value);
                else if (type === 'enum') row.idAttributeOption = ref(a.value);
                else row.valueText = String(a.value).trim();
                return row;
            });
        const data = {
            sku: form.sku.trim(), slug: form.slug.trim(), code: form.code.trim(), description: form.description, notes: form.notes,
            idBrand: ref(form.idBrand), year: form.year === '' ? null : Number(form.year),
            itemCondition: opt(form.itemCondition), marked: opt(form.marked), publishStatus: opt(form.publishStatus), isFeatured: form.isFeatured ? 1 : 0, readyToShip: form.readyToShip ? 1 : 0,
            idGoodsCategory: ref(form.idGoodsCategory), idTechnicalCategory: ref(form.idTechnicalCategory), idTechnicalType: ref(form.idTechnicalType),
            attributes,
            photos: photos.map((p, i) => ({ ...(p.id ? { id: p.id } : {}), photo: fileRef(p.photo), title: p.title || '', sortOrder: (i + 1) * 10 })),
        };
        setSaving(true);
        const id = await saveRow('item_model', data, itemId);
        setSaving(false);
        if (!id) return;
        toast.success('Articolo salvato');
        if (!itemId) setParams({ id: String(id) });
        else {
            setLoading(true);
            const { definitions } = await loadRefs();
            await loadItem(itemId, definitions);
            setLoading(false);
        }
    }

    /* --------------------------------------------------- ricerca articolo */

    useEffect(() => {
        let alive = true;
        const t = setTimeout(async () => {
            setSearch((s) => ({ ...s, loading: true }));
            const response = await DataManager.searchItems('item_model', 1, 20, { field: 'id', order: 'DESC' }, search.query, ['sku', 'code', 'description'], []);
            if (!alive) return;
            const rows = response && response.success === 1 ? response.body || [] : [];
            setSearch((s) => ({
                ...s, loading: false,
                options: rows.map((r) => ({ value: r.id, label: [r.sku, r.idBrand?.name, r.code].filter(Boolean).join(' · ') })),
            }));
        }, 250);
        return () => { alive = false; clearTimeout(t); };
    }, [search.query]);

    function goTo(id) {
        if (dirty && !window.confirm('Ci sono modifiche non salvate. Vuoi lasciarle?')) return;
        setParams(id ? { id: String(id) } : {});
    }

    /* ------------------------------------------------------------- modali */

    async function reloadRefs() { await loadRefs(); }

    const dialogs = {
        goods: { title: 'categoria merceologica', entity: 'item_goods_category', fields: goodsFields, initial: goodsInitial, payload: goodsPayload, pick: setGoods },
        technical: {
            title: 'categoria tecnica', entity: 'item_technical_category', fields: technicalFields(goodsOptions), initial: technicalInitial, payload: technicalPayload, pick: setTechnical,
            fresh: () => ({ idCategory: form.idGoodsCategory, isShopVisible: 1 }),
        },
        type: {
            title: 'tipologia', entity: 'item_technical_type', fields: typeFields(allTechnicalOptions), initial: typeInitial, payload: typePayload, pick: setType,
            fresh: () => ({ idTechnicalCategory: form.idTechnicalCategory, isShopVisible: 1 }),
        },
        brand: { title: 'marchio', entity: 'brand', fields: brandFields, initial: brandInitial, payload: brandPayload, pick: (id) => set('idBrand', id) },
    };
    const findRow = (kind, id) => ({ goods: refs.goods, technical: refs.technicals, type: refs.types, brand: refs.brands }[kind]).find((r) => sameId(r.id, id));

    if (loading) return <div className='flex justify-center py-10'><Spinner /></div>;

    const title = itemId ? [brandName(form.idBrand), form.code || form.sku].filter(Boolean).join(' ') : 'Nuovo articolo';

    return (
        <div className='catalogo-articolo'>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                    <h3 className='mb-0'>{title}</h3>
                    {itemId && <Badge variant={form.publishStatus === 'publish' ? 'success' : 'secondary'}>{form.publishStatus === 'publish' ? 'Pubblicato' : 'Bozza'}</Badge>}
                    {dirty && <span className='text-xs text-warning-foreground'>Modifiche non salvate</span>}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <div className='w-72'>
                        <Combobox
                            size='sm'
                            options={search.options}
                            value={null}
                            loading={search.loading}
                            placeholder='Apri un articolo…'
                            searchPlaceholder='SKU, codice o descrizione'
                            onSearchChange={(q) => setSearch((s) => ({ ...s, query: q }))}
                            onChange={(o) => o && goTo(o.value)}
                        />
                    </div>
                    <Button size='sm' variant='outline-secondary' onClick={() => navigate('/entity/item_model')}>
                        <Icon name='list' className='me-2' />Elenco
                    </Button>
                    <Button size='sm' variant='outline-primary' onClick={() => goTo(null)}>
                        <Icon name='plus' className='me-2' />Nuovo
                    </Button>
                    <Button size='sm' disabled={saving || uploading > 0 || (!dirty && !!itemId)} onClick={save}>
                        <Icon name={saving ? 'spinner' : 'floppy-disk'} spin={saving} className='me-2' />Salva
                    </Button>
                </div>
            </div>

            <div className='grid gap-3 xl:grid-cols-[1fr_24rem]'>
                <div className='flex min-w-0 flex-col gap-3'>
                    {/* Dati principali */}
                    <Card>
                        <CardBody className='grid gap-4 sm:grid-cols-2 2xl:grid-cols-4'>
                            <p className='mb-0 text-sm font-medium sm:col-span-2 2xl:col-span-4'>Dati principali</p>
                            <div className='flex flex-col gap-2'>
                                <Label>SKU *</Label>
                                <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} />
                            </div>
                            <div className='flex flex-col gap-2'>
                                <Label>Modello / codice</Label>
                                <Input value={form.code} placeholder='Es. VE 160-720' onChange={(e) => set('code', e.target.value)} />
                            </div>
                            <PickWithActions
                                label='Marchio' options={brandOptions} value={form.idBrand} onChange={(v) => set('idBrand', v)} placeholder='Scegli il marchio'
                                onAdd={() => setDialog({ kind: 'brand' })} onEdit={() => setDialog({ kind: 'brand', row: findRow('brand', form.idBrand) })} addTitle='Nuovo marchio'
                            />
                            <div className='flex flex-col gap-2'>
                                <Label>Anno</Label>
                                <Input type='number' value={form.year} placeholder='Es. 2014' onChange={(e) => set('year', e.target.value)} />
                            </div>
                            <div className='flex flex-col gap-2 sm:col-span-2'>
                                <Label>Slug *</Label>
                                <Input className='font-mono text-xs' value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
                                <p className='mb-0 text-xs text-muted-foreground'>Indirizzo della scheda sul sito: /prodotti/{form.slug || '…'}</p>
                            </div>
                            <div className='flex flex-col gap-2 sm:col-span-2'>
                                <Label>Condizione</Label>
                                <div><Segmented options={CONDITIONS} value={form.itemCondition} onChange={(v) => set('itemCondition', v)} /></div>
                            </div>
                            <div className='flex flex-col gap-2 sm:col-span-2 2xl:col-span-4'>
                                <Label>Descrizione</Label>
                                <Textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
                            </div>
                        </CardBody>
                    </Card>

                    {/* Classificazione */}
                    <Card>
                        <CardBody className='grid gap-4 sm:grid-cols-2 2xl:grid-cols-3'>
                            <div className='sm:col-span-2 2xl:col-span-3'>
                                <p className='mb-0 text-sm font-medium'>Classificazione</p>
                                <p className='mb-0 text-xs text-muted-foreground'>Scegliendo la tipologia si compilano da sole categoria tecnica e merceologica.</p>
                            </div>
                            <PickWithActions
                                label='Categoria merceologica' options={goodsOptions} value={form.idGoodsCategory} onChange={setGoods} placeholder='—'
                                onAdd={() => setDialog({ kind: 'goods' })} onEdit={() => setDialog({ kind: 'goods', row: findRow('goods', form.idGoodsCategory) })}
                            />
                            <PickWithActions
                                label='Categoria tecnica' options={technicalOptions} value={form.idTechnicalCategory} onChange={setTechnical} placeholder='—'
                                onAdd={() => setDialog({ kind: 'technical' })} onEdit={() => setDialog({ kind: 'technical', row: findRow('technical', form.idTechnicalCategory) })}
                            />
                            <PickWithActions
                                label='Tipologia' options={typeOptions} value={form.idTechnicalType} onChange={setType} placeholder='—'
                                onAdd={() => setDialog({ kind: 'type' })} onEdit={() => setDialog({ kind: 'type', row: findRow('type', form.idTechnicalType) })}
                            />
                        </CardBody>
                    </Card>

                    {/* Dati tecnici */}
                    <Card>
                        <CardBody className='flex flex-col gap-4'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                                <div>
                                    <p className='mb-0 text-sm font-medium'>Dati tecnici</p>
                                    <p className='mb-0 text-xs text-muted-foreground'>Solo gli attributi che valgono per la classificazione scelta.</p>
                                </div>
                                <div className='flex gap-2'>
                                    <Button size='sm' variant='outline-secondary' onClick={() => navigate('/page/CatalogoAttributi')}>
                                        <Icon name='sliders' className='me-2' />Gestisci attributi
                                    </Button>
                                    <Button size='sm' variant='outline-primary' onClick={() => setDialog({ kind: 'attribute' })}>
                                        <Icon name='plus' className='me-2' />Nuovo attributo
                                    </Button>
                                </div>
                            </div>
                            {orphanAttrs.length > 0 && (
                                <p className='mb-0 rounded-md bg-warning/15 px-3 py-2 text-xs'>
                                    Con questa classificazione non valgono più: {orphanAttrs.join(', ')}. Al salvataggio questi valori verranno tolti.
                                </p>
                            )}
                            {groups.length === 0 && <p className='mb-0 text-xs text-muted-foreground'>Nessun attributo: scegli una categoria o creane uno.</p>}
                            {groups.map((g) => (
                                <div key={g.key} className='flex flex-col gap-3'>
                                    <p className='mb-0 text-xs font-medium tracking-wide text-muted-foreground uppercase'>{g.label}</p>
                                    <div className='grid gap-3 sm:grid-cols-2 2xl:grid-cols-3'>
                                        {g.rows.map((d) => (
                                            <div key={d.id} className='flex flex-col gap-2'>
                                                <div className='flex items-center justify-between gap-1'>
                                                    <Label className='truncate'>{d.label}</Label>
                                                    <span className='flex items-center gap-1'>
                                                        <span className='text-[10px] text-muted-foreground'>{dataTypeLabel(optOf(d.dataType))}</span>
                                                        <IconButton icon='pen-to-square' title='Modifica attributo' className='size-6' onClick={() => setDialog({ kind: 'attribute', row: d })} />
                                                    </span>
                                                </div>
                                                {AttributeInput({ def: d })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </CardBody>
                    </Card>
                </div>

                <div className='flex min-w-0 flex-col gap-3'>
                    {/* Pubblicazione */}
                    <Card>
                        <CardBody className='flex flex-col gap-4'>
                            <p className='mb-0 text-sm font-medium'>Pubblicazione</p>
                            <div className='flex flex-col gap-2'>
                                <Label>Stato</Label>
                                <div><Segmented options={STATUS} value={form.publishStatus} onChange={(v) => set('publishStatus', v)} /></div>
                            </div>
                            <div className='flex flex-col gap-2'>
                                <Label>Disponibilità</Label>
                                <div><Segmented options={MARKED} value={form.marked} onChange={(v) => set('marked', v)} /></div>
                            </div>
                            <SwitchField id='a-featured' label='In evidenza in home' checked={!!form.isFeatured} onCheckedChange={(v) => set('isFeatured', v ? 1 : 0)} />
                            {/* Etichetta "Pronta consegna" sulle card e nella scheda del sito */}
                            <SwitchField id='a-ready' label='Pronta consegna' checked={!!form.readyToShip} onCheckedChange={(v) => set('readyToShip', v ? 1 : 0)} />
                            {itemId && form.publishStatus === 'publish' && (
                                <a className='text-xs text-primary hover:underline' href={`https://www.essebipresse.it/prodotti/${form.slug}`} target='_blank' rel='noreferrer'>
                                    <Icon name='arrow-up-right-from-square' className='me-1' />Apri la scheda sul sito
                                </a>
                            )}
                        </CardBody>
                    </Card>

                    {/* Foto */}
                    <Card>
                        <CardBody className='flex flex-col gap-3'>
                            <div>
                                <p className='mb-0 text-sm font-medium'>Foto</p>
                                <p className='mb-0 text-xs text-muted-foreground'>Trascina le foto per ordinarle: la prima è la copertina.</p>
                            </div>
                            <div className='grid grid-cols-2 gap-2'>
                                {photos.map((p, i) => {
                                    const key = 'photo:' + p.key;
                                    return (
                                        <div
                                            key={p.key}
                                            {...dragProps('photo', { ...p, id: p.key })}
                                            {...dropProps({
                                                accept: ['photo'], setOver, overKey: key,
                                                onDrop: ({ item }) => setPhotos((prev) => moveInList(prev.map((x) => ({ ...x, id: x.key })), item, { id: p.key }).map((x) => ({ ...x, id: prev.find((y) => y.key === x.key).id }))),
                                            })}
                                            className={'group relative overflow-hidden rounded-md border bg-muted/40 ' + (over === key ? 'ring-2 ring-primary' : '')}
                                        >
                                            <img src={fileUrl(p.photo, 'item_model_photo')} alt='' className='aspect-[4/3] w-full cursor-grab object-cover' />
                                            {i === 0 && <Badge variant='primary' className='absolute top-1.5 left-1.5'>Copertina</Badge>}
                                            <button
                                                type='button'
                                                title='Rimuovi foto'
                                                onClick={() => setPhotos((prev) => prev.filter((x) => x.key !== p.key))}
                                                className='absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-md bg-background/90 text-danger opacity-0 shadow-xs transition-opacity group-hover:opacity-100'
                                            >
                                                <Icon name='trash' />
                                            </button>
                                            <input
                                                value={p.title}
                                                placeholder='Didascalia'
                                                onChange={(e) => setPhotos((prev) => prev.map((x) => (x.key === p.key ? { ...x, title: e.target.value } : x)))}
                                                className='w-full border-t bg-background px-2 py-1 text-xs outline-none'
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <div
                                className={'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground ' + (dropOver ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent')}
                                onClick={() => fileInput.current?.click()}
                                onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropOver(true); } }}
                                onDragLeave={() => setDropOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDropOver(false); addFiles(e.dataTransfer.files); }}
                            >
                                {uploading > 0 ? (
                                    <><Spinner size='sm' />Caricamento di {uploading} {uploading === 1 ? 'foto' : 'foto'}…</>
                                ) : (
                                    <><Icon name='images' size='lg' />Trascina qui le foto o clicca per sceglierle</>
                                )}
                            </div>
                            <input ref={fileInput} type='file' accept='image/*' multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                        </CardBody>
                    </Card>

                    {/* Note interne */}
                    <Card>
                        <CardBody className='flex flex-col gap-2'>
                            <Label>Note interne</Label>
                            <Textarea rows={3} value={form.notes} placeholder='Non compaiono sul sito' onChange={(e) => set('notes', e.target.value)} />
                        </CardBody>
                    </Card>
                </div>
            </div>

            {/* Modali delle entità collegate */}
            {dialog && dialogs[dialog.kind] && (() => {
                const d = dialogs[dialog.kind];
                return (
                    <EntityDialog
                        open
                        onOpenChange={(o) => { if (!o) setDialog(null); }}
                        title={dialog.row ? `Modifica ${d.title}: ${dialog.row.name}` : `Nuova ${d.title}`.replace('Nuova marchio', 'Nuovo marchio')}
                        fields={d.fields}
                        initial={dialog.row ? d.initial(dialog.row) : (d.fresh ? d.fresh() : { isShopVisible: 1 })}
                        onSave={async (values) => {
                            const id = await saveRow(d.entity, d.payload(values), dialog.row?.id);
                            if (!id) return false;
                            await reloadRefs();
                            if (!dialog.row) d.pick(id);
                            toast.success('Salvato');
                            return true;
                        }}
                    />
                );
            })()}
            {dialog?.kind === 'attribute' && (
                <EntityDialog
                    open
                    onOpenChange={(o) => { if (!o) setDialog(null); }}
                    title={dialog.row ? `Modifica attributo: ${dialog.row.label}` : 'Nuovo attributo'}
                    fields={attributeFields(scopeOptions)}
                    initial={dialog.row ? attributeInitial(dialog.row) : {
                        dataType: 'number', isFilterable: 1, isShopVisible: 1,
                        scope: form.idTechnicalCategory ? 't:' + form.idTechnicalCategory : form.idGoodsCategory ? 'g:' + form.idGoodsCategory : 'all',
                    }}
                    onSave={async (values) => {
                        const data = attributePayload(values, refs.technicals);
                        if (!dialog.row) data.sortOrder = nextSort(refs.definitions);
                        const id = await saveRow('item_attribute_definition', data, dialog.row?.id);
                        if (!id) return false;
                        await reloadRefs();
                        toast.success('Attributo salvato');
                        return true;
                    }}
                />
            )}
            {dialog?.kind === 'option' && (
                <EntityDialog
                    open
                    onOpenChange={(o) => { if (!o) setDialog(null); }}
                    title={`Nuovo valore per ${dialog.def.label}`}
                    fields={optionFields}
                    initial={{}}
                    onSave={async (values) => {
                        const siblings = refs.options.filter((o) => sameId(o.idAttributeDefinition, dialog.def.id));
                        const id = await saveRow('item_attribute_option', { ...optionPayload(values, dialog.def.id), sortOrder: nextSort(siblings) });
                        if (!id) return false;
                        await reloadRefs();
                        setAttr(dialog.def.id, id);
                        return true;
                    }}
                />
            )}
        </div>
    );
}
