import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataManager } from '../../core/data-manager';
import { ApiManager } from '../../core/api-manager';
import { LanguageProvider } from '../../core/language-provider';



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