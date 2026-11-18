import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { DataManager } from '../../core/data-manager';
import { ApiManager } from '../../core/api-manager';
import { LanguageProvider } from '../../core/language-provider';



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