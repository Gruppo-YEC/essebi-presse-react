import React, { useEffect, useState } from 'react';
import { DataManager } from '../../core/data-manager';


export default function DataGridTrHook({ item, props, entity = null, refreshData }) {
    
    useEffect(() => {
        
    }, []);



    if (entity !== null) {
        return (
            <>
                {(() => {
                    switch(entity) {
                        case 'test': return (
                            <tr>
                                <td colSpan={'100%'} style={{ background: 'yellow' }}>Test</td>
                            </tr>
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