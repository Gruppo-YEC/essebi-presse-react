import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Select as NativeSelect } from '../../ui/select';
import { Spinner } from '../../ui/spinner';
import { SimpleTooltip } from '../../ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { ViewManager } from '../../../core/view-manager';
import { DataManager } from '../../../core/data-manager';
import { toast } from '../../ui/toast';
import { settings } from '../../../config/settings';
import Icon from '../../BodyElements/Icon';

const t = (key, fallback) => LanguageProvider.get(key, fallback);
const ENTITY = 'user_entity_preferences';
const NON_SORTABLE = ['richText', 'markdown', 'file', 'externalEntity', 'multipleExternalEntity', 'deepExternalEntity'];

/**
 * Opzioni del DataGrid: colonne visibili, ordine, ordinamento predefinito,
 * salvati come preferenze per utente ed entita'.
 *
 * Struttura:
 *  - "Preferenze salvate": richiudibile. Per ogni voce: modifica (la carica
 *    qui dentro), rinomina (inline), imposta (la applica), elimina.
 *  - Due colonne: a sinistra le colonne disponibili (solo quelle non in uso),
 *    a destra le scelte, riordinabili col drag&drop nativo.
 *  - "Opzioni avanzate": richiudibile, con l'ordinamento predefinito.
 *  - Footer: "Salva modifiche" se si sta lavorando su una preferenza
 *    esistente, altrimenti "Salva come nuova" (chiede il nome). In entrambi i
 *    casi la preferenza salvata diventa quella attiva e il modale si chiude,
 *    cosi' il datagrid la ricarica.
 *
 * user_entity_preferences: { id, entity, label, content: JSON{columns, sorting}, isDefault }
 */
