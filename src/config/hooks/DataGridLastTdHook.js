import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DataManager } from '../../core/data-manager';
import { ApiManager } from '../../core/api-manager';
import { LanguageProvider } from '../../core/language-provider';
import Icon from '../../components/BodyElements/Icon';
import { cachedPhoto, firstPhoto } from '../catalog/first-photo';

/** Elenco Articoli: miniatura della prima foto e pulsante "Editor" (pagina custom CatalogoArticolo) */
function ItemModelCell({ item }) {
    const [url, setUrl] = useState(() => cachedPhoto(item.id));
    useEffect(() => {
        let alive = true;
        firstPhoto(item.id).then((u) => { if (alive) setUrl(u); });
        return () => { alive = false; };
    }, [item.id]);
    const href = '/page/CatalogoArticolo?id=' + item.id;
    return (
        <span className='me-2 inline-flex items-center gap-2'>
            <Link to={href} title="Apri nell'editor" className='flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground'>
                {url ? <img src={url} alt='' loading='lazy' className='size-full object-cover' /> : <Icon name={url === undefined ? 'spinner' : 'image'} spin={url === undefined} />}
            </Link>
            <Button asChild variant='outline-primary' size='sm'>
                <Link to={href}>Editor</Link>
            </Button>
        </span>
    );
}



/**
 * Barra annunci: quale annuncio mostra adesso il sito. Lo chiede alla stessa API del sito
 * (/public/site_announcement), così la pill segue esattamente le sue regole (abilitato, nelle
 * date, il più recente con del testo). Una richiesta sola per tutte le righe della pagina,
 * rifatta dopo qualche secondo (es. dopo aver modificato un annuncio).
 */
let shownRequest = null;
let shownAt = 0;
function shownAnnouncementId() {
    if (!shownRequest || Date.now() - shownAt > 3000) {
        shownAt = Date.now();
        shownRequest = ApiManager.sendRequest('/public/site_announcement', {})
            .then((r) => (r && r.success === 1 && r.announcement ? Number(r.announcement.id) : null))
            .catch(() => undefined);
    }
    return shownRequest;
}

function SiteAnnouncementCell({ item }) {
    const [shownId, setShownId] = useState(undefined);
    useEffect(() => {
        let alive = true;
        shownAnnouncementId().then((id) => { if (alive) setShownId(id); });
        return () => { alive = false; };
    }, [item.id, item.lastUpdate]);
    if (shownId === undefined || shownId !== Number(item.id)) return <></>;
    return (
        <Badge variant='success' pill className='me-2' title='È la barra che il sito mostra adesso'>
            <Icon name='eye' />Attualmente visibile
        </Badge>
    );
}

export default function DataGridLastTdHook({ item, props, entity = null}) {

    useEffect(() => {
        
    }, []);



    if (entity !== null) {
        return (
            <>
                {(() => {
                    switch(entity) {
                        case 'sample': return (
                            <span>Test</span>
                        );
                        // Elenco articoli: prima foto + apertura dell'editor articolo
                        case 'item_model': return <ItemModelCell item={item} />;
                        // Barra annunci: pill sulla riga che il sito mostra adesso
                        case 'site_announcement': return <SiteAnnouncementCell item={item} />;
                        default: return (
                            <></>
                        );
                    }
                })()}
            </>
        )
    }
    else {
        return (
            <></>
        )
    }
};