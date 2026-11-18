import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Table } from '../../ui/table';
import { Alert } from '../../ui/alert';
import { Spinner } from '../../ui/spinner';
import { Pagination, PaginationItem, PaginationFirst, PaginationPrev, PaginationNext, PaginationLast } from '../../ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { DataManager } from '../../../core/data-manager';
import { ViewManager } from '../../../core/view-manager';
import FieldPreviewSimple from '../../../components/Entity/FieldPreviewSimple';
import ModalDetails from '../../../components/Modals/ModalDetails';
import { Utils } from '../../../core/utils';
import _ from "lodash";
import SearchPro from '../../../components/Entity/SearchPro';
import { settings } from '../../../config/settings';
import Icon from '../../BodyElements/Icon';


export default function ModalList({ entity = null, searchObj = null, status, closeModal, modalSorting = null }) {

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState( (settings.configEntity && settings.configEntity[entity]) ? settings.configEntity[entity].limit : 30 );
    const [data, setData] = useState(null);
    const fields = Utils.cloneObject(ViewManager.getVisibleColumns(entity));
    const properties = Utils.cloneObject(ViewManager.getEntityProperties(entity));
    const searchableFields = Utils.cloneObject(ViewManager.getSearchableColumns(entity));
    const [defaultSearchObj, setSearchObj] = useState(searchObj ? searchObj : {
        'query': '',
        'fields': searchableFields,
        'constraints': []
    });
    const [sorting, setSorting] = useState(modalSorting ? modalSorting : { "field": 'id', "order": "desc" });


    useEffect(() => {
        if (entity !== null && status === true) {
            getData(page, limit)
        }
    }, [page, limit, entity, defaultSearchObj, status, sorting]);


    async function getData(page, limit) {
        if (defaultSearchObj === null) {
            var response = await DataManager.getItemsSimple(entity, page, limit, sorting)
        }
        else {
            let query = defaultSearchObj.query || ''
            let fields = defaultSearchObj.fields || []
            let constraints = defaultSearchObj.constraints || []
            var response = await DataManager.searchItemsSimple(entity, page, limit, sorting, query, fields, constraints)
        }
        if (response.success === 1) {
            setData(response.body);
            setTotalPages(response.pages)
        }
        else {
            console.warn(response)
        }
    }

    /* paginations */
    function goToPrevPage() {
        if (page > 1) {
            setPage(page - 1)
        }
    }
    function goToNextPage() {
        if (page < totalPages) {
            setPage(page + 1)
        }
    }
    function goToFirstPage() {
        if (page !== 1) {
            setPage(1)
        }
    }
    function goToLastPage() {
        if (page !== totalPages) {
            setPage(totalPages)
        }
    }


    function close() {
        setData(null)
        setPage(1)
        closeModal()
    }


    /* modals details */
    const [modalDetailsData, setModalDetailsData] = useState(null)
    function open(i) {
        let item = data[i]
        setModalDetailsData(item)
    }
    function closeModalDetails() {
        setModalDetailsData(null)
    }


    function search(obj) {
        if (_.isEqual(obj, searchObj)) {
            // oggetti uguali non triggero la ricerca
        }
        else {
            setPage(1)
            setSearchObj(obj)
        }
    }

    function orderBy(field) {
        var excluded = ['richText', 'markdown', 'file', 'externalEntity', 'multipleExternalEntity', 'deepExternalEntity']
        var type = properties.columns[field].input_type
        if (!excluded.includes(type)) {
            var s = { ...sorting }
            var order = s.order === 'desc' ? 'asc' : 'desc';
            setSorting({ "field": field, "order": order })
        }
    }



    if (status === true) {
        return (
            <>
                <Dialog open={status} onOpenChange={(open) => { if (!open) close() }}>
                    <DialogContent
                        size={settings.modalFullscreen && settings.modalFullscreen.list ? "fullscreen" : (settings.modalDefaultSize && settings.modalDefaultSize.list ? settings.modalDefaultSize.list : "xl")}
                        onPointerDownOutside={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('entity.' + entity)}</DialogTitle>
                        </DialogHeader>
                        <DialogBody className='min-h-[400px]'>
                            {(entity !== null && data !== null && fields !== null && properties !== null) ? (
                                <>
                                    <div className='mb-1 mt-1'>
                                        <SearchPro entity={entity} setSearchObj={search} searchObj={searchObj} />
                                    </div>

                                    <div className='data-grid-container'>
                                        <div className='table-responsive'>
                                            <Table striped hover className='mt-4 text-sm datagrid-table' data-entity-name={entity}>
                                                <thead className='text-sm'>
                                                    <tr>
                                                        {fields.map((label, j) => {
                                                            var chevron = sorting.order === 'desc' ? 'chevron-down' : 'chevron-up';
                                                            return (
                                                                <th key={j} onClick={() => orderBy(label)} data-column-name={label} className='cursor-pointer'>
                                                                    {LanguageProvider.getLabel(entity, label)}
                                                                    {sorting.field === label ? (
                                                                        <>
                                                                            <Icon name={chevron} size={'xs'} className='ms-2' />
                                                                        </>
                                                                    ) : (
                                                                        <></>
                                                                    )}
                                                                </th>
                                                            )
                                                        })}
                                                        <th style={{ width: 140 }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody className='text-sm'>
                                                    {data.map((item, i) => {
                                                        return (
                                                            <tr key={i} data-id={item.id}>
                                                                {fields.map((label, j) => {
                                                                    return (
                                                                        <td key={j}>
                                                                            <FieldPreviewSimple item={item} field={label} props={properties} entity={entity} />
                                                                        </td>
                                                                    )
                                                                })}
                                                                <td className='text-center'>
                                                                    <Button size="sm" variant='primary' onClick={() => open(i)}>Dettagli <Icon name="chevron-right" className='ms-1' /></Button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </Table>
                                        </div>
                                    </div>

                                    {data.length === 0 ? (
                                        <Alert variant='warning' className='text-sm'>Nessun risultato trovato.</Alert>
                                    ) : null}

                                </>
                            ) : (
                                <Spinner />
                            )}


                        </DialogBody>
                        <DialogFooter className='block'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                                <Pagination className='m-0'>
                                    <PaginationFirst disabled={page === 1} onClick={goToFirstPage} />
                                    <PaginationPrev disabled={page <= 1} onClick={goToPrevPage} />
                                    <PaginationItem>
                                        {page}
                                    </PaginationItem>
                                    <PaginationNext disabled={page >= totalPages} onClick={goToNextPage} />
                                    <PaginationLast disabled={page >= totalPages} onClick={goToLastPage} />
                                </Pagination>
                                <Button variant="secondary" onClick={close} className='mx-1'>
                                    {LanguageProvider.get('defaults.close')}
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>


                <ModalDetails entity={entity} props={properties} data={modalDetailsData} closeModalDetails={closeModalDetails} />
            </>
        );
    }
};
