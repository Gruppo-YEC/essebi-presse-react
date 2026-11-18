import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Table } from '../../components/ui/table';
import { Alert } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../components/ui/dialog';
import { DataManager } from '../../core/data-manager';
import { ApiManager } from '../../core/api-manager';
import { LanguageProvider } from '../../core/language-provider';
import { toast } from '../../components/ui/toast';
import { ViewManager } from '../../core/view-manager';
import FieldPreview from '../../components/Entity/FieldPreview';


export default function DataGridSelectionHook({ data, setData, entity = null, selectedRows, setSelectedRows }) {


    const navigate = useNavigate()
    
    useEffect(() => {
        
    }, []);


    
    if (entity !== null) {
        return (
            <>
                {(() => {
                    switch(entity) {
                        case 'test': return (
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