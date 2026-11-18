import React, { useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { SimpleTooltip } from '../../components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../components/ui/dialog';
import Icon from '../../components/BodyElements/Icon';
import { useAi } from './AiProvider';
import { ChatThread, Composer, Disclaimer } from './ChatThread';
import AiAdmin from './AiAdmin';
import { formatConversationDate } from './conversations';
import './style.css';

/**
 * Assistente AI a tutto schermo: domande in italiano sui dati del progetto,
 * su come si usa il gestionale, e azioni nell'interfaccia.
 *
 * Chi risponde e' un modello che ha davanti l'intero schema del database
 * (compresso da tables.json lato backend), un manuale d'uso del framework e
 * del progetto, e scrive da se' le SELECT che servono; il backend le valida
 * e le esegue con un utente MySQL in sola lettura. Non esiste una scrittura
 * in tutto il giro: al massimo l'assistente apre un form precompilato, e a
 * salvare e' l'utente.
 *
 * Lo stato (conversazione, storico, revisione, form aperto) sta in
 * AiProvider, condiviso con il pannello laterale (AiPanel): se l'assistente
 * porta l'utente in un'altra pagina, la chat continua nel pannello.
 *
 * Il ciclo domanda -> query -> risposta lo guida aiClient, una richiesta per
 * passo. Con "Approva le query" attivo (spento di default), ogni SELECT si
 * ferma qui in pagina: si legge il SQL esatto che verra' eseguito, lo si puo'
 * correggere o rifiutare con una motivazione che torna al modello. Le query
 * eseguite restano leggibili nel log richiudibile sotto ogni risposta.
 *
 * La pagina e' riservata ai livelli in settings.aiAssistant.levels. Il
 * controllo vero e' nel backend; quello qui evita a chi arriva per URL una
 * chat che risponde solo errori.
 */
const SIDEBAR_KEY = 'ai.sidebar';
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

/* Sul desktop la colonna parte come l'utente l'ha lasciata; sul mobile e' un
   drawer sopra la chat e parte chiusa. */
function initialSidebar() {
    if (isMobile()) return false;
    try { return localStorage.getItem(SIDEBAR_KEY) !== 'closed'; }
    catch { return true; }
}

export default function AiAssistant() {
    const ai = useAi();
    const inputRef = useRef(null);
    /* 'chat' o 'admin' (pannello utilizzo e spesa, solo per ai.admin). */
    const [view, setView] = useState('chat');
    const [sidebarOpen, setSidebarOpen] = useState(initialSidebar);
    /* 'active' | 'archived': quale elenco mostra la colonna. */
    const [listMode, setListMode] = useState('active');
    /* Conversazione in attesa di conferma per l'eliminazione. */
    const [toDelete, setToDelete] = useState(null);

    function setSidebar(open) {
        setSidebarOpen(open);
        if (!isMobile()) {
            try { localStorage.setItem(SIDEBAR_KEY, open ? 'open' : 'closed'); }
            catch { /* storage non disponibile */ }
        }
    }

    /* sul mobile il drawer si richiude da solo dopo una scelta */
    function afterChoice() {
        if (isMobile()) setSidebarOpen(false);
    }

    if (!ai || !ai.allowed) {
        return (
            <div className='mb-4 mt-4 w-full px-3'>
                <Alert variant='warning'>
                    L'assistente AI e' riservato agli amministratori.
                </Alert>
            </div>
        );
    }

    function reset() {
        ai.reset();
        setView('chat');
        afterChoice();
        setTimeout(() => inputRef.current?.focus(), 0);
    }

    function openConversation(c) {
        setView('chat');
        ai.open(c);
        afterChoice();
    }

    const currentTitle = view === 'admin' ? 'Utilizzo e spesa' : (ai.conv?.title || (ai.started ? 'Conversazione' : 'Nuova conversazione'));

    function showArchived() {
        setListMode('archived');
        ai.refreshArchived();
    }

    async function confirmDelete() {
        const c = toDelete;
        setToDelete(null);
        if (c) await ai.remove(c);
    }

    const list = listMode === 'archived' ? ai.archived : ai.history;

    return (
        <div className='ai-assistant ai-assistant-page mb-4 mt-4 flex w-full px-3'>

            {/* backdrop del drawer: esiste solo sul mobile (vedi CSS) */}
            {sidebarOpen ? <div className='ai-sidebar-backdrop' onClick={() => setSidebar(false)} /> : null}

            <aside className={'ai-sidebar' + (sidebarOpen ? ' is-open' : ' is-closed')}>
                <div className='ai-sidebar-head'>
                    <Button variant='outline-primary' className='ai-sidebar-new' onClick={reset} disabled={ai.pending || !ai.started}>
                        <Icon name='pen-to-square' />Nuova conversazione
                    </Button>
                    <SimpleTooltip content='Nascondi le conversazioni'>
                        <button type='button' className='ai-sidebar-toggle' onClick={() => setSidebar(false)} aria-label='Nascondi le conversazioni'>
                            <Icon name='angles-left' size='sm' />
                        </button>
                    </SimpleTooltip>
                </div>
                <div className='ai-sidebar-label'>
                    {listMode === 'archived' ? (
                        <button type='button' className='ai-sidebar-back' onClick={() => setListMode('active')} title='Torna alle conversazioni'>
                            <Icon name='arrow-left' size='sm' className='me-1' />Archiviate
                        </button>
                    ) : 'Conversazioni'}
                </div>
                <div className='ai-sidebar-list'>
                    {ai.historyError ? (
                        <div className='ai-sidebar-empty text-danger'>{ai.historyError}</div>
                    ) : list.length === 0 ? (
                        <div className='ai-sidebar-empty'>{listMode === 'archived' ? 'Nessuna conversazione archiviata' : 'Nessuna conversazione salvata'}</div>
                    ) : list.map((c) => (
                        <div
                            key={c.id}
                            className={'ai-sidebar-item' + (c.id === ai.conv?.id && view === 'chat' ? ' is-active' : '')}
                            onClick={() => openConversation(c)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') openConversation(c); }}
                        >
                            <div className='ai-sidebar-item-text'>
                                <div className='ai-sidebar-item-title'>{c.title}</div>
                                <div className='ai-sidebar-item-date'>{formatConversationDate(c.updatedAt)}</div>
                            </div>
                            <div className='ai-sidebar-item-actions'>
                                {listMode === 'archived' ? (
                                    <SimpleTooltip content='Ripristina'>
                                        <button type='button' className='ai-sidebar-item-btn' onClick={(e) => { e.stopPropagation(); ai.archive(c, false); }} disabled={ai.pending}>
                                            <Icon name='rotate-left' size='sm' />
                                        </button>
                                    </SimpleTooltip>
                                ) : (
                                    <SimpleTooltip content='Archivia'>
                                        <button type='button' className='ai-sidebar-item-btn' onClick={(e) => { e.stopPropagation(); ai.archive(c, true); }} disabled={ai.pending}>
                                            <Icon name='box-archive' size='sm' />
                                        </button>
                                    </SimpleTooltip>
                                )}
                                <SimpleTooltip content='Elimina'>
                                    <button type='button' className='ai-sidebar-item-btn is-delete' onClick={(e) => { e.stopPropagation(); setToDelete(c); }} disabled={ai.pending}>
                                        <Icon name='trash' size='sm' />
                                    </button>
                                </SimpleTooltip>
                            </div>
                        </div>
                    ))}
                </div>
                {/* In fondo, in linea: archivio e, per i livelli in adminLevels, utilizzo e spesa. */}
                <div className='ai-sidebar-foot'>
                    <button
                        type='button'
                        className={'ai-sidebar-admin' + (listMode === 'archived' ? ' is-active' : '')}
                        onClick={() => (listMode === 'archived' ? setListMode('active') : showArchived())}
                    >
                        <Icon name='box-archive' size='sm' />Archiviate{ai.archived.length ? ` (${ai.archived.length})` : ''}
                    </button>
                    {ai.admin ? (
                        <button
                            type='button'
                            className={'ai-sidebar-admin' + (view === 'admin' ? ' is-active' : '')}
                            onClick={() => setView(view === 'admin' ? 'chat' : 'admin')}
                        >
                            <Icon name='chart-column' size='sm' />Utilizzo e spesa
                        </button>
                    ) : null}
                </div>
            </aside>

            <Dialog open={!!toDelete} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
                <DialogContent size='sm'>
                    <DialogHeader>
                        <DialogTitle>Elimina conversazione</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className='mb-2'>Vuoi eliminare <strong>{toDelete?.title}</strong>?</p>
                        <p className='text-sm text-muted-foreground'>La conversazione sparisce per sempre. Se vuoi solo toglierla dall'elenco, usa Archivia.</p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant='secondary' onClick={() => setToDelete(null)}>Annulla</Button>
                        <Button variant='danger' onClick={confirmDelete}>Elimina</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <main className='ai-main'>
                {/* Barra sopra la chat quando la colonna e' chiusa (sempre, sul
                    mobile): riapre le conversazioni e avvia una nuova chat. */}
                {!sidebarOpen ? (
                    <div className='ai-topbar'>
                        <button type='button' className='ai-topbar-btn' onClick={() => setSidebar(true)} aria-label='Mostra le conversazioni'>
                            <Icon name='bars' size='sm' />
                            <span className='ai-topbar-label'>Conversazioni</span>
                        </button>
                        <span className='ai-topbar-title'>{currentTitle}</span>
                        <button type='button' className='ai-topbar-btn is-new' onClick={reset} disabled={ai.pending || !ai.started} aria-label='Nuova conversazione'>
                            <Icon name='pen-to-square' size='sm' />
                            <span className='ai-topbar-label'>Nuova</span>
                        </button>
                    </div>
                ) : null}
                {view === 'admin' && ai.admin ? (
                    <AiAdmin />
                ) : !ai.started ? (
                    <div className='ai-hero'>
                        <h2 className='ai-hero-title'>Su cosa lavoriamo?</h2>
                        <Composer ref={inputRef} rows={2} placeholder='Chiedi qualcosa sui tuoi dati, o come si fa' />
                        <Disclaimer />
                    </div>
                ) : (
                    <>
                        {ai.lastPage ? (
                            <div className='ai-page-bar'>
                                <SimpleTooltip content='Torna alla pagina, con il pannello aperto per continuare da li\u0027'>
                                    <button type='button' className='ai-page-link' onClick={() => ai.goToPage(ai.lastPage.route)}>
                                        <Icon name='location-dot' size='sm' className='me-1' />
                                        <span className='ai-page-label'>{ai.lastPage.label}</span>
                                        <Icon name='arrow-up-right-from-square' size='sm' className='ms-2' />
                                    </button>
                                </SimpleTooltip>
                            </div>
                        ) : null}
                        <ChatThread />
                        <div className='ai-chat-footer'>
                            <Composer ref={inputRef} rows={1} placeholder='Scrivi un messaggio' />
                            <Disclaimer />
                        </div>
                    </>
                )}
            </main>

        </div>
    );
}
