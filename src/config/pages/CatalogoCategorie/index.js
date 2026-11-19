/*
 * Gestione categorie del catalogo come albero a cascata:
 *   Categoria merceologica
 *     └ Categoria tecnica
 *         └ Tipologia
 * Tutto l'albero è visibile insieme; ogni ramo si apre e si chiude (freccia a sinistra,
 * oppure "Espandi tutto" / "Comprimi tutto").
 * Trascinamento (maniglia a sinistra di ogni riga):
 *   - su una riga dello stesso livello: la voce va al suo posto, anche sotto un altro genitore
 *     (es. una categoria tecnica trascinata su un'altra categoria tecnica di Ausiliari finisce
 *     in Ausiliari, in quella posizione);
 *   - su una riga del livello sopra: la voce finisce in fondo a quel genitore
 *     (categoria tecnica → categoria merceologica, tipologia → categoria tecnica).
 * Azioni di riga: "+" aggiunge una sottovoce, occhio visibile/nascosta sul sito, matita
 * modale con tutti i campi, cestino (bloccato se la voce ha figli o articoli collegati).
 * Le voci senza genitore valido stanno in fondo, in "Senza categoria": si trascinano al loro posto.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody } from '../../../components/ui/card';
import { Spinner } from '../../../components/ui/spinner';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';
import { DataManager } from '../../../core/data-manager';
import {
    sameId, boolOf, countItems, dragProps, dropProps, idOf, listAll, nextSort, ref, removeRow, saveRow, slugify,
} from '../../catalog/shared';
import { ConfirmDialog, EntityDialog, IconButton, QuickAdd } from '../../catalog/components';
import {
    goodsFields, goodsInitial, goodsPayload, technicalFields, technicalInitial, technicalPayload, typeFields, typeInitial, typePayload,
} from '../../catalog/forms';
import './style.css';

/** Livelli dell'albero: entità, campo del genitore, livello figlio, etichette */
const LEVELS = {
    goods: { entity: 'item_goods_category', parent: null, child: 'technical', name: 'categoria merceologica', childName: 'categoria tecnica', itemField: 'idGoodsCategory' },
    technical: { entity: 'item_technical_category', parent: 'idCategory', parentLevel: 'goods', child: 'type', name: 'categoria tecnica', childName: 'tipologia', itemField: 'idTechnicalCategory' },
    type: { entity: 'item_technical_type', parent: 'idTechnicalCategory', parentLevel: 'technical', child: null, name: 'tipologia', itemField: 'idTechnicalType' },
};
const DEPTH = { goods: 0, technical: 1, type: 2 };

/** Una riga dell'albero */
function TreeRow({ level, row, childCount, open, onToggle, over, setOver, onDropOn, actions }) {
    const key = level + ':' + row.id;
    const hidden = !boolOf(row.isShopVisible);
    const child = LEVELS[level].child;
    // Si accettano: lo stesso livello (va in questa posizione) e il livello figlio (va dentro)
    const accept = [level, child].filter(Boolean);
    return (
        <div
            {...dropProps({ accept, setOver, overKey: key, onDrop: (d) => onDropOn(level, row, d) })}
            className={
                'cat-row group flex items-center gap-1.5 rounded-md border py-1 pe-1 text-sm ' +
                (over === key ? 'border-primary bg-primary/10 ' : 'border-transparent hover:bg-accent ') +
                (hidden ? 'text-muted-foreground ' : '') +
                (level === 'goods' ? 'font-medium ' : '')
            }
            style={{ paddingInlineStart: 4 + DEPTH[level] * 28 }}
        >
            {child ? (
                <button type='button' onClick={onToggle} className='flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground' aria-label={open ? 'Chiudi' : 'Apri'}>
                    <Icon name={open ? 'chevron-down' : 'chevron-right'} />
                </button>
            ) : (
                <span className='size-6 shrink-0' />
            )}
            <span {...dragProps(level, row)} className='flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground/60 hover:text-foreground' title='Trascina'>
                <Icon name='grip-vertical' />
            </span>
            <span className='min-w-0 flex-1 truncate'>
                {row.name}
                {hidden && <span className='ms-2 text-xs font-normal'>(nascosta)</span>}
            </span>
            {child && <Badge variant='light' pill>{childCount}</Badge>}
            <span className='cat-row-actions flex'>
                {child && <IconButton icon='plus' title={`Aggiungi ${LEVELS[level].childName}`} onClick={() => actions.add(level, row)} />}
                <IconButton icon={hidden ? 'eye-slash' : 'eye'} title={hidden ? 'Mostra sul sito' : 'Nascondi dal sito'} onClick={() => actions.toggle(level, row)} />
                <IconButton icon='pen-to-square' title='Modifica' onClick={() => actions.edit(level, row)} />
                <IconButton icon='trash' title='Elimina' danger onClick={() => actions.remove(level, row)} />
            </span>
        </div>
    );
}

