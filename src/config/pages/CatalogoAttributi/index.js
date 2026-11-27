/*
 * Gestione attributi (dati tecnici) del catalogo:
 *   1. Ambito: "Tutti", "Comuni a tutte le categorie", le categorie merceologiche e sotto
 *      le loro categorie tecniche. Trascina un attributo su una voce per cambiarne l'ambito.
 *   2. Attributi dell'ambito scelto, con il percorso a cascata nel titolo
 *      (Presse › Presse standard): trascina per riordinare, clic per modificare.
 * La modifica avviene in un dialog (titolo: Presse › Presse standard › Forza di chiusura):
 * campi principali e, per gli attributi "A scelta", i valori ammessi (aggiunta rapida,
 * trascinamento per riordinare, modifica ed eliminazione).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { SwitchField } from '../../../components/ui/switch';
import { Combobox } from '../../../components/ui/combobox';
import { Spinner } from '../../../components/ui/spinner';
import { toast } from '../../../components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../components/ui/dialog';
import Icon from '../../../components/BodyElements/Icon';
import {
    sameId, boolOf, codify, dragProps, dropProps, idOf, listAll, moveInList, nextSort, optOf, removeRow, saveOrder, saveRow, slugify,
} from '../../catalog/shared';
import { ConfirmDialog, EntityDialog, IconButton, QuickAdd } from '../../catalog/components';
import {
    DATA_TYPES, attributeInitial, attributePayload, dataTypeLabel, optionFields, optionInitial, optionPayload, scopeFields, scopeOf,
} from '../../catalog/forms';
import './style.css';

const ALL = 'any';

/** Percorso a cascata: i genitori in grigio, l'ultima voce in evidenza */
function Crumbs({ parts, last }) {
    return (
        <span className='inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5'>
            {parts.map((p, i) => (
                <React.Fragment key={i}>
                    <span className='font-normal text-muted-foreground'>{p}</span>
                    <span className='font-normal text-muted-foreground/60'>›</span>
                </React.Fragment>
            ))}
            <span className='font-semibold'>{last}</span>
        </span>
    );
}

/** Voce del pannello ambiti: selezionabile e zona di rilascio per gli attributi */
function ScopeItem({ scope, label, count, depth = 0, selected, onSelect, over, setOver, onDropAttribute, strong }) {
    const droppable = scope !== ALL;
    return (
        <button
            type='button'
            onClick={() => onSelect(scope)}
            {...(droppable ? dropProps({ accept: ['attribute'], setOver, overKey: 'scope:' + scope, onDrop: ({ item }) => onDropAttribute(item, scope) }) : {})}
            className={
                'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-start text-sm ' +
                (selected ? 'border-primary bg-primary/10 text-foreground ' : 'border-transparent hover:bg-accent ') +
                (over === 'scope:' + scope ? 'ring-2 ring-primary ' : '') +
                (strong ? 'font-semibold ' : selected ? '' : 'text-muted-foreground ')
            }
            style={{ paddingInlineStart: 8 + depth * 18 }}
        >
            {depth > 0 && <span className='text-muted-foreground/60'>└</span>}
            <span className='min-w-0 flex-1 truncate'>{label}</span>
            <Badge variant='light' pill>{count}</Badge>
        </button>
    );
}