export default function ModalEntityConfig({ entity, props, entityPreferences, entityAllPreferences, status, close }) {
    const [saving, setSaving] = useState(false);
    const [allColumns, setAllColumns] = useState([]);
    const [selected, setSelected] = useState([]);
    const [sorting, setSorting] = useState({ field: 'id', order: 'desc' });

    const [prefList, setPrefList] = useState([]);
    const [activePrefId, setActivePrefId] = useState(null);

    const [prefsOpen, setPrefsOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [filter, setFilter] = useState('');

    const [renamingId, setRenamingId] = useState(null);
    const [renamingLabel, setRenamingLabel] = useState('');

    const [nameDialog, setNameDialog] = useState(false);
    const [newName, setNewName] = useState('default');

    /* Drag&drop: { item, source: 'selected'|'available', index } e indice di inserimento. */
    const [dragging, setDragging] = useState(null);
    const [overList, setOverList] = useState(null);
    const [placeholderIndex, setPlaceholderIndex] = useState(null);

    // ------------------------------------------------------------------
    // Inizializzazione: preferenza attiva (isDefault) o fallback
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!entity) return;
        const cols = (ViewManager.getColumns(entity) || []).slice();
        setAllColumns(cols);

        const list = Array.isArray(entityAllPreferences) ? entityAllPreferences.slice() : [];
        setPrefList(list);

        const def = list.find((p) => Number(p.isDefault) === 1);
        if (def) {
            applyContent(parseContent(def.content), cols);
            setActivePrefId(def.id ?? null);
        }
        else {
            applyContent(entityPreferences || {}, cols);
            setActivePrefId(null);
        }
        setPrefsOpen(false);
        setAdvancedOpen(false);
        setFilter('');
        setRenamingId(null);
    }, [entity, entityPreferences, entityAllPreferences]);

    function parseContent(raw) {
        try { return typeof raw === 'string' ? JSON.parse(raw) : (raw || {}); } catch { return {}; }
    }

    function applyContent(content, cols) {
        setSelected((content?.columns || []).filter((c) => cols.includes(c)));
        setSorting({
            field: content?.sorting?.field || 'id',
            order: content?.sorting?.order || 'desc',
        });
    }

    const activePref = prefList.find((p) => p.id === activePrefId) || null;
    const available = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return allColumns
            .filter((c) => !selected.includes(c))
            .filter((c) => !q || LanguageProvider.getLabel(entity, c).toLowerCase().includes(q) || c.toLowerCase().includes(q));
    }, [allColumns, selected, filter, entity]);

    const sortableColumns = allColumns.filter((col) => {
        const cfg = props?.columns?.[col];
        return cfg && !NON_SORTABLE.includes(cfg.input_type);
    });

    // ------------------------------------------------------------------
    // Colonne
    // ------------------------------------------------------------------
    const addColumn = useCallback((col, atIndex = null) => {
        if (!col || selected.includes(col)) return;
        const next = [...selected];
        next.splice(atIndex === null ? next.length : Math.max(0, Math.min(atIndex, next.length)), 0, col);
        setSelected(next);
    }, [selected]);

    const removeColumn = useCallback((col) => setSelected(selected.filter((c) => c !== col)), [selected]);

    const reorderSelected = useCallback((from, to) => {
        if (from === to) return;
        const list = [...selected];
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        setSelected(list);
    }, [selected]);

    // ------------------------------------------------------------------
    // Drag & drop nativo
    // ------------------------------------------------------------------
    function onDragStartItem(e, payload) {
        const json = JSON.stringify(payload);
        e.dataTransfer.setData('text/plain', json);
        e.dataTransfer.setData('application/json', json);
        e.dataTransfer.effectAllowed = 'move';
        setDragging(payload);
    }

    function clearDnD() { setDragging(null); setOverList(null); setPlaceholderIndex(null); }

    function readPayload(e) {
        try { return JSON.parse(e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')); } catch { return null; }
    }

    function onDragOverSelectedItem(e, index) {
        e.preventDefault(); e.stopPropagation();
        setOverList('selected');
        const rect = e.currentTarget.getBoundingClientRect();
        setPlaceholderIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
        e.dataTransfer.dropEffect = 'move';
    }

    function onDragOverSelectedList(e) {
        e.preventDefault();
        setOverList('selected');
        if (placeholderIndex === null) setPlaceholderIndex(selected.length);
        e.dataTransfer.dropEffect = 'move';
    }

    function onDropSelected(e) {
        e.preventDefault(); e.stopPropagation();
        const data = readPayload(e);
        const dropIndex = placeholderIndex == null ? selected.length : Math.max(0, Math.min(placeholderIndex, selected.length));
        if (data?.source === 'available') addColumn(data.item, dropIndex);
        if (data?.source === 'selected') {
            let to = dropIndex;
            if (to > data.index) to -= 1;
            reorderSelected(data.index, Math.max(0, Math.min(to, selected.length - 1)));
        }
        clearDnD();
    }

    function onDragOverAvailable(e) { e.preventDefault(); setOverList('available'); e.dataTransfer.dropEffect = 'move'; }

    function onDropAvailable(e) {
        e.preventDefault(); e.stopPropagation();
        const data = readPayload(e);
        if (data?.source === 'selected') removeColumn(data.item);
        clearDnD();
    }

    // ------------------------------------------------------------------
    // Preferenze
    // ------------------------------------------------------------------
    function content() {
        return JSON.stringify({ columns: selected, sorting });
    }

    function loadPreference(pref) {
        applyContent(parseContent(pref.content), allColumns);
        setActivePrefId(pref.id);
        setRenamingId(null);
    }

    function startNew() {
        setActivePrefId(null);
        setRenamingId(null);
    }

    /** Rende attiva una preferenza (isDefault=1) togliendo il flag alle altre. */
    async function makeDefault(prefId) {
        const current = prefList.find((p) => Number(p.isDefault) === 1);
        if (current && current.id !== prefId) {
            await DataManager.updateItem(ENTITY, { isDefault: 0 }, current.id);
        }
        if (!current || current.id !== prefId) {
            await DataManager.updateItem(ENTITY, { isDefault: 1 }, prefId);
        }
        setPrefList((prev) => prev.map((p) => ({ ...p, isDefault: Number(p.id === prefId) })));
    }

    async function setDefaultPreference(prefId) {
        try {
            await makeDefault(prefId);
            toast.success(t('entity_config.applied', 'Preferenza applicata.'));
            close(entityPreferences);
        } catch {
            toast.error(t('entity_config.apply_failed', 'Impossibile applicare la preferenza.'));
        }
    }

    function nameTaken(name, exceptId = null) {
        return prefList.some((p) => p.id !== exceptId && (p.label || '').toLowerCase() === name.toLowerCase());
    }

    async function saveChanges() {
        if (!activePrefId) return;
        if (!selected.length) { toast.info(t('entity_config.no_columns', 'Seleziona almeno una colonna.')); return; }
        setSaving(true);
        try {
            const resp = await DataManager.updateItem(ENTITY, { content: content(), entity, label: activePref?.label ?? '' }, activePrefId);
            if (resp.success !== 1) throw new Error();
            await makeDefault(activePrefId);
            toast.success(t('entity_config.saved', 'Preferenza salvata e applicata.'));
            close(entityPreferences);
        } catch {
            toast.error(t('entity_config.save_failed', 'Salvataggio non riuscito.'));
        }
        setSaving(false);
    }

    function openNameDialog() {
        if (!selected.length) { toast.info(t('entity_config.no_columns', 'Seleziona almeno una colonna.')); return; }
        setNewName(nameTaken('default') ? '' : 'default');
        setNameDialog(true);
    }

    async function saveAsNew() {
        const name = newName.trim();
        if (!name) { toast.info(t('entity_config.name_required', 'Inserisci un nome.')); return; }
        if (nameTaken(name)) { toast.error(t('entity_config.name_taken', 'Esiste già una preferenza con questo nome.')); return; }
        setSaving(true);
        try {
            /* Prima si toglie il flag alla preferenza attiva, poi si inserisce la
               nuova gia' attiva: la risposta del create porta l'id in resp.id. */
            const current = prefList.find((p) => Number(p.isDefault) === 1);
            if (current) await DataManager.updateItem(ENTITY, { isDefault: 0 }, current.id);
            const resp = await DataManager.insertItem(ENTITY, { content: content(), entity, label: name, isDefault: 1 });
            if (resp.success !== 1) throw new Error();
            const newId = resp?.id ?? resp?.body?.id ?? null;
            setPrefList((prev) => [...prev.map((p) => ({ ...p, isDefault: 0 })), { id: newId, entity, label: name, content: content(), isDefault: 1 }]);
            toast.success(t('entity_config.saved', 'Preferenza salvata e applicata.'));
            setNameDialog(false);
            close(entityPreferences);
        } catch {
            toast.error(t('entity_config.save_failed', 'Salvataggio non riuscito.'));
        }
        setSaving(false);
    }

    async function commitRename() {
        const name = renamingLabel.trim();
        if (!name) { toast.info(t('entity_config.name_required', 'Inserisci un nome.')); return; }
        if (nameTaken(name, renamingId)) { toast.error(t('entity_config.name_taken', 'Esiste già una preferenza con questo nome.')); return; }
        try {
            const resp = await DataManager.updateItem(ENTITY, { label: name }, renamingId);
            if (resp.success !== 1) throw new Error();
            setPrefList((prev) => prev.map((p) => (p.id === renamingId ? { ...p, label: name } : p)));
            setRenamingId(null);
        } catch {
            toast.error(t('entity_config.rename_failed', 'Rinomina non riuscita.'));
        }
    }

    async function deletePreference(prefId) {
        try {
            const resp = await (DataManager.deleteItem
                ? DataManager.deleteItem(ENTITY, prefId)
                : DataManager.updateItem(ENTITY, { _deleted: 1 }, prefId));
            if (resp.success !== 1) throw new Error();
            setPrefList((prev) => prev.filter((p) => p.id !== prefId));
            if (activePrefId === prefId) setActivePrefId(null);
            toast.success(t('entity_config.deleted', 'Preferenza eliminata.'));
        } catch {
            toast.error(t('entity_config.delete_failed', 'Eliminazione non riuscita.'));
        }
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    if (props === null || status === false) return null;

    const modalSize = settings.modalDefaultSize?.entityConfig || 'lg';
    const label = (col) => LanguageProvider.getLabel(entity, col);

    return (
        <>
            <Dialog open={status} onOpenChange={(open) => { if (!open) close(entityPreferences); }}>
                <DialogContent size={modalSize}>
                    <DialogHeader>
                        <DialogTitle>{t('defaults.options')} · {t('entity.' + entity)}</DialogTitle>
                        <DialogDescription className='mb-0 flex items-center gap-2'>
                            {activePref ? (
                                <>
                                    {t('entity_config.editing', 'Stai modificando')}
                                    <Badge variant='secondary'>{activePref.label || t('entity_config.unnamed', '(senza nome)')}</Badge>
                                    <button type='button' className='text-xs underline-offset-2 hover:underline' onClick={startNew}>
                                        {t('entity_config.start_new', 'parti da nuova')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Icon name='plus' size='xs' />{t('entity_config.new_preference', 'Nuova preferenza')}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogBody className='py-3'>

                        {/* Preferenze salvate */}
                        <Section
                            open={prefsOpen}
                            onToggle={() => setPrefsOpen(!prefsOpen)}
                            icon='bookmark'
                            title={t('entity_config.saved_preferences', 'Preferenze salvate')}
                            count={prefList.length}
                        >
                            {prefList.length === 0 ? (
                                <div className='px-3 py-2 text-xs text-muted-foreground'>{t('entity_config.none', 'Nessuna preferenza salvata.')}</div>
                            ) : prefList.map((p) => {
                                const isDefault = Number(p.isDefault) === 1;
                                const isActive = p.id === activePrefId;
                                return (
                                    <div key={p.id} className={'flex items-center gap-2 px-3 py-1.5 text-sm ' + (isDefault ? 'bg-success/10' : isActive ? 'bg-accent/60' : '')}>
                                        <Icon name={isDefault ? 'circle-check' : 'circle'} size='xs' className={isDefault ? 'text-success' : 'text-muted-foreground/30'} />
                                        {renamingId === p.id ? (
                                            <>
                                                <Input
                                                    size='sm'
                                                    autoFocus
                                                    value={renamingLabel}
                                                    onChange={(e) => setRenamingLabel(e.target.value)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingId(null); }}
                                                    className='h-7 flex-1'
                                                />
                                                <IconBtn icon='check' title={t('defaults.save', 'Salva')} onClick={commitRename} />
                                                <IconBtn icon='xmark' title={t('defaults.cancel', 'Annulla')} onClick={() => setRenamingId(null)} />
                                            </>
                                        ) : (
                                            <>
                                                <span className={'flex-1 truncate ' + (isDefault ? 'font-medium' : '')}>{p.label || t('entity_config.unnamed', '(senza nome)')}</span>
                                                {isDefault ? (
                                                    <span className='inline-flex h-6 items-center rounded-md bg-success px-2 text-[0.65rem] font-medium uppercase tracking-wide text-success-foreground'>
                                                        {t('entity_config.active', 'attiva')}
                                                    </span>
                                                ) : (
                                                    <Button variant='outline-success' size='sm' className='h-6 px-2 text-[0.65rem] uppercase tracking-wide' onClick={() => setDefaultPreference(p.id)}>
                                                        {t('entity_config.set_default', 'Imposta')}
                                                    </Button>
                                                )}
                                                <IconBtn icon='pen' title={t('entity_config.edit', 'Modifica')} onClick={() => loadPreference(p)} />
                                                <IconBtn icon='i-cursor' title={t('entity_config.rename', 'Rinomina')} onClick={() => { setRenamingId(p.id); setRenamingLabel(p.label || ''); }} />
                                                <IconBtn icon='trash' title={t('defaults.delete', 'Elimina')} onClick={() => deletePreference(p.id)} danger />
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </Section>

                        {/* Colonne */}
                        <div className='mt-3 grid grid-cols-1 gap-3 md:grid-cols-2'>

                            <ColumnList
                                title={t('defaults.available_columns', 'Disponibili')}
                                count={available.length}
                                actions={(
                                    <Input
                                        size='sm'
                                        type='search'
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        placeholder={t('defaults.search', 'Cerca')}
                                        className='h-7 w-32 text-xs'
                                    />
                                )}
                                onDragOver={onDragOverAvailable}
                                onDrop={onDropAvailable}
                                onDragLeave={() => setOverList(null)}
                                highlight={overList === 'available' && dragging?.source === 'selected'}
                            >
                                {available.length === 0 ? (
                                    <div className='px-3 py-6 text-center text-xs text-muted-foreground'>
                                        {allColumns.length === selected.length
                                            ? t('entity_config.all_in_use', 'Tutte le colonne sono in uso')
                                            : t('defaults.no_results', 'Nessun risultato')}
                                    </div>
                                ) : available.map((col) => (
                                    <div
                                        key={col}
                                        className='group flex cursor-grab items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/60'
                                        draggable
                                        onDragStart={(e) => onDragStartItem(e, { item: col, source: 'available', index: -1 })}
                                        onDoubleClick={() => addColumn(col)}
                                    >
                                        <span className='flex-1 truncate'>{label(col)}</span>
                                        <IconBtn icon='plus' title={t('entity_config.add', 'Aggiungi')} onClick={() => addColumn(col)} className='text-success hover:text-success' />
                                    </div>
                                ))}
                            </ColumnList>

                            <ColumnList
                                title={t('defaults.chosen_columns', 'Scelte')}
                                count={selected.length}
                                onDragOver={onDragOverSelectedList}
                                onDrop={onDropSelected}
                                onDragLeave={() => { setOverList(null); setPlaceholderIndex(null); }}
                                highlight={overList === 'selected' && dragging?.source === 'available'}
                            >
                                {selected.length === 0 && (
                                    <div className='px-3 py-6 text-center text-xs text-muted-foreground'>{t('entity_config.drop_here', 'Trascina qui le colonne da mostrare')}</div>
                                )}
                                {selected.map((col, index) => (
                                    <React.Fragment key={col}>
                                        {overList === 'selected' && placeholderIndex === index && <DropLine />}
                                        <div
                                            className='group flex cursor-grab items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent/60'
                                            draggable
                                            onDragStart={(e) => onDragStartItem(e, { item: col, source: 'selected', index })}
                                            onDragOver={(e) => onDragOverSelectedItem(e, index)}
                                        >
                                            <Icon name='grip-vertical' size='xs' className='text-muted-foreground/60' />
                                            <span className='w-4 text-right text-[0.65rem] tabular-nums text-muted-foreground'>{index + 1}</span>
                                            <span className='flex-1 truncate'>{label(col)}</span>
                                            <IconBtn icon='xmark' title={t('entity_config.remove', 'Rimuovi')} onClick={() => removeColumn(col)} danger />
                                        </div>
                                    </React.Fragment>
                                ))}
                                {overList === 'selected' && placeholderIndex === selected.length && selected.length > 0 && <DropLine />}
                            </ColumnList>
                        </div>

                        {/* Opzioni avanzate */}
                        <div className='mt-3'>
                            <Section
                                open={advancedOpen}
                                onToggle={() => setAdvancedOpen(!advancedOpen)}
                                icon='sliders'
                                title={t('entity_config.advanced', 'Opzioni avanzate')}
                            >
                                <div className='px-3 py-3'>
                                    <div className='mb-1.5 text-xs font-medium'>{t('entity_config.default_sorting', 'Ordinamento predefinito')}</div>
                                    <div className='grid grid-cols-3 gap-2'>
                                        <NativeSelect size='sm' className='col-span-2' value={sorting.field} onChange={(e) => setSorting({ ...sorting, field: e.target.value })}>
                                            {sortableColumns.map((col) => <option key={col} value={col}>{label(col)}</option>)}
                                        </NativeSelect>
                                        <NativeSelect size='sm' value={sorting.order} onChange={(e) => setSorting({ ...sorting, order: e.target.value })}>
                                            <option value='asc'>{t('entity_config.ascending', 'Crescente')}</option>
                                            <option value='desc'>{t('entity_config.descending', 'Decrescente')}</option>
                                        </NativeSelect>
                                    </div>
                                    <div className='mt-1.5 text-xs text-muted-foreground'>{t('entity_config.sorting_note', "Applicato al caricamento della lista.")}</div>
                                </div>
                            </Section>
                        </div>
                    </DialogBody>

                    <DialogFooter className='justify-between'>
                        <Button variant='ghost' size='sm' onClick={() => close(entityPreferences)}>{t('defaults.close')}</Button>
                        <div className='flex items-center gap-2'>
                            {activePref ? (
                                <>
                                    <Button variant='ghost' size='sm' onClick={openNameDialog} disabled={saving}>
                                        {t('entity_config.save_as_new', 'Salva come nuova')}
                                    </Button>
                                    <Button variant='primary' size='sm' onClick={saveChanges} disabled={saving}>
                                        {saving ? <Spinner size='sm' /> : <Icon name='check' />}{t('entity_config.save_changes', 'Salva modifiche')}
                                    </Button>
                                </>
                            ) : (
                                <Button variant='primary' size='sm' onClick={openNameDialog} disabled={saving}>
                                    <Icon name='plus' />{t('entity_config.save_as_new', 'Salva come nuova')}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Nome della nuova preferenza */}
            <Dialog open={nameDialog} onOpenChange={(open) => { if (!open) setNameDialog(false); }}>
                <DialogContent size='sm'>
                    <DialogHeader>
                        <DialogTitle>{t('entity_config.name_title', 'Nome della preferenza')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody className='py-4'>
                        <Input
                            autoFocus
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveAsNew(); }}
                            placeholder='default'
                        />
                        <div className='mt-2 text-xs text-muted-foreground'>{t('entity_config.name_note', 'La preferenza verrà salvata e applicata subito.')}</div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant='ghost' size='sm' onClick={() => setNameDialog(false)} disabled={saving}>{t('defaults.cancel', 'Annulla')}</Button>
                        <Button variant='primary' size='sm' onClick={saveAsNew} disabled={saving || !newName.trim()}>
                            {saving ? <Spinner size='sm' /> : <Icon name='check' />}{t('defaults.save', 'Salva')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

/** Blocco richiudibile: intestazione cliccabile, contenuto solo se aperto. */
function Section({ open, onToggle, icon, title, count, children }) {
    return (
        <div className='overflow-hidden rounded-lg border border-border'>
            <button
                type='button'
                onClick={onToggle}
                className='flex w-full items-center gap-2 bg-muted/40 px-3 py-2 text-left text-sm font-medium hover:bg-muted/70'
            >
                <Icon name={open ? 'chevron-down' : 'chevron-right'} size='xs' className='text-muted-foreground' />
                <Icon name={icon} size='sm' className='text-muted-foreground' />
                <span className='flex-1'>{title}</span>
                {typeof count === 'number' && <Badge variant='secondary' className='text-[0.65rem]'>{count}</Badge>}
            </button>
            {open && <div className='divide-y divide-border border-t border-border'>{children}</div>}
        </div>
    );
}

/** Colonna di elenco con intestazione, conteggio e area di drop. */
function ColumnList({ title, count, actions, highlight, children, ...dropProps }) {
    return (
        <div className={'flex flex-col overflow-hidden rounded-lg border transition-colors ' + (highlight ? 'border-primary/50 bg-primary/5' : 'border-border')}>
            <div className='flex h-10 items-center gap-2 border-b border-border bg-muted/40 px-3 text-sm font-medium'>
                <span className='flex-1'>{title}</span>
                {actions}
                <Badge variant='secondary' className='text-[0.65rem]'>{count}</Badge>
            </div>
            <div className='max-h-72 min-h-40 overflow-y-auto divide-y divide-border/60' {...dropProps}>
                {children}
            </div>
        </div>
    );
}

function DropLine() {
    return <div className='mx-3 h-0 border-t-2 border-dashed border-primary' />;
}

function IconBtn({ icon, title, onClick, disabled, danger, className }) {
    return (
        <SimpleTooltip content={title}>
            <Button
                variant='ghost'
                size='sm'
                className={'h-6 w-6 shrink-0 px-0 ' + (danger ? 'text-danger hover:text-danger ' : '') + (className || '')}
                onClick={onClick}
                disabled={disabled}
                aria-label={title}
            >
                <Icon name={icon} size='xs' />
            </Button>
        </SimpleTooltip>
    );
}
