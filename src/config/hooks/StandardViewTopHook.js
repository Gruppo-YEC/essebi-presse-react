import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataManager } from '../../core/data-manager';
import { ApiManager } from '../../core/api-manager';
import { LanguageProvider } from '../../core/language-provider';
import { Button } from '../../components/ui/button';
import Icon from '../../components/BodyElements/Icon';



export default function StandardViewTopHook({ data, entity = null, searchObj, setSearchObj}) {

    useEffect(() => {
        
    }, []);



    if (entity !== null) {
        return (
            <>
                {(() => {
                    switch(entity) {
                        case 'test': return (
                            <div className='w-full' style={{ background: 'green' }}>Test</div>
                        );
                        // Articoli: "Crea nuovo" apre l'Editor articolo vuoto al posto del form
                        // standard (il pulsante standard è nascosto in custom.css)
                        case 'item_model': return (
                            <Button asChild variant="outline-success">
                                <Link to='/page/CatalogoArticolo'><Icon name="plus" /> {LanguageProvider.get('defaults.create', 'Create')}</Link>
                            </Button>
                        );
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