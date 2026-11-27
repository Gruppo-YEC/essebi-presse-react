import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DataManager } from '../../core/data-manager';
import { ApiManager } from '../../core/api-manager';
import { LanguageProvider } from '../../core/language-provider';
import CoverFromPdf from './catalog/CoverFromPdf';



export default function InstanceCompilerTopHook({ data, dataId, entity = null, setDataKeyValue }) {

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
                        // Cataloghi: copertina generata dalla prima pagina del PDF (27/11/2026)
                        case 'catalog_file': return (
                            <CoverFromPdf data={data} setDataKeyValue={setDataKeyValue} />
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