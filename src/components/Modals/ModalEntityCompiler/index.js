import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { LanguageProvider } from '../../../core/language-provider';
import FormEntityInstanceCompiler from '../../../components/Entity/FormEntityInstanceCompiler';
import { settings } from '../../../config/settings';


export default function ModalEntityCompiler({ entity = null, confirmCallback, initData={}, excludedFields=[], status, close }) {

    useEffect(() => {
        if(entity !== null) {

        }
    }, [entity]);


    function closeModal() {
        close()
    }

    function save(data) {
        confirmCallback(data)
    }


    if(status !== false && entity !== null) {
        return (
            <>
                <Dialog open={status} onOpenChange={(open) => { if (!open) closeModal() }}>
                    <DialogContent
                        size={settings.modalDefaultSize && settings.modalDefaultSize.entityCompiler ? settings.modalDefaultSize.entityCompiler : "xl"}
                        onPointerDownOutside={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('entity.'+entity)}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <FormEntityInstanceCompiler entity={entity} confirmCallback={save} initData={initData} excludedFields={excludedFields} />
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="secondary" onClick={closeModal}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
};
