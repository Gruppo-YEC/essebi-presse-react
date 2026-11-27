/*
 * News ed eventi del sito, tutto in una pagina (27/11/2026): /page/News (tabella posts)
 *   - senza parametri: elenco, con filtri per categoria e stato e ricerca nel titolo;
 *   - ?id=<id>: editor della news; ?id=new (più &cat=<id> per partire da una categoria): nuova news.
 * Le categorie (tabella posts_category: solo il titolo) sono una sola lista senza sottocategorie: News ed
 * Eventi. Sono solo un'etichetta (tutte le news hanno gli stessi campi) e si gestiscono
 * dal pulsante "Categorie".
 * Sul sito compaiono solo le news pubblicate con data di pubblicazione non futura.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { SwitchField } from '../../../components/ui/switch';
import { DatePicker } from '../../../components/ui/date-picker';
import { Spinner } from '../../../components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../components/ui/dialog';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';
import RichText from '../../../components/Fields/RichText';
import { DataManager } from '../../../core/data-manager';
import { AuthorizationManager } from '../../../core/authorization-manager';
import { boolOf, fileRef, fileUrl, idOf, listAll, opt, optOf, ref, removeRow, sameId, saveRow, slugify } from '../../catalog/shared';
import { ConfirmDialog, EntityDialog, IconButton, ImageField } from '../../catalog/components';

const STATUS = [{ value: 'draft', label: 'Bozza' }, { value: 'publish', label: 'Pubblicato' }];
const STATUS_FILTER = [{ value: 'all', label: 'Tutte' }, { value: 'publish', label: 'Pubblicate' }, { value: 'draft', label: 'Bozze' }];
const NEWEST = [{ field: 'publishedAt', order: 'DESC' }, { field: 'id', order: 'DESC' }];
const EXCERPT_MAX = 220;

const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Data del gestionale (DATE, a volte con l'ora) → 'YYYY-MM-DD', o '' */
const dayOf = (v) => (v ? String(v).slice(0, 10) : '');
const showDay = (v) => (v ? dayOf(v).split('-').reverse().join('/') : '');

const EMPTY = {
    title: '', slug: '', idCategory: null, publishStatus: 'draft', publishedAt: '', isFeatured: 0, cover: null,
    excerpt: '', content: '',
};

const POSTS = 'posts';
const CATEGORY = 'posts_category';
const categoryFields = [{ key: 'title', label: 'Nome', type: 'text', required: true, full: true }];

