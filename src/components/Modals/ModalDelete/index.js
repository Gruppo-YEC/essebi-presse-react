import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { DataManager } from '../../../core/data-manager';
import { settings } from '../../../config/settings';


export default function ModalDelete({ entity, props, data, closeModalDelete, confirmModalDelete }) {

    const [statusModalDelete, setStatusModalDelete] = useState(false);

    useEffect(() => {
        if(data === null) {
          setStatusModalDelete(false)
        }
        else {
          setStatusModalDelete(true)
        }
      }, [data]);


    async function confirmModalDeleteFun() {
        if(props.reference_entity) {
            let response = await DataManager.deleteItem(props.reference_entity, data.id)
            if(response.success === 1) {
                confirmModalDelete(data)
            }
        }
        else {
            let response = await DataManager.deleteItem(entity, data.id)
            if(response.success === 1) {
                confirmModalDelete(data)
            }
        }
    }

    if(data !== null) {
        return (
            <>
                <Dialog open={statusModalDelete} onOpenChange={(open) => { if (!open) closeModalDelete() }}>
                    <DialogContent
                        size={settings.modalDefaultSize && settings.modalDefaultSize.delete ? settings.modalDefaultSize.delete : "md"}
                        onPointerDownOutside={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('defaults.delete_title')}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <p>{LanguageProvider.get('defaults.delete_msg')}</p>
                            <pre className='whitespace-pre-wrap rounded-md bg-muted p-3 text-sm'>
                                {data[props.default_key]} <i>id {data.id}</i>
                            </pre>
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="danger" onClick={confirmModalDeleteFun}>
                                {LanguageProvider.get('defaults.delete')}
                            </Button>
                            <Button variant="secondary" onClick={closeModalDelete}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
};
