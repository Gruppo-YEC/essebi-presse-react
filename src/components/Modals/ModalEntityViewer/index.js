import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Table } from '../../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { DataManager } from '../../../core/data-manager';
import { LanguageProvider } from '../../../core/language-provider';
import FieldPreview from '../../../components/Entity/FieldPreview';
import { settings } from '../../../config/settings';


export default function ModalEntityViewer({ item = null, entity = null, status = false, closeModal }) {

    const navigate = useNavigate()
    const excluded = ['deleted']
    const [data, setData] = useState(null)
    const [props, setProps] = useState(null)


    useEffect(() => {
        if(entity !== null && item !== null && status !== false) {
            init()
        }
    }, [status]);


    async function init() {
        console.log('init')
        var response = await DataManager.getItem(entity, item.id)
        console.log(response)
        if(response.success === 1) {
            setData(response.body[0])
            setProps(response.table)
        }
        else {

        }
    }




    if(status === true) {
        return (
            <>
                <Dialog open={status} onOpenChange={(open) => { if (!open) closeModal() }}>
                    <DialogContent
                        size={settings.modalDefaultSize && settings.modalDefaultSize.entityViewer ? settings.modalDefaultSize.entityViewer : "xl"}
                        onPointerDownOutside={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('defaults.details')} - {LanguageProvider.get('entity.'+entity)}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            {props !== null && data !== null ? (
                                <>
                                    <Table striped responsive className='border text-sm [&>tbody>tr>th]:border [&>tbody>tr>td]:border'>
                                        <tbody>
                                            {Object.keys(data).map((key, i) => {
                                                if(!excluded.includes(key)) {
                                                    return (
                                                        <tr key={i}>
                                                            <th className='bg-card text-left font-semibold'>
                                                                <span>{LanguageProvider.getLabel(entity, key)}</span>
                                                            </th>
                                                            <td>
                                                                <FieldPreview item={data} field={key} props={props} entity={entity} adv={true} />
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                            })}
                                        </tbody>
                                    </Table>
                                </>
                            ) : (
                                <></>
                            )}
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