/** Segmenti a scelta singola */
function Segmented({ options, value, onChange }) {
    return (
        <div className='inline-flex flex-wrap rounded-md border bg-muted/40 p-0.5'>
            {options.map((o) => (
                <button
                    key={o.value}
                    type='button'
                    onClick={() => onChange(o.value)}
                    className={'rounded px-3 py-1 text-sm ' + (String(value) === String(o.value) ? 'bg-background font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground')}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

/** Stato di una news come lo vede il sito: bozza, programmata (data futura) o pubblicata */
function StatusBadge({ status, publishedAt }) {
    if (status !== 'publish') return <Badge variant='secondary'>Bozza</Badge>;
    if (publishedAt && dayOf(publishedAt) > today()) return <Badge variant='warning'>Dal {showDay(publishedAt)}</Badge>;
    return <Badge variant='success'>Pubblicata</Badge>;
}

export default function News() {
    const [params, setParams] = useSearchParams();
    const editing = params.get('id');
    const [categories, setCategories] = useState(null);
    const [catsOpen, setCatsOpen] = useState(false);

    async function loadCategories() {
        try {
            setCategories(await listAll(CATEGORY, { order: [{ field: 'id', order: 'ASC' }] }));
        } catch (e) {
            toast.error(e.message);
            setCategories([]);
        }
    }
    useEffect(() => { loadCategories(); }, []);

    if (categories === null) return <div className='flex justify-center py-10'><Spinner /></div>;

    const page = editing ? (
        <NewsEditor
            key={editing}
            id={editing === 'new' ? null : editing}
            startCategory={params.get('cat')}
            categories={categories}
            onOpen={(id) => setParams(id ? { id: String(id) } : {})}
            onCategories={() => setCatsOpen(true)}
        />
    ) : (
        <NewsList
            categories={categories}
            onOpen={(id, cat) => setParams(id ? { id: String(id) } : { id: 'new', ...(cat ? { cat: String(cat) } : {}) })}
            onCategories={() => setCatsOpen(true)}
        />
    );

    return (
        <div className='news-page'>
            {page}
            <CategoriesDialog open={catsOpen} onOpenChange={setCatsOpen} categories={categories} onChanged={loadCategories} />
        </div>
    );
}

/* ================================================================== elenco */

function NewsList({ categories, onOpen, onCategories }) {
    const [rows, setRows] = useState(null);
    const [category, setCategory] = useState('all');
    const [status, setStatus] = useState('all');
    const [query, setQuery] = useState('');
    const [removing, setRemoving] = useState(null);

    async function load() {
        try {
            setRows(await listAll(POSTS, { order: NEWEST }));
        } catch (e) {
            toast.error(e.message);
            setRows([]);
        }
    }
    useEffect(() => { load(); }, []);

    const catOf = (row) => categories.find((c) => sameId(c.id, idOf(row.idCategory)));
    const countIn = (catId) => (rows || []).filter((r) => catId === 'all' || sameId(idOf(r.idCategory), catId)).length;
    const categoryFilter = [
        { value: 'all', label: `Tutte (${countIn('all')})` },
        ...categories.map((c) => ({ value: c.id, label: `${c.title} (${countIn(c.id)})` })),
    ];

    const q = query.trim().toLowerCase();
    const shown = (rows || []).filter((r) =>
        (category === 'all' || sameId(idOf(r.idCategory), category)) &&
        (status === 'all' || optOf(r.publishStatus) === status) &&
        (!q || (r.title || '').toLowerCase().includes(q) || (r.slug || '').includes(q)),
    );

    return (
        <>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <h3 className='mb-0'>News ed eventi</h3>
                <div className='flex flex-wrap gap-2'>
                    <Button size='sm' variant='outline-secondary' onClick={onCategories}>
                        <Icon name='tags' className='me-2' />Categorie
                    </Button>
                    <Button size='sm' onClick={() => onOpen(null, category === 'all' ? null : category)}>
                        <Icon name='plus' className='me-2' />Nuova news
                    </Button>
                </div>
            </div>

            <Card>
                <CardBody className='flex flex-col gap-3'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Segmented options={categoryFilter} value={category} onChange={setCategory} />
                        <Segmented options={STATUS_FILTER} value={status} onChange={setStatus} />
                        <div className='ms-auto w-full sm:w-64'>
                            <Input size='sm' value={query} placeholder='Cerca nel titolo…' onChange={(e) => setQuery(e.target.value)} />
                        </div>
                    </div>

                    {rows === null ? (
                        <div className='flex justify-center py-8'><Spinner /></div>
                    ) : shown.length === 0 ? (
                        <div className='flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground'>
                            <Icon name='newspaper' size='2x' />
                            {rows.length === 0 ? 'Ancora nessuna news: creane una con "Nuova news".' : 'Nessuna news con questi filtri.'}
                        </div>
                    ) : (
                        <ul className='mb-0 flex list-none flex-col divide-y p-0'>
                            {shown.map((r) => {
                                const cat = catOf(r);
                                const cover = fileUrl(r.cover, POSTS);
                                return (
                                    <li
                                        key={r.id}
                                        className='group flex cursor-pointer items-center gap-3 py-2 hover:bg-accent/50'
                                        onClick={() => onOpen(r.id)}
                                    >
                                        <div className='flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground'>
                                            {cover ? <img src={cover} alt='' loading='lazy' className='size-full object-cover' /> : <Icon name='image' />}
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <span className='truncate font-medium'>{r.title}</span>
                                                {boolOf(r.isFeatured) && <Icon name='star' className='shrink-0 text-warning' title='In evidenza' />}
                                            </div>
                                            <div className='truncate font-mono text-xs text-muted-foreground'>/news/{r.slug}</div>
                                        </div>
                                        {cat && <Badge variant='light' className='hidden sm:inline-flex'>{cat.title}</Badge>}
                                        <span className='hidden w-24 shrink-0 text-end text-xs text-muted-foreground md:block'>{showDay(r.publishedAt)}</span>
                                        <span className='w-28 shrink-0 text-end'><StatusBadge status={optOf(r.publishStatus)} publishedAt={r.publishedAt} /></span>
                                        <span className='flex shrink-0 gap-0.5'>
                                            <IconButton icon='pen-to-square' title='Modifica' onClick={() => onOpen(r.id)} />
                                            <IconButton icon='trash' title='Elimina' danger onClick={() => setRemoving(r)} />
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardBody>
            </Card>

            <ConfirmDialog
                open={!!removing}
                onOpenChange={(o) => { if (!o) setRemoving(null); }}
                title='Eliminare la news?'
                message={removing ? `"${removing.title}" sparirà dal sito e dall'elenco.` : ''}
                onConfirm={async () => {
                    const ok = await removeRow(POSTS, removing.id);
                    if (ok) { toast.success('News eliminata'); await load(); }
                    return ok;
                }}
            />
        </>
    );
}

/* ================================================================== editor */

function NewsEditor({ id, startCategory, categories, onOpen, onCategories }) {
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(() => ({
        ...EMPTY,
        publishedAt: today(),
        idCategory: idOf(startCategory) ?? categories[0]?.id ?? null,
    }));
    const [saved, setSaved] = useState(() => (id ? null : JSON.stringify(form)));
    const [slugTouched, setSlugTouched] = useState(!!id);
    // Il testo ricrea l'editor quando si carica una news (RichText legge il valore iniziale)
    const [contentKey, setContentKey] = useState(0);
    // RichText normalizza l'HTML appena montato: quella prima versione non è una modifica
    const contentReady = useRef(!id);

    async function load() {
        const response = await DataManager.getItem(POSTS, id);
        const r = response && response.success === 1 ? (Array.isArray(response.body) ? response.body[0] : response.body) : null;
        if (!r) {
            toast.error('News non trovata');
            onOpen(null);
            return;
        }
        const f = {
            title: r.title || '', slug: r.slug || '', idCategory: idOf(r.idCategory), publishStatus: optOf(r.publishStatus) || 'draft',
            publishedAt: dayOf(r.publishedAt), isFeatured: boolOf(r.isFeatured) ? 1 : 0, cover: r.cover && r.cover.hash ? r.cover : null,
            excerpt: r.excerpt || '', content: r.content || '',
        };
        contentReady.current = false;
        setForm(f);
        setSaved(JSON.stringify(f));
        setContentKey((k) => k + 1);
    }

    useEffect(() => {
        if (!id) return;
        (async () => {
            try { await load(); } catch (e) { toast.error(e.message); } finally { setLoading(false); }
        })();
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const dirty = saved !== null && saved !== JSON.stringify(form);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    function set(key, value) {
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            if (key === 'title' && !slugTouched) next.slug = slugify(value);
            return next;
        });
    }

    function setContent(_key, html) {
        if (!contentReady.current) {
            // Prima emissione dell'editor dopo il caricamento: allinea anche lo stato "salvato"
            contentReady.current = true;
            setForm((prev) => {
                const next = { ...prev, content: html };
                setSaved((s) => (s === JSON.stringify(prev) ? JSON.stringify(next) : s));
                return next;
            });
            return;
        }
        setForm((prev) => ({ ...prev, content: html }));
    }

    function problems() {
        const out = [];
        if (!form.title.trim()) out.push('il titolo');
        if (!form.slug.trim()) out.push('lo slug');
        if (!form.idCategory) out.push('la categoria');
        if (form.publishStatus === 'publish' && !form.publishedAt) out.push('la data di pubblicazione');
        return out;
    }

    async function save() {
        const missing = problems();
        if (missing.length) {
            toast.error('Manca ' + missing.join(', '));
            return;
        }
        // La data vuota si manda come '' (il gestionale la svuota)
        const data = {
            title: form.title.trim(), slug: form.slug.trim(), idCategory: ref(form.idCategory), publishStatus: opt(form.publishStatus),
            publishedAt: form.publishedAt || '', isFeatured: form.isFeatured ? 1 : 0, cover: fileRef(form.cover),
            excerpt: form.excerpt.trim(), content: form.content,
        };
        setSaving(true);
        const savedId = await saveRow(POSTS, data, id);
        setSaving(false);
        if (!savedId) return;
        toast.success('News salvata');
        if (!id) {
            setSaved(JSON.stringify(form));
            onOpen(savedId);
        } else {
            setLoading(true);
            await load();
            setLoading(false);
        }
    }

    function leave(next) {
        if (dirty && !window.confirm('Ci sono modifiche non salvate. Vuoi lasciarle?')) return;
        next();
    }

    const categoryOptions = categories.map((c) => ({ value: c.id, label: c.title }));

    if (loading) return <div className='flex justify-center py-10'><Spinner /></div>;

    return (
        <>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                    <h3 className='mb-0 truncate'>{id ? form.title || 'News senza titolo' : 'Nuova news'}</h3>
                    {id && <StatusBadge status={JSON.parse(saved || '{}').publishStatus} publishedAt={JSON.parse(saved || '{}').publishedAt} />}
                    {dirty && <span className='shrink-0 text-xs text-warning-foreground'>Modifiche non salvate</span>}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <Button size='sm' variant='outline-secondary' onClick={() => leave(() => onOpen(null))}>
                        <Icon name='list' className='me-2' />Elenco
                    </Button>
                    <Button size='sm' disabled={saving || (!dirty && !!id)} onClick={save}>
                        <Icon name={saving ? 'spinner' : 'floppy-disk'} spin={saving} className='me-2' />Salva
                    </Button>
                </div>
            </div>

            <div className='grid gap-3 xl:grid-cols-[1fr_22rem]'>
                <div className='min-w-0'>
                    <Card>
                        <CardBody className='grid gap-4'>
                            <div className='flex flex-col gap-2'>
                                <Label htmlFor='n-title'>Titolo *</Label>
                                <Input id='n-title' value={form.title} onChange={(e) => set('title', e.target.value)} />
                            </div>
                            <div className='flex flex-col gap-2'>
                                <Label htmlFor='n-slug'>Slug *</Label>
                                <Input id='n-slug' className='font-mono text-xs' value={form.slug} onChange={(e) => { setSlugTouched(true); set('slug', e.target.value); }} />
                                <p className='mb-0 text-xs text-muted-foreground'>
                                    Indirizzo della news sul sito: /news/{form.slug || '…'}
                                    {id && ' · Non cambiarlo dopo la pubblicazione.'}
                                </p>
                            </div>
                            <div className='flex flex-col gap-2'>
                                <div className='flex items-center justify-between'>
                                    <Label htmlFor='n-excerpt'>Sommario</Label>
                                    <span className={'text-xs ' + (form.excerpt.length > EXCERPT_MAX ? 'text-danger' : 'text-muted-foreground')}>
                                        {form.excerpt.length}/{EXCERPT_MAX}
                                    </span>
                                </div>
                                <Textarea id='n-excerpt' rows={2} value={form.excerpt} placeholder="Una o due frasi per le card dell'elenco e per Google" onChange={(e) => set('excerpt', e.target.value)} />
                            </div>
                            <div className='flex flex-col gap-2'>
                                <Label>Testo</Label>
                                <RichText key={contentKey} entity={POSTS} fieldKey='content' value={form.content} update={setContent} />
                            </div>
                        </CardBody>
                    </Card>
                </div>

                <div className='flex min-w-0 flex-col gap-3'>
                    <Card>
                        <CardBody className='flex flex-col gap-4'>
                            <p className='mb-0 text-sm font-medium'>Pubblicazione</p>
                            <div className='flex flex-col gap-2'>
                                <div className='flex items-center justify-between'>
                                    <Label>Categoria *</Label>
                                    <button type='button' className='text-xs text-primary hover:underline' onClick={onCategories}>Gestisci</button>
                                </div>
                                {categoryOptions.length ? (
                                    <div><Segmented options={categoryOptions} value={form.idCategory} onChange={(v) => set('idCategory', v)} /></div>
                                ) : (
                                    <p className='mb-0 text-xs text-muted-foreground'>Nessuna categoria: creane una da "Gestisci".</p>
                                )}
                            </div>
                            <div className='flex flex-col gap-2'>
                                <Label>Stato</Label>
                                <div><Segmented options={STATUS} value={form.publishStatus} onChange={(v) => set('publishStatus', v)} /></div>
                            </div>
                            <div className='flex flex-col gap-2'>
                                <Label>Data di pubblicazione</Label>
                                <DatePicker value={form.publishedAt} onChange={(v) => set('publishedAt', v || '')} />
                                <p className='mb-0 text-xs text-muted-foreground'>Ordina le news sul sito. Se è futura, la news compare da quel giorno.</p>
                            </div>
                            <SwitchField id='n-featured' label='In evidenza' checked={!!form.isFeatured} onCheckedChange={(v) => set('isFeatured', v ? 1 : 0)} />
                        </CardBody>
                    </Card>

                    <Card>
                        <CardBody>
                            <ImageField label='Copertina' entity={POSTS} value={form.cover} onChange={(v) => set('cover', v)} />
                        </CardBody>
                    </Card>
                </div>
            </div>
        </>
    );
}

/* =============================================================== categorie */

/**
 * Categorie delle news: una lista semplice di titoli (niente sottocategorie). Matita per
 * modificare, cestino bloccato se la categoria ha delle news. Creare, modificare ed
 * eliminare seguono i permessi di posts_category (il livello 1 le vede soltanto).
 */
function CategoriesDialog({ open, onOpenChange, categories, onChanged }) {
    const [counts, setCounts] = useState({});
    const [editing, setEditing] = useState(null); // { row? }
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        if (!open) return;
        let alive = true;
        (async () => {
            const next = {};
            for (const c of categories) {
                const response = await DataManager.searchItems(POSTS, 1, 1, { field: 'id', order: 'ASC' }, '', [], [{ fieldName: 'idCategory', type: 'value', value: c.id }]);
                next[c.id] = response && response.success === 1 ? response.total ?? response.count ?? (response.body || []).length : null;
            }
            if (alive) setCounts(next);
        })();
        return () => { alive = false; };
    }, [open, categories]);

    const can = (action) => !!AuthorizationManager.getAuthMap() && !!AuthorizationManager.checkEntityActionAuth(CATEGORY, action);

    return (
        <>
            <Dialog open={open && !editing && !removing} onOpenChange={onOpenChange}>
                <DialogContent size='md'>
                    <DialogHeader>
                        <DialogTitle>Categorie delle news</DialogTitle>
                    </DialogHeader>
                    <DialogBody className='flex flex-col gap-2'>
                        <p className='mb-1 text-xs text-muted-foreground'>Una sola lista, senza sottocategorie.</p>
                        {categories.map((c) => (
                            <div key={c.id} className='flex items-center gap-2 rounded-md border px-3 py-2'>
                                <div className='min-w-0 flex-1 truncate font-medium'>{c.title || 'Senza nome'}</div>
                                <span className='text-xs text-muted-foreground'>{counts[c.id] ?? '…'} news</span>
                                {can('edit') && <IconButton icon='pen-to-square' title='Modifica' onClick={() => setEditing({ row: c })} />}
                                {can('delete') && <IconButton icon='trash' title='Elimina' danger onClick={() => setRemoving(c)} />}
                            </div>
                        ))}
                        {categories.length === 0 && <p className='mb-0 text-sm text-muted-foreground'>Nessuna categoria.</p>}
                    </DialogBody>
                    <DialogFooter>
                        {can('create') && (
                            <Button variant='outline-primary' onClick={() => setEditing({})}>
                                <Icon name='plus' className='me-2' />Nuova categoria
                            </Button>
                        )}
                        <Button variant='outline-secondary' onClick={() => onOpenChange(false)}>Chiudi</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <EntityDialog
                open={!!editing}
                onOpenChange={(o) => { if (!o) setEditing(null); }}
                title={editing?.row ? `Modifica categoria: ${editing.row.title}` : 'Nuova categoria'}
                fields={categoryFields}
                initial={editing?.row ? { title: editing.row.title || '' } : {}}
                onSave={async (values) => {
                    const savedId = await saveRow(CATEGORY, { title: values.title.trim() }, editing.row?.id);
                    if (!savedId) return false;
                    await onChanged();
                    toast.success('Categoria salvata');
                    return true;
                }}
            />

            <ConfirmDialog
                open={!!removing}
                onOpenChange={(o) => { if (!o) setRemoving(null); }}
                title={removing ? `Eliminare "${removing.title}"?` : ''}
                blocked={!!removing && counts[removing.id] !== 0}
                message={
                    !removing ? '' :
                        counts[removing.id] === null || counts[removing.id] === undefined ? 'Impossibile contare le news di questa categoria: riprova.' :
                            counts[removing.id] > 0 ? `Ci sono ${counts[removing.id]} news in questa categoria: spostale in un'altra prima di eliminarla.` :
                                'La categoria non ha news e sparirà dai filtri del sito.'
                }
                onConfirm={async () => {
                    const ok = await removeRow(CATEGORY, removing.id);
                    if (ok) { await onChanged(); toast.success('Categoria eliminata'); }
                    return ok;
                }}
            />
        </>
    );
}
