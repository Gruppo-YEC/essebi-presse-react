import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Table } from '../../ui/table';
import { Spinner } from '../../ui/spinner';
import { Pagination, PaginationItem, PaginationFirst, PaginationPrev, PaginationNext, PaginationLast } from '../../ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { DataManager } from '../../../core/data-manager';
import { AuthorizationManager } from '../../../core/authorization-manager';
import { ViewManager } from '../../../core/view-manager';
import FormEntityInstanceCompiler from '../../../components/Entity/FormEntityInstanceCompiler';
import FieldPreviewSimple from '../../../components/Entity/FieldPreviewSimple';
import SearchPro from '../../../components/Entity/SearchPro';
import ColumnFilter from '../../../components/Entity/DataGrid/ColumnFilter';
import { Utils } from '../../../core/utils';
import _ from "lodash";
import ModalPickerTopHook from '../../../config/hooks/ModalPickerTopHook';
import { customFilters } from '../../../config/hooks/customFilters';
import { settings } from '../../../config/settings';
import Icon from '../../BodyElements/Icon';


export default function ModalPicker({ view, selected, entity, closeModalPicker, saveModalPicker, keyPicker, parentEntity, parentItem, statusModalPicker }) {

    //for external entity

    const modalRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [pickerData, setPickerData] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState((settings.configEntity && settings.configEntity[entity]) ? settings.configEntity[entity].limit : 30);
    // ordinamento iniziale: options.orderBy dell'external (se c'è), poi lo
    // cambia l'utente dal popover di colonna
    const initialSorting = (() => {
        const keyProps = ViewManager.getEntityProperties(parentEntity).columns[keyPicker]
        const orderBy = keyProps && keyProps.options ? keyProps.options.orderBy : null
        return orderBy
            ? { "field": orderBy.field ? orderBy.field : 'id', "order": orderBy.order ? orderBy.order : 'desc' }
            : { "field": 'id', "order": "desc" }
    })();
    const [tableSorting, setTableSorting] = useState(initialSorting);
    const [data, setData] = useState(null);
    const [ids, setIds] = useState([]);
    // il form di inserimento vive in un modale annidato, non in un "tab"
    const [statusModalAdd, setStatusModalAdd] = useState(false);
    const searchableFields = Utils.cloneObject(ViewManager.getSearchableColumns(entity));
    const [searchObj, setSearchObj] = useState({
        'query': '',
        'fields': searchableFields,
        'constraints': []
    });
    const labelField = ViewManager.getEntityProperties(parentEntity).columns[keyPicker].options.labelField;


    useEffect(() => {
        if (selected !== null) {
            getData(page, limit)
        }
    }, [page, limit, entity, keyPicker, searchObj, tableSorting]);

    useEffect(() => {
        if (selected === null) {
            closeModalPicker() //qui
        }
        else {
            setPickerData(selected)

            if (selected instanceof Array) {
                if (selected.length > 0) {
                    let arrayIds = arrayOfObjToArrayOfId(selected)
                    setIds(arrayIds)
                }
            }
            else {
                setIds(selected.id)
            }
        }

        return () => {
            setIds([])
        }
    }, [selected]);


    /* ordinamento dai popover di colonna (ColumnFilter): nel picker c'è un
       solo campo di ordinamento, niente multi-sort */
    const sortingParams = {
        "sortingField": tableSorting.field,
        "sortingOrder": tableSorting.order,
        "sorting": [tableSorting]
    }
    function changeSorting(field, order) {
        setPage(1)
        setTableSorting({ "field": field, "order": order })
    }
    function invertSorting(field) {
        setPage(1)
        setTableSorting({ "field": field, "order": tableSorting.order === 'desc' ? 'asc' : 'desc' })
    }
    function removeSorting() {
        setPage(1)
        setTableSorting(initialSorting)
    }


    async function getData(page, limit) {
        if (modalRef.current) {
            modalRef.current.scrollTo({
                top: 0,
                left: 0,
                behavior: "instant", // Optional if you want to skip the scrolling animation
            });
        }
        setLoading(true)
        // finally: con un errore (filtro rotto, customFilter mancante,
        // risposta inattesa) lo spinner non deve restare acceso per sempre
        try {
            //let sorting = { "field": 'id', "order": "desc" }
            var sorting = { ...tableSorting }

            // copia: i filtri fissi dell'external (options.filters) si aggiungono
            // solo alla richiesta, non ai filtri dell'utente (altrimenti
            // comparirebbero come filtri di colonna rimovibili)
            var search = [...(searchObj.constraints || [])]

            var propsParentEntity = ViewManager.getEntityProperties(parentEntity)
            var columnProps = propsParentEntity.columns[keyPicker]

            if (columnProps.options && columnProps.options.filters) {
                var filters = columnProps.options.filters
                for (let i = 0; i < filters.length; i++) {
                    var filter = filters[i]
                    if (filter.operation === 'equalToParentField' && filter.value) {
                        if (parentItem) {
                            var parentItemValue = parentItem

                            // un pezzo del percorso può mancare (es. idGoodsCategory
                            // ancora null): valore vuoto, non un'eccezione
                            var exploded = filter.value.split('.');
                            for (var j = 0; j < exploded.length; j++) {
                                var key = exploded[j];
                                parentItemValue = parentItemValue !== null && parentItemValue !== undefined ? parentItemValue[key] : undefined;
                            }

                            if (search.some(item => (item.fieldName === filter.field && item.type === "value" && item.value === parentItemValue || ''))) {
                                //già presente
                            }
                            else {
                                search.push({
                                    fieldName: filter.field,
                                    type: "value",
                                    value: parentItemValue || ''
                                })
                            }
                        }
                    }
                    if (filter.operation === 'equalToValue' && filter.value) {
                        if (search.some(item => (item.fieldName === filter.field && item.type === "value" && item.value === filter.value || ''))) {
                            //già presente
                        }
                        else {
                            search.push({
                                fieldName: filter.field,
                                type: "value",
                                value: filter.value || ''
                            })
                        }
                    }
                    if (filter.operation === 'customFilter') {
                        console.warn('customFilters', customFilters)
                        var fc = customFilters[filter.reference]()
                        if (fc) {
                            var newFilters = fc
                            for (var k = 0; k < newFilters.length; k++) {
                                var newFilter = newFilters[k]
                                if (search.some(item => (item.fieldName === newFilter.fieldName && item.type === newFilter.type && item.value === newFilter.value || ''))) {
                                    //già presente
                                }
                                else {
                                    search.push(newFilter)
                                }
                            }
                        }
                    }
                }
            }

            if (searchObj.query === '' && _.isEmpty(search)) {
                var response = await DataManager.getItemsSimple(entity, page, limit, sorting)
            }
            else {
                let query = searchObj.query || ''
                let fields = searchObj.fields || []
                let constraints = search || []
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
        catch (error) {
            console.error('ModalPicker getData:', error)
        }
        finally {
            setLoading(false)
        }
    }


    function arrayOfObjToArrayOfId(list) {
        var temp = []
        list.map((item, i) => {
            temp.push(item.id)
        });
        return temp
    }

    function addToList(item) {
        if (selected instanceof Array) {
            var temp = Utils.cloneObject(pickerData)
            temp.push(item)
            setPickerData(temp)

            var arrayIds = arrayOfObjToArrayOfId(temp)
            setIds(arrayIds)
        }
        else {
            setPickerData(item)
            setIds(item.id)
        }
    }

    function removeFromList(item) {
        if (selected instanceof Array) {
            var temp = []
            for (var i = 0; i < pickerData.length; i++) {
                if (pickerData[i].id !== item.id) {
                    temp.push(pickerData[i])
                }
            }
            setPickerData(temp)

            let arrayIds = arrayOfObjToArrayOfId(temp)
            setIds(arrayIds)
        }
        else {
            setPickerData('')
            setIds([])
        }
    }

    function addToListConfirm(item) { //double click
        if (selected instanceof Array) {
            return;
        }
        else {
            setPickerData(item)
            setIds(item.id)

            saveModalPicker(keyPicker, item)
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


    function saveModalPickerFun() {
        saveModalPicker(keyPicker, pickerData)
    }

    function closePicker() {
        closeModalPicker()
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



    // entity instance compiler
    class FormEntityInstanceCompilerManager {
        static async confirm(data) {
            console.log("Saving Form Entity Compiler...")
            console.log(data)
            console.log(view.properties)

            let savingEntity = view.properties.reference_entity ? view.properties.reference_entity : entity
            let response = await DataManager.insertItem(savingEntity, data)
            if (response.success === 1) {
                // chiudo il modale di inserimento, il picker resta aperto con
                // la lista aggiornata e il nuovo elemento selezionato
                setStatusModalAdd(false)
                if (page !== 1) {
                    setPage(1) // il cambio pagina triggera già getData
                }
                else {
                    getData(1, limit)
                }
                var t = data
                t.id = response.id
                addToList(t)
            }

        }
    }

    const handleKeyPress = (event) => {
        if (document.querySelectorAll('div[role=dialog]').length > 1 || document.activeElement.tagName === 'INPUT') {
            // more than one modal is open so enter could close them all
            // one input (maybe search) is focused
        }
        else {
            if (event.key === 'Enter') {
                console.log('enter press here! Saving modal.')
                saveModalPickerFun()
            }
        }
    }



    return (
        <>
            <Dialog open={statusModalPicker} onOpenChange={(open) => { if (!open) closePicker() }}>
                <DialogContent
                    data-entity={entity ? entity : ''}
                    className='modal-picker'
                    size={settings.modalFullscreen && settings.modalFullscreen.picker ? "fullscreen" : (settings.modalDefaultSize && settings.modalDefaultSize.picker ? settings.modalDefaultSize.picker : "xl")}
                    onKeyDown={handleKeyPress}
                    onPointerDownOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>
                            <span className='text-muted-foreground'>{LanguageProvider.get('defaults.select')} -</span> {LanguageProvider.get('entity.' + entity)}
                            {loading === true ? (
                                <span>
                                    <Spinner className='ms-3' size='sm' variant="secondary" />
                                </span>
                            ) : (
                                <span>&nbsp;</span>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody className='min-h-[400px]' ref={modalRef}>
                        <div className='mb-3 mt-1 flex items-start gap-2'>
                            <div className='min-w-0 flex-1'>
                                <SearchPro entity={entity} setSearchObj={search} autoFocus={true} searchObj={searchObj} loading={loading} />
                            </div>
                            {AuthorizationManager.checkEntityActionAuth(entity, 'create') !== false ? (
                                <Button onClick={() => setStatusModalAdd(true)} variant='outline-success' className='modal-picker-add-button shrink-0'>
                                    {LanguageProvider.get('defaults.add')} <Icon name="plus" className='ms-1' />
                                </Button>
                            ) : null}
                        </div>
                        {(selected !== null && data !== null) ?
                            (
                                <>
                                    {(pickerData && (pickerData instanceof Array) && labelField) ? (
                                        <div className='mb-4'>
                                            {pickerData.length > 0 && pickerData.map((el, j) => {
                                                return (
                                                    <Badge className='me-1' key={j} variant='secondary'>{el[labelField]} <Icon name="xmark" role='button' className='ms-1 cursor-pointer' onClick={() => removeFromList(el)} /></Badge>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <>
                                            {pickerData && labelField ? (
                                                <div className='mb-4'>
                                                    <Badge variant='secondary'>{pickerData[labelField]} <Icon name="xmark" role='button' className='ms-1 cursor-pointer' onClick={() => removeFromList(pickerData)} /></Badge>
                                                </div>
                                            ) : null}
                                        </>
                                    )}

                                    {/* hook */}
                                    <ModalPickerTopHook entity={entity} selected={selected} searchObj={searchObj} setSearchObj={search} data={data} />

                                    <div className='data-grid-container'>
                                                <div className='table-responsive'>
                                                    <Table striped hover className="datagrid-table text-sm" data-entity-name={entity}>
                                                        <thead className='text-sm'>
                                                            <tr>
                                                                {view.availableFields.map((label, j) => {
                                                                    // th vuoto, non null: il tbody rende comunque una cella
                                                                    // per ogni availableField e le colonne si sfaserebbero
                                                                    if (!view.properties.columns[label]) return <th key={j} data-column-name={label} />

                                                                    return (
                                                                        <th key={j} data-column-name={label}>
                                                                            <ColumnFilter
                                                                                fieldName={label}
                                                                                fieldConfig={view.properties.columns[label]}
                                                                                entity={entity}
                                                                                params={sortingParams}
                                                                                changeSorting={changeSorting}
                                                                                invertSorting={invertSorting}
                                                                                removeSorting={removeSorting}
                                                                                searchObj={searchObj}
                                                                                setSearchObj={search}
                                                                            />
                                                                        </th>
                                                                    )
                                                                })}
                                                            </tr>
                                                        </thead>
                                                        <tbody className='text-sm'>
                                                            {data.map((item, i) => {
                                                                if ((ids instanceof Array && ids.includes(item.id)) || ids === item.id) {
                                                                    return (
                                                                        <tr key={i} data-id={item.id} className='row-selected' onClick={() => removeFromList(item)}>
                                                                            {view.availableFields.map((label, j) => {
                                                                                return (
                                                                                    <td key={j} datagrid-td-column-name={label} style={{ backgroundColor: 'rgb(144 212 173)' }}>
                                                                                        <FieldPreviewSimple item={item} field={label} props={view.properties} entity={entity} />
                                                                                    </td>
                                                                                )
                                                                            })}
                                                                        </tr>
                                                                    )
                                                                }
                                                                else {
                                                                    return (
                                                                        <tr key={i} data-id={item.id} onClick={() => addToList(item)} onDoubleClick={() => addToListConfirm(item)}>
                                                                            {view.availableFields.map((label, j) => {
                                                                                return (
                                                                                    <td key={j} datagrid-td-column-name={label}>
                                                                                        <FieldPreviewSimple item={item} field={label} props={view.properties} entity={entity} />
                                                                                    </td>
                                                                                )
                                                                            })}
                                                                        </tr>
                                                                    )
                                                                }
                                                            })}
                                                        </tbody>
                                                    </Table>
                                                </div>
                                            </div>
                                </>
                            ) : null}
                    </DialogBody>
                    <DialogFooter className='block'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                            <div className='my-1'>
                                <Pagination className='m-0'>
                                    <PaginationFirst disabled={page === 1} onClick={goToFirstPage} />
                                    <PaginationPrev disabled={page <= 1} onClick={goToPrevPage} />
                                    <PaginationItem>
                                        {page}
                                    </PaginationItem>
                                    <PaginationNext disabled={page >= totalPages} onClick={goToNextPage} />
                                    <PaginationLast disabled={page >= totalPages} onClick={goToLastPage} />
                                </Pagination>
                            </div>
                            <div className='my-1 text-right'>
                                <Button variant="primary" onClick={saveModalPickerFun} className='mx-1'>
                                    {LanguageProvider.get('defaults.save')}
                                </Button>
                                <Button variant="secondary" onClick={closePicker} className='mx-1'>
                                    {LanguageProvider.get('defaults.close')}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* modale annidato di inserimento: al salvataggio la lista del
                picker si ricarica e il nuovo elemento risulta selezionato */}
            {statusModalAdd ? (
                <Dialog open={statusModalAdd} onOpenChange={(open) => { if (!open) setStatusModalAdd(false) }}>
                    <DialogContent
                        size={settings.modalDefaultSize && settings.modalDefaultSize.picker ? settings.modalDefaultSize.picker : "xl"}
                        onPointerDownOutside={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                <span className='text-muted-foreground'>{LanguageProvider.get('defaults.add')} -</span> {LanguageProvider.get('entity.' + entity)}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            {AuthorizationManager.checkEntityActionAuth(entity, 'create') !== false ? (
                                <FormEntityInstanceCompiler entity={view.properties.reference_entity ? view.properties.reference_entity : entity} confirmCallback={FormEntityInstanceCompilerManager.confirm} />
                            ) : null}
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setStatusModalAdd(false)}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : null}
        </>
    );
};
