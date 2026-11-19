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