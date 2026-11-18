import React, { useState, useEffect } from 'react';
import { LanguageProvider } from '../../../core/language-provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Spinner } from '../../ui/spinner';
import { DataManager } from '../../../core/data-manager';
import { CacheManager } from '../../../core/cache-manager';
import { AuthorizationManager } from '../../../core/authorization-manager';
import DataGridSelectionHook from '../../../config/hooks/DataGridSelectionHook';
import DataGridBulkEdit from '../DataGridBulkEdit';
import Icon from '../../BodyElements/Icon';


export default function DataGridSelection({ props, data, setData, entity, selectedRows, setSelectedRows, refreshData }) {


    const [showDelete, setShowDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleCloseDelete = () => setShowDelete(false);
    const handleShowDelete = () => setShowDelete(true);


    useEffect(() => {
        setSelectedRows([])
    }, [data]);


    async function deleteAll() {
        setDeleting(true)
        var temp = [...data]
        if(selectedRows.length) {
            for(var i=0; i<selectedRows.length; i++) {
                if(props.reference_entity) {
                    var response = await DataManager.deleteItemNoCache(props.reference_entity, selectedRows[i])
                }
                else {
                    var response = await DataManager.deleteItemNoCache(entity, selectedRows[i])
                }
                if(response.success === 1) {
                    for(var j=0; j<temp.length; j++) {
                        var item = temp[j]
                        if(item.id === selectedRows[i]) {
                            temp.splice(j, 1);
                        }
                    }
                }
            }
            // Invalidate cache
            if(props.reference_entity) {
                await CacheManager.invalidateEntity(props.reference_entity);
            }
            else {
                await CacheManager.invalidateEntity(entity);
            }

            //setData(temp)
            refreshData()
            setSelectedRows([])
            handleCloseDelete()
        }
        setDeleting(false)
    }

    if (selectedRows.length) {

        return (
            <>
                {/* il seleziona/deseleziona tutto vive nel checkbox
                    sull'intestazione del datagrid */}
                <div className="flex flex-wrap items-center gap-2">
                    {AuthorizationManager.checkEntityActionAuth(entity, 'delete') !== false ? (
                        <Button size="sm" variant={'outline-danger'} onClick={() => handleShowDelete()}>{LanguageProvider.get('defaults.delete_selection')} ({selectedRows.length}) <Icon name="trash" /></Button>
                    ) : (
                        <></>
                    )}
                    <DataGridBulkEdit entity={entity} referenceEntity={props.reference_entity || null} selectedRows={selectedRows} setSelectedRows={setSelectedRows} refreshData={refreshData} />
                    <DataGridSelectionHook data={data} setData={setData} entity={entity} selectedRows={selectedRows} setSelectedRows={setSelectedRows} refreshData={refreshData} />
                </div>

                <Dialog open={showDelete} onOpenChange={(open) => { if (!open) handleCloseDelete() }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('defaults.delete_selection')}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>{LanguageProvider.get('defaults.delete_selection_confirm')}</DialogBody>
                        <DialogFooter>
                            <Button variant="secondary" onClick={handleCloseDelete}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                            {deleting ? (
                                <Button variant="danger" disabled>
                                    {LanguageProvider.get('defaults.confirm')} <Spinner className="ms-1" size="sm" />
                                </Button>
                            ) : (
                                <Button variant="danger" onClick={() => deleteAll()}>
                                    {LanguageProvider.get('defaults.confirm')}
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
};