export default function CatalogoCategorie() {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [rows, setRows] = useState({ goods: [], technical: [], type: [] });
    const [closed, setClosed] = useState(() => new Set()); // rami chiusi: 'goods:1', 'technical:4'
    const [adding, setAdding] = useState(null); // { level, parentId } per l'aggiunta rapida in linea
    const [over, setOver] = useState(null);
    const [dialog, setDialog] = useState(null); // { level, row }
    const [confirm, setConfirm] = useState(null);

    async function load() {
        try {
            const [goods, technical, type] = await Promise.all([
                listAll(LEVELS.goods.entity), listAll(LEVELS.technical.entity), listAll(LEVELS.type.entity),
            ]);
            setRows({ goods, technical, type });
        } catch (e) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);

    /** Figli di un genitore (parentId null = voci senza genitore valido) */
    const childrenOf = (level, parentId) => {
        const field = LEVELS[level].parent;
        const parents = rows[LEVELS[level].parentLevel];
        return rows[level].filter((r) => {
            const p = idOf(r[field]);
            if (parentId === null) return !parents.some((x) => sameId(x.id, p));
            return sameId(p, parentId);
        });
    };
    const orphanTech = childrenOf('technical', null);
    const orphanTypes = childrenOf('type', null);

    const goodsOptions = useMemo(() => rows.goods.map((g) => ({ value: g.id, label: g.name })), [rows.goods]);
    const technicalOptions = useMemo(() => rows.technical.map((t) => {
        const g = rows.goods.find((x) => sameId(x.id, idOf(t.idCategory)));
        return { value: t.id, label: (g ? g.name + ' › ' : '') + t.name };
    }), [rows.goods, rows.technical]);

    /* ------------------------------------------------------------ azioni */

    /**
     * Mette `item` (livello `level`) sotto `parentId`, prima di `target` (stesso livello) o in
     * fondo se target è null. Salva il genitore se cambia e il nuovo ordine dei fratelli.
     */
    async function place(level, item, parentId, target) {
        const field = LEVELS[level].parent;
        const full = level === 'goods' ? rows.goods : childrenOf(level, parentId);
        const list = full.filter((r) => !sameId(r.id, item.id));
        let at = target ? list.findIndex((r) => sameId(r.id, target.id)) : list.length;
        // Nella stessa lista, trascinando verso il basso si va dopo il bersaglio
        const sameParent = level === 'goods' || sameId(idOf(item[field]), parentId);
        if (target && sameParent) {
            const from = full.findIndex((r) => sameId(r.id, item.id));
            const to = full.findIndex((r) => sameId(r.id, target.id));
            if (from < to) at += 1;
        }
        if (at < 0) at = list.length;
        const next = [...list.slice(0, at), item, ...list.slice(at)];

        setBusy(true);
        let ok = true;
        for (let i = 0; i < next.length; i++) {
            const r = next[i];
            const sortOrder = (i + 1) * 10;
            const data = {};
            if (Number(r.sortOrder) !== sortOrder) data.sortOrder = sortOrder;
            if (sameId(r.id, item.id) && field && !sameParent) data[field] = ref(parentId);
            if (Object.keys(data).length === 0) continue;
            const response = await DataManager.updateItem(LEVELS[level].entity, data, r.id);
            if (!response || response.success !== 1) { ok = false; break; }
        }
        setBusy(false);
        if (!ok) toast.error('Spostamento non salvato: riprova');
        else if (!sameParent) {
            const parentName = rows[LEVELS[level].parentLevel].find((p) => sameId(p.id, parentId))?.name;
            toast.success(`${item.name} spostata in ${parentName}`);
            setClosed((c) => { const n = new Set(c); n.delete(LEVELS[level].parentLevel + ':' + parentId); return n; });
        }
        await load();
    }

    /** Rilascio su una riga: stesso livello → al suo posto; livello figlio → in fondo dentro */
    function onDropOn(level, row, { kind, item }) {
        if (kind === level) {
            if (sameId(item.id, row.id)) return;
            const parentId = LEVELS[level].parent ? idOf(row[LEVELS[level].parent]) : null;
            place(level, item, parentId, row);
        } else {
            place(kind, item, row.id, null);
        }
    }

    async function toggleVisible(level, row) {
        const value = boolOf(row.isShopVisible) ? 0 : 1;
        setRows((prev) => ({ ...prev, [level]: prev[level].map((r) => (r.id === row.id ? { ...r, isShopVisible: value } : r)) }));
        if (!(await saveRow(LEVELS[level].entity, { isShopVisible: value }, row.id))) load();
    }

    async function quickAdd(level, name, parentId) {
        const list = level === 'goods' ? rows.goods : childrenOf(level, parentId);
        const data = { name, slug: slugify(name), sortOrder: nextSort(list), isShopVisible: 1 };
        if (LEVELS[level].parent) data[LEVELS[level].parent] = ref(parentId);
        const id = await saveRow(LEVELS[level].entity, data);
        if (id) { toast.success(`${name} aggiunta`); await load(); }
        return !!id;
    }

    async function askDelete(level, row) {
        const child = LEVELS[level].child;
        const children = child ? childrenOf(child, row.id).length : 0;
        const items = await countItems(LEVELS[level].itemField, row.id);
        if (children > 0) {
            setConfirm({ level, row, blocked: true, message: `${row.name} contiene ${children} ${child === 'technical' ? 'categorie tecniche' : 'tipologie'}: spostale o eliminale prima.` });
        } else if (items) {
            setConfirm({ level, row, blocked: true, message: `${row.name} è usata da ${items} ${items === 1 ? 'articolo' : 'articoli'}: cambiane la classificazione prima di eliminarla.` });
        } else {
            setConfirm({ level, row, message: `Eliminare ${row.name}? Non è usata da nessun articolo.` });
        }
    }

    const toggleOpen = (key) => setClosed((c) => { const n = new Set(c); if (n.has(key)) n.delete(key); else n.add(key); return n; });
    const actions = {
        toggle: toggleVisible,
        edit: (level, row) => setDialog({ level, row }),
        remove: askDelete,
        add: (level, row) => {
            setAdding({ level: LEVELS[level].child, parentId: row.id });
            setClosed((c) => { const n = new Set(c); n.delete(level + ':' + row.id); return n; });
        },
    };
    const rowProps = { over, setOver, onDropOn, actions };

    /* ------------------------------------------------------------ render */

    // Funzioni di render (chiamate, non usate come componenti: le righe restano montate durante il trascinamento)
    const addRow = (level, parentId) => {
        if (!adding || adding.level !== level || !sameId(adding.parentId, parentId)) return null;
        return (
            <div key={'add-' + level + parentId} className='py-1 pe-1' style={{ paddingInlineStart: 4 + DEPTH[level] * 28 + 60 }}>
                <QuickAdd
                    autoFocus
                    placeholder={`Nome della nuova ${LEVELS[level].name} (Invio per salvare, Esc per annullare)`}
                    onAdd={async (n) => { const ok = await quickAdd(level, n, parentId); if (ok) setAdding(null); return ok; }}
                    onCancel={() => setAdding(null)}
                />
            </div>
        );
    };

    const typeRows = (techId) => (
        <>
            {childrenOf('type', techId).map((t) => (
                <TreeRow key={'type' + t.id} {...rowProps} level='type' row={t} />
            ))}
            {addRow('type', techId)}
        </>
    );

    const techRows = (list, goodsId) => (
        <>
            {list.map((t) => {
                const open = !closed.has('technical:' + t.id);
                return (
                    <React.Fragment key={'tech' + t.id}>
                        <TreeRow {...rowProps} level='technical' row={t} childCount={childrenOf('type', t.id).length} open={open} onToggle={() => toggleOpen('technical:' + t.id)} />
                        {open && typeRows(t.id)}
                    </React.Fragment>
                );
            })}
            {goodsId !== null && addRow('technical', goodsId)}
        </>
    );

    const dlg = dialog && {
        goods: { fields: goodsFields, initial: goodsInitial(dialog.row), payload: goodsPayload },
        technical: { fields: technicalFields(goodsOptions), initial: technicalInitial(dialog.row), payload: technicalPayload },
        type: { fields: typeFields(technicalOptions), initial: typeInitial(dialog.row), payload: typePayload },
    }[dialog.level];

    const allKeys = [...rows.goods.map((g) => 'goods:' + g.id), ...rows.technical.map((t) => 'technical:' + t.id)];

    return (
        <div className='catalogo-categorie'>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <h3 className='mb-0'>Categorie del catalogo</h3>
                <div className='flex flex-wrap gap-2'>
                    <Button size='sm' variant='outline-secondary' onClick={() => setClosed(new Set())}>
                        <Icon name='angles-down' className='me-2' />Espandi tutto
                    </Button>
                    <Button size='sm' variant='outline-secondary' onClick={() => setClosed(new Set(allKeys))}>
                        <Icon name='angles-up' className='me-2' />Comprimi tutto
                    </Button>
                    <Button size='sm' variant='outline-secondary' onClick={() => { setLoading(true); load(); }}>
                        <Icon name='rotate' className='me-2' />Aggiorna
                    </Button>
                </div>
            </div>
            <p className='mb-3 text-xs text-muted-foreground'>
                Trascina dalla maniglia <Icon name='grip-vertical' /> per riordinare. Rilascia su una voce dello stesso livello per metterla in quella posizione
                (anche sotto un'altra categoria), oppure su una categoria del livello sopra per spostarla lì dentro, in fondo.
            </p>

            {loading ? (
                <div className='flex justify-center py-10'><Spinner /></div>
            ) : (
                <Card>
                    <CardBody className={'flex flex-col gap-0.5 ' + (busy ? 'pointer-events-none opacity-60' : '')}>
                        {rows.goods.map((g) => {
                            const open = !closed.has('goods:' + g.id);
                            return (
                                <React.Fragment key={'goods' + g.id}>
                                    <TreeRow {...rowProps} level='goods' row={g} childCount={childrenOf('technical', g.id).length} open={open} onToggle={() => toggleOpen('goods:' + g.id)} />
                                    {open && techRows(childrenOf('technical', g.id), g.id)}
                                </React.Fragment>
                            );
                        })}

                        <div className='mt-3 border-t pt-3'>
                            <QuickAdd placeholder='Nuova categoria merceologica (Invio per salvare)' onAdd={(n) => quickAdd('goods', n)} />
                        </div>

                        {(orphanTech.length > 0 || orphanTypes.length > 0) && (
                            <div className='mt-4 rounded-md border border-dashed border-warning/60 bg-warning/5 p-2'>
                                <p className='mb-1 flex items-center gap-2 px-1 text-sm font-medium'>
                                    <Icon name='triangle-exclamation' className='text-warning' />
                                    Senza categoria
                                </p>
                                <p className='mb-2 px-1 text-xs text-muted-foreground'>
                                    Queste voci non hanno un genitore valido: trascinale su una categoria qui sopra.
                                </p>
                                {techRows(orphanTech, null)}
                                {orphanTypes.map((t) => (
                                    <TreeRow key={'otype' + t.id} {...rowProps} level='type' row={t} />
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}

            {dlg && (
                <EntityDialog
                    open
                    onOpenChange={(o) => { if (!o) setDialog(null); }}
                    title={`Modifica ${dialog.row.name}`}
                    fields={dlg.fields}
                    initial={dlg.initial}
                    onSave={async (values) => {
                        const id = await saveRow(LEVELS[dialog.level].entity, dlg.payload(values), dialog.row.id);
                        if (id) { toast.success('Salvato'); load(); }
                        return !!id;
                    }}
                />
            )}

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={(o) => { if (!o) setConfirm(null); }}
                    title={confirm.blocked ? 'Impossibile eliminare' : 'Eliminare la voce?'}
                    message={confirm.message}
                    blocked={confirm.blocked}
                    onConfirm={async () => {
                        const ok = await removeRow(LEVELS[confirm.level].entity, confirm.row.id);
                        if (ok) { toast.success(`${confirm.row.name} eliminata`); load(); }
                        return ok;
                    }}
                />
            )}
        </div>
    );
}