/** Riga di un attributo: trascinabile per riordinare o per cambiare ambito; clic apre il dialog */
function AttributeRow({ row, list, onOpen, over, setOver, onReorder, path }) {
    const key = 'attr:' + row.id;
    const type = optOf(row.dataType);
    return (
        <div
            {...dragProps('attribute', row)}
            {...dropProps({ accept: ['attribute'], setOver, overKey: key, onDrop: ({ item }) => onReorder(list, item, row) })}
            onClick={() => onOpen(row.id)}
            className={'group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-2 ' + (over === key ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-accent')}
        >
            <Icon name='grip-vertical' className='cursor-grab text-muted-foreground/60' />
            <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-medium'>
                    {row.label}
                    {row.unit && <span className='ms-1 font-normal text-muted-foreground'>({row.unit})</span>}
                </span>
                {path && <span className='block truncate text-xs text-muted-foreground'>{path}</span>}
            </span>
            <Badge variant='light'>
                {dataTypeLabel(type)}
                {type === 'enum' && row._options !== undefined ? ` · ${row._options}` : ''}
                {type === 'number' && boolOf(row.allowRange) ? ' · intervallo' : ''}
            </Badge>
            {boolOf(row.isFilterable) && <Icon name='filter' title='Filtro nel catalogo' className='text-muted-foreground' />}
            {!boolOf(row.isShopVisible) && <Icon name='eye-slash' title='Nascosto nella scheda' className='text-muted-foreground' />}
            <Icon name='pen-to-square' className='text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100' />
        </div>
    );
}

/** Riga di un valore ammesso (attributo "A scelta") */
function OptionRow({ row, list, over, setOver, onReorder, onEdit, onDelete }) {
    const key = 'opt:' + row.id;
    return (
        <div
            {...dragProps('option', row)}
            {...dropProps({ accept: ['option'], setOver, overKey: key, onDrop: ({ item }) => onReorder(list, item, row) })}
            className={'flex items-center gap-2 rounded-md border px-2 py-1 text-sm ' + (over === key ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-accent')}
        >
            <Icon name='grip-vertical' className='cursor-grab text-muted-foreground/60' />
            <span className='min-w-0 flex-1 truncate'>{row.label}</span>
            {row.value !== row.label && <span className='font-mono text-xs text-muted-foreground'>{row.value}</span>}
            <IconButton icon='pen-to-square' title='Modifica valore' onClick={() => onEdit(row)} />
            <IconButton icon='trash' title='Elimina valore' danger onClick={() => onDelete(row)} />
        </div>
    );
}

/**
 * Dialog di un attributo: crea (attr null) o modifica. Dopo la creazione resta aperto
 * sull'attributo nuovo, così si possono aggiungere subito i valori ammessi.
 */
function AttributeDialog({ attr, initialScope, attributes, options, technicals, scopeOptions, pathOf, onClose, reload, onCreated }) {
    const isNew = !attr;
    const blank = { label: '', code: '', dataType: 'number', unit: '', allowRange: 0, scope: initialScope, isFilterable: 1, isShopVisible: 1 };
    const [draft, setDraft] = useState(attr ? attributeInitial(attr) : blank);
    const [codeTouched, setCodeTouched] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [over, setOver] = useState(null);
    const [optionDialog, setOptionDialog] = useState(null);
    const [confirm, setConfirm] = useState(null);

    // Dopo un salvataggio si riparte dal dato aggiornato
    useEffect(() => { if (attr) setDraft(attributeInitial(attr)); }, [attr]);

    const attrOptions = attr ? options.filter((o) => sameId(o.idAttributeDefinition, attr.id)) : [];
    const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(attributeInitial(attr));
    const valid = draft.label.trim() && draft.code.trim() && draft.scope;
    const set = (patch) => setDraft((d) => {
        const next = { ...d, ...patch };
        if ('label' in patch && !codeTouched) next.code = codify(patch.label);
        return next;
    });

    async function save() {
        setSaving(true);
        const data = attributePayload(draft, technicals);
        if (isNew) data.sortOrder = nextSort(attributes.filter((a) => scopeOf(a) === draft.scope));
        const id = await saveRow('item_attribute_definition', data, attr?.id);
        setSaving(false);
        if (!id) return;
        toast.success(isNew ? 'Attributo creato' : 'Attributo salvato');
        await reload();
        // Nuovo: resta aperto per i valori ammessi; esistente: si chiude come gli altri modali
        if (isNew) onCreated(id);
        else onClose();
    }

    async function addOption(label) {
        const id = await saveRow('item_attribute_option', { ...optionPayload({ label, value: slugify(label) }, attr.id), sortOrder: nextSort(attrOptions) });
        if (id) await reload();
        return !!id;
    }

    async function reorderOptions(list, moving, target) {
        const next = moveInList(list, moving, target);
        if (next === list) return;
        await saveOrder('item_attribute_option', next);
        reload();
    }

    const path = pathOf(attr ? scopeOf(attr) : draft.scope);

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent size='lg'>
                <DialogHeader>
                    <DialogTitle className='text-lg'>
                        <Crumbs parts={path} last={isNew ? 'Nuovo attributo' : attr.label} />
                    </DialogTitle>
                </DialogHeader>
                <DialogBody className='flex flex-col gap-5'>
                    <div className='grid gap-3 sm:grid-cols-2'>
                        <div className='flex flex-col gap-2'>
                            <Label>Etichetta *</Label>
                            <Input autoFocus={isNew} value={draft.label} placeholder='Es. Forza di chiusura' onChange={(e) => set({ label: e.target.value })} />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <Label>Codice *</Label>
                            <Input className='font-mono text-xs' value={draft.code} onChange={(e) => { setCodeTouched(true); set({ code: e.target.value }); }} />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <Label>Tipo di valore</Label>
                            <Combobox options={DATA_TYPES} value={draft.dataType} onChange={(o) => o && set({ dataType: o.value })} />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <Label>Unità di misura</Label>
                            <Input value={draft.unit} placeholder='t, mm, kW…' onChange={(e) => set({ unit: e.target.value })} />
                        </div>
                        <div className='flex flex-col gap-2 sm:col-span-2'>
                            <Label>Vale per</Label>
                            <Combobox options={scopeOptions} value={draft.scope} onChange={(o) => o && set({ scope: o.value })} />
                        </div>
                        {/* Numeri: il valore negli articoli può essere anche "da X a Y" (es. forza di chiusura) */}
                        {draft.dataType === 'number' && (
                            <div className='sm:col-span-2'>
                                <SwitchField id='a-range' label='Ammette un intervallo (da X a Y)' checked={!!draft.allowRange} onCheckedChange={(v) => set({ allowRange: v ? 1 : 0 })} />
                                <p className='mt-1 mb-0 text-xs text-muted-foreground'>Negli articoli si sceglie tra un valore solo e un intervallo; nel filtro del sito un intervallo compare se si sovrappone a quello cercato.</p>
                            </div>
                        )}
                        <SwitchField id='a-filter' label='Filtro nel catalogo' checked={!!draft.isFilterable} onCheckedChange={(v) => set({ isFilterable: v ? 1 : 0 })} />
                        <SwitchField id='a-visible' label='Visibile nella scheda' checked={!!draft.isShopVisible} onCheckedChange={(v) => set({ isShopVisible: v ? 1 : 0 })} />
                    </div>

                    {draft.dataType === 'enum' && (
                        <div className='flex flex-col gap-2 rounded-md border bg-muted/30 p-3'>
                            <div>
                                <p className='mb-0 text-sm font-semibold'>Valori ammessi</p>
                                <p className='mb-0 text-xs text-muted-foreground'>Ogni valore diventa una casella di filtro. Trascina per riordinare.</p>
                            </div>
                            {isNew || optOf(attr.dataType) !== 'enum' ? (
                                <p className='mb-0 text-xs text-muted-foreground'>Salva l'attributo come "A scelta" per aggiungere i valori.</p>
                            ) : (
                                <>
                                    <div className='flex flex-col gap-0.5'>
                                        {attrOptions.map((o) => (
                                            <OptionRow
                                                key={o.id} row={o} list={attrOptions} over={over} setOver={setOver} onReorder={reorderOptions}
                                                onEdit={(row) => setOptionDialog(row)} onDelete={(row) => setConfirm(row)}
                                            />
                                        ))}
                                        {attrOptions.length === 0 && <p className='mb-0 text-xs text-muted-foreground'>Nessun valore: aggiungine uno.</p>}
                                    </div>
                                    <QuickAdd placeholder='Nuovo valore (es. Idraulica) e Invio' onAdd={addOption} />
                                </>
                            )}
                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    {!isNew && (
                        <Button variant='outline-danger' className='me-auto' onClick={() => setConfirm('attribute')}>
                            <Icon name='trash' className='me-2' />Elimina
                        </Button>
                    )}
                    <Button variant='outline-secondary' onClick={onClose}>Chiudi</Button>
                    <Button disabled={!dirty || !valid || saving} onClick={save}>
                        {saving && <Icon name='spinner' spin className='me-2' />}
                        {isNew ? 'Crea attributo' : 'Salva'}
                    </Button>
                </DialogFooter>
            </DialogContent>

            {optionDialog && (
                <EntityDialog
                    open
                    onOpenChange={(o) => { if (!o) setOptionDialog(null); }}
                    title={`Modifica valore: ${optionDialog.label}`}
                    fields={optionFields}
                    initial={optionInitial(optionDialog)}
                    onSave={async (values) => {
                        const id = await saveRow('item_attribute_option', optionPayload(values, attr.id), optionDialog.id);
                        if (id) reload();
                        return !!id;
                    }}
                />
            )}
            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={(o) => { if (!o) setConfirm(null); }}
                    title="Confermi l'eliminazione?"
                    message={confirm === 'attribute'
                        ? `Eliminare l'attributo ${attr.label}? Sparisce dalle schede e dai filtri; i valori già inseriti negli articoli non vengono più mostrati.`
                        : `Eliminare il valore ${confirm.label}? Gli articoli che lo usano restano senza questo dato.`}
                    onConfirm={async () => {
                        const isAttr = confirm === 'attribute';
                        const ok = await removeRow(isAttr ? 'item_attribute_definition' : 'item_attribute_option', isAttr ? attr.id : confirm.id);
                        if (ok) { await reload(); if (isAttr) onClose(); }
                        return ok;
                    }}
                />
            )}
        </Dialog>
    );
}

export default function CatalogoAttributi() {
    const [loading, setLoading] = useState(true);
    const [goods, setGoods] = useState([]);
    const [technicals, setTechnicals] = useState([]);
    const [attributes, setAttributes] = useState([]);
    const [options, setOptions] = useState([]);
    const [scope, setScope] = useState(ALL);
    const [editing, setEditing] = useState(null); // { id } | { isNew: true }
    const [over, setOver] = useState(null);
    const [query, setQuery] = useState('');

    async function load() {
        try {
            const [g, t, a, o] = await Promise.all([
                listAll('item_goods_category'), listAll('item_technical_category'),
                listAll('item_attribute_definition'), listAll('item_attribute_option'),
            ]);
            setGoods(g); setTechnicals(t); setAttributes(a); setOptions(o);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);

    const optionsCount = (attrId) => options.filter((o) => sameId(o.idAttributeDefinition, attrId)).length;
    const withCounts = attributes.map((a) => ({ ...a, _options: optOf(a.dataType) === 'enum' ? optionsCount(a.id) : undefined }));
    const orphanTechs = technicals.filter((t) => !goods.some((g) => sameId(g.id, idOf(t.idCategory))));

    /** Percorso di un ambito: ['Presse', 'Presse standard'] */
    const pathOf = (s) => {
        if (!s || s === ALL) return [];
        if (s === 'all') return ['Tutte le categorie'];
        const [kind, id] = s.split(':');
        if (kind === 'g') return [goods.find((g) => sameId(g.id, id))?.name || '?'];
        const t = technicals.find((x) => sameId(x.id, id));
        const g = t && goods.find((x) => sameId(x.id, idOf(t.idCategory)));
        return [g ? g.name : 'Senza merceologica', t?.name || '?'];
    };

    const scopeOptions = useMemo(() => [
        { value: 'all', label: 'Tutte le categorie' },
        ...goods.flatMap((g) => [
            { value: 'g:' + g.id, label: g.name },
            ...technicals.filter((t) => sameId(idOf(t.idCategory), g.id)).map((t) => ({ value: 't:' + t.id, label: `${g.name} › ${t.name}` })),
        ]),
        ...technicals.filter((t) => !goods.some((g) => sameId(g.id, idOf(t.idCategory)))).map((t) => ({ value: 't:' + t.id, label: `${t.name} (senza merceologica)` })),
    ], [goods, technicals]);

    const inScope = (a, s) => (s === ALL ? true : scopeOf(a) === s);
    const shown = withCounts
        .filter((a) => inScope(a, scope))
        .filter((a) => !query || (a.label + ' ' + a.code).toLowerCase().includes(query.toLowerCase()));
    const editingAttr = editing?.id ? attributes.find((a) => sameId(a.id, editing.id)) : null;
    const newScope = scope === ALL ? 'all' : scope;
    const scopePath = pathOf(scope);

    /* ------------------------------------------------------------ azioni */

    async function reorderAttributes(list, moving, target) {
        const next = moveInList(list, moving, target);
        if (next === list) return;
        setAttributes((prev) => prev.map((a) => { const i = next.findIndex((n) => n.id === a.id); return i >= 0 ? { ...a, sortOrder: (i + 1) * 10 } : a; }).sort((a, b) => a.sortOrder - b.sortOrder));
        if (await saveOrder('item_attribute_definition', next)) toast.success('Ordine salvato');
        load();
    }

    async function moveToScope(attr, s) {
        if (scopeOf(attr) === s) return;
        const target = attributes.filter((a) => scopeOf(a) === s);
        const id = await saveRow('item_attribute_definition', { ...scopeFields(s, technicals), sortOrder: nextSort(target) }, attr.id);
        if (id) { toast.success(`${attr.label} ora vale per: ${pathOf(s).join(' › ')}`); load(); }
    }

    const counts = (s) => attributes.filter((a) => inScope(a, s)).length;
    const scopeProps = { onSelect: setScope, over, setOver, onDropAttribute: moveToScope };

    return (
        <div className='catalogo-attributi'>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <h3 className='mb-0'>Attributi del catalogo</h3>
                <div className='flex gap-2'>
                    <Button size='sm' variant='outline-secondary' onClick={() => { setLoading(true); load(); }}>
                        <Icon name='rotate' className='me-2' />Aggiorna
                    </Button>
                    <Button size='sm' onClick={() => setEditing({ isNew: true })}>
                        <Icon name='plus' className='me-2' />Nuovo attributo
                    </Button>
                </div>
            </div>
            <p className='mb-3 text-xs text-muted-foreground'>
                Scegli a sinistra dove vale l'attributo. Clicca un attributo per modificarlo; trascinalo per cambiarne l'ordine, o sopra una voce a sinistra per spostarlo lì.
            </p>

            {loading ? (
                <div className='flex justify-center py-10'><Spinner /></div>
            ) : (
                <div className='grid gap-3 lg:grid-cols-[18rem_1fr]'>
                    {/* 1. Ambiti */}
                    <Card className='self-start'>
                        <CardBody className='flex flex-col gap-0.5'>
                            <h4 className='mb-2 text-lg font-semibold'>Vale per</h4>
                            <ScopeItem {...scopeProps} scope={ALL} label='Tutti gli attributi' count={counts(ALL)} selected={scope === ALL} strong />
                            <ScopeItem {...scopeProps} scope='all' label='Comuni a tutte le categorie' count={counts('all')} selected={scope === 'all'} strong />
                            <div className='my-2 border-t' />
                            {goods.map((g) => (
                                <React.Fragment key={g.id}>
                                    <ScopeItem {...scopeProps} scope={'g:' + g.id} label={g.name} count={counts('g:' + g.id)} selected={scope === 'g:' + g.id} strong />
                                    {technicals.filter((t) => sameId(idOf(t.idCategory), g.id)).map((t) => (
                                        <ScopeItem key={t.id} {...scopeProps} depth={1} scope={'t:' + t.id} label={t.name} count={counts('t:' + t.id)} selected={scope === 't:' + t.id} />
                                    ))}
                                </React.Fragment>
                            ))}
                            {orphanTechs.length > 0 && <p className='mt-3 mb-1 px-2 text-xs font-semibold text-muted-foreground'>Senza merceologica</p>}
                            {orphanTechs.map((t) => (
                                <ScopeItem key={t.id} {...scopeProps} depth={1} scope={'t:' + t.id} label={t.name} count={counts('t:' + t.id)} selected={scope === 't:' + t.id} />
                            ))}
                        </CardBody>
                    </Card>

                    {/* 2. Attributi dell'ambito */}
                    <Card className='self-start'>
                        <CardBody className='flex flex-col gap-3'>
                            <div className='flex flex-wrap items-center justify-between gap-3 border-b pb-3'>
                                <h4 className='mb-0 min-w-0 text-lg'>
                                    {scope === ALL
                                        ? <span className='font-semibold'>Tutti gli attributi</span>
                                        : <Crumbs parts={scopePath.slice(0, -1)} last={scopePath[scopePath.length - 1]} />}
                                </h4>
                                <Input size='sm' className='max-w-56' placeholder='Cerca attributo…' value={query} onChange={(e) => setQuery(e.target.value)} />
                            </div>
                            <div className='flex flex-col gap-0.5'>
                                {shown.map((a) => (
                                    <AttributeRow
                                        key={a.id} row={a} list={shown} onOpen={(id) => setEditing({ id })}
                                        over={over} setOver={setOver} onReorder={reorderAttributes}
                                        path={scope === ALL ? pathOf(scopeOf(a)).join(' › ') : null}
                                    />
                                ))}
                                {shown.length === 0 && <p className='mb-0 text-sm text-muted-foreground'>Nessun attributo qui.</p>}
                            </div>
                            <QuickAdd
                                placeholder={`Nuovo attributo in ${pathOf(newScope).join(' › ')} (Invio)`}
                                onAdd={async (label) => {
                                    const id = await saveRow('item_attribute_definition', {
                                        ...attributePayload({ label, code: codify(label), dataType: 'number', unit: '', allowRange: 0, scope: newScope, isFilterable: 1, isShopVisible: 1 }, technicals),
                                        sortOrder: nextSort(attributes.filter((a) => scopeOf(a) === newScope)),
                                    });
                                    if (id) { await load(); setEditing({ id }); }
                                    return !!id;
                                }}
                            />
                        </CardBody>
                    </Card>
                </div>
            )}

            {editing && (editing.isNew || editingAttr) && (
                <AttributeDialog
                    key={editing.isNew ? 'new' : editing.id}
                    attr={editingAttr}
                    initialScope={newScope}
                    attributes={attributes}
                    options={options}
                    technicals={technicals}
                    scopeOptions={scopeOptions}
                    pathOf={pathOf}
                    onClose={() => setEditing(null)}
                    reload={load}
                    onCreated={(id) => setEditing({ id })}
                />
            )}
        </div>
    );
}
