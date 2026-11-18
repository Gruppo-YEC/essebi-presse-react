import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../ui/card';
import { Alert } from '../../ui/alert';
import { Table } from '../../ui/table';
import { Button } from '../../ui/button';
import { Spinner } from '../../ui/spinner';
import { Checkbox } from '../../ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../ui/dropdown-menu';
import { LanguageProvider } from '../../../core/language-provider';
import { AuthorizationManager } from '../../../core/authorization-manager';
import { ViewManager } from '../../../core/view-manager';
import { DataManager } from '../../../core/data-manager';
import ModalDetails from '../../../components/Modals/ModalDetails';
import ModalDelete from '../../../components/Modals/ModalDelete';
import FieldPreviewSimple from '../../../components/Entity/FieldPreviewSimple';
import DataGridOptions from '../../../components/Entity/DataGridOptions';
import DataGridSelection from '../../../components/Entity/DataGridSelection';
import ColumnFilter from './ColumnFilter';
import { Utils } from '../../../core/utils';
import DataGridActionHook from '../../../components/Hooks/DataGridAction';
import { actions as configActions } from '../../../config/hooks/actions';
import DataGridTrHook from '../../../config/hooks/DataGridTrHook';
import DataGridLastTdHook from '../../../config/hooks/DataGridLastTdHook';
import DataGridTopHook from '../../../config/hooks/DataGridTopHook';
import _ from "lodash";
import Icon from '../../BodyElements/Icon';


export default function DataGrid({ data, setData, props, entity, params, changeSorting, toggleMultiSorting, invertSorting, removeSorting, searchObj, setSearchObj, refreshData, loading, total }) {

    const navigate = useNavigate();
    const [userPreferences, setUserPreferences] = useState(null);
    const [userAllPreferences, setUserAllPreferences] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);

    useEffect(() => {
        getUserPreferences()
    }, [entity]);

    async function getUserPreferences() {
        var c = [
            {
                fieldName: 'entity',
                type: 'value',
                value: entity
            }
        ]
        var response = await DataManager.searchItems('user_entity_preferences', 1, 50, { 'field': 'id', 'order': 'ASC' }, '', [], c)
        if (response.success === 1) {
            if (response.body && response.body.length) {
                var defaultObj = response.body.find(obj => obj.isDefault === 1);
                if (defaultObj) {
                    var item = defaultObj
                }
                else {
                    var item = response.body[0]
                }
                var n = JSON.parse(item.content)
                setUserPreferences(n)
                setUserAllPreferences(response.body)
                // Applica ordinamento dalla preferenza se presente
                if (n.sorting && n.sorting.field) {
                    changeSorting(n.sorting.field, n.sorting.order || 'desc');
                }
            }
            else {
                let c = Utils.cloneObject(ViewManager.getVisibleColumns(entity))
                var defaultPreferences = {
                    'columns': c
                }
                setUserPreferences(defaultPreferences)
                setUserAllPreferences(null)
            }
        }
    }

    async function updatePreferences() {
        await getUserPreferences()
    }


    //modals content
    const [modalDetailsData, setModalDetailsData] = useState(null)
    const [modalDeleteData, setModalDeleteData] = useState(null)

    /* panels */
    function edit(i) {
        if (props.reference_entity) {
            navigate('/entity/' + props.reference_entity + '/edit?id=' + data[i].id)
        }
        else {
            navigate('/entity/' + entity + '/edit?id=' + data[i].id)
        }
    }


    /* modals */
    /* open */
    function open(i) {
        let item = data[i]
        setModalDetailsData(item)
    }
    function closeModalDetails() {
        setModalDetailsData(null)
    }
    /* remove */
    function remove(i) {
        let item = data[i]
        setModalDeleteData(item)
    }
    function closeModalDelete() {
        setModalDeleteData(null)
    }
    async function confirmModalDelete(item) {
        var temp = [...data]
        const index = temp.indexOf(item);
        if (index > -1) {
            temp.splice(index, 1);
        }
        setData(temp)
        setModalDeleteData(null)
    }
    function doubleClicked(e, i) {
        // i modali aperti dalle celle (es. externalEntity) sono portal: nel DOM
        // stanno fuori dalla riga ma i loro eventi React risalgono fino al tr.
        // La preview della riga parte solo se il doppio click è davvero sulla riga.
        if (e && e.currentTarget && !e.currentTarget.contains(e.target)) return;
        open(i)
    }

    function clone(i) {
        if (props.reference_entity) {
            navigate('/entity/' + props.reference_entity + '/clone?id=' + data[i].id)
        }
        else {
            navigate('/entity/' + entity + '/clone?id=' + data[i].id)
        }
    }

    function openInNewPage(i) {
        if (props.reference_entity) {
            navigate('/entity/' + props.reference_entity + '/item?id=' + data[i].id)
        }
        else {
            navigate('/entity/' + entity + '/item?id=' + data[i].id)
        }
    }






    /* seleziona/deseleziona tutte le righe della pagina corrente */
    function handleSelectAllChange(checked) {
        if (checked === true) {
            setSelectedRows(data.map(item => item.id))
        }
        else {
            setSelectedRows([])
        }
    }

    function handleCheckboxChange(checked, item) {
        var t = [...selectedRows]
        if (checked === true) {
            t.push(item.id)
        }
        else {
            t = Utils.removeFromArray(t, item.id)
        }
        setSelectedRows(t)
        console.log(t)
    }

    function search(obj) {
        if (_.isEqual(obj, searchObj)) {
            console.log('searchObj = : non triggero la ricerca')
            // oggetti uguali non triggero la ricerca
        }
        else {
            console.log('searchObj <> : triggero la ricerca')
            setSearchObj(obj)
        }
    }


    /**
     * Se l'entità ha azioni custom in config/hooks/actions.js (DataGridRow),
     * il dropdown mostra SOLO quelle: il progetto decide tutto, incluse le
     * eventuali azioni standard, riaggiungendole come custom
     * (navigate('/entity/<e>/edit?id=' + item.id), '/clone?id=', '/item?id=').
     * Senza azioni custom restano le standard con la logica dei permessi.
     */
    const hasCustomActions = !!(configActions.DataGridRow
        && configActions.DataGridRow[entity]
        && configActions.DataGridRow[entity].length);

    /* voce di menu Edit/Delete ripetuta nei vari rami di autorizzazione */
    const editMenuItem = (i) => (
        <DropdownMenuItem className='text-sm datagrid-dropdown-edit' onClick={() => edit(i)}>{LanguageProvider.get('defaults.edit')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="pen-to-square" /></span></DropdownMenuItem>
    )
    const deleteMenuItem = (i) => (
        <DropdownMenuItem className='text-sm datagrid-dropdown-delete text-danger focus:bg-danger/10 focus:text-danger' onClick={() => remove(i)}>{LanguageProvider.get('defaults.delete')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="trash" /></span></DropdownMenuItem>
    )


    if (data && userPreferences !== null && entity) {
        return (
            <>

                {/* hook */}
                <DataGridTopHook entity={entity} params={params} data={data} setData={setData} searchObj={searchObj} setSearchObj={search} total={total} refreshData={refreshData} />

                <Card>
                    <CardBody style={{ padding: 0 }}>
                        {data ? (
                            <>
                                {/* azioni sulla selezione a tutta larghezza; caricamento e
                                    opzioni occupano solo lo spazio che serve, a destra */}
                                <div className='m-2 flex items-start gap-2'>
                                    <div className='min-w-0 flex-1'>
                                        <DataGridSelection data={data} setData={setData} props={props} entity={entity} selectedRows={selectedRows} setSelectedRows={setSelectedRows} refreshData={refreshData} />
                                    </div>
                                    <div className='flex shrink-0 items-center gap-2'>
                                        {loading === true ? (
                                            <span className='whitespace-nowrap text-sm text-muted-foreground'>
                                                {LanguageProvider.get('defaults.loading')} <Spinner className='ms-1' size='sm' variant="secondary" />
                                            </span>
                                        ) : null}
                                        <DataGridOptions data={data} props={props} entity={entity} entityPreferences={userPreferences} entityAllPreferences={userAllPreferences} updatePreferences={updatePreferences} params={params} searchObj={searchObj} refreshData={refreshData} />
                                    </div>
                                </div>

                                <div className='data-grid-container'>
                                    <div className='table-responsive'>
                                        <Table striped hover className="datagrid-table text-sm" data-entity-name={entity}>
                                            <thead className='text-sm'>
                                                <tr>
                                                    <th className='multi-select'>
                                                        <Checkbox
                                                            checked={data.length > 0 && selectedRows.length === data.length}
                                                            onCheckedChange={(checked) => handleSelectAllChange(checked === true)}
                                                            title={LanguageProvider.get('defaults.select_all')}
                                                        />
                                                    </th>
                                                    {userPreferences.columns.map((item, i) => {
                                                        if (props.columns[item]) {
                                                            return (
                                                                <th key={i} data-column-name={item}>
                                                                    <ColumnFilter
                                                                        fieldName={item}
                                                                        fieldConfig={props.columns[item]}
                                                                        entity={entity}
                                                                        params={params}
                                                                        changeSorting={changeSorting}
                                                                        toggleMultiSorting={toggleMultiSorting}
                                                                        invertSorting={invertSorting}
                                                                        removeSorting={removeSorting}
                                                                        searchObj={searchObj}
                                                                        setSearchObj={search}
                                                                    />
                                                                </th>
                                                            )
                                                        }
                                                    })}
                                                    <th className='head-last-td' colSpan={2}>{LanguageProvider.get('defaults.actions')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.map((item, i) => {
                                                    return (
                                                        <React.Fragment key={i}>
                                                            <tr onDoubleClick={(e) => doubleClicked(e, i)} data-entity={entity} data-id={item.id ? item.id : 'none'}>
                                                                <td className='multi-select'>
                                                                    <Checkbox
                                                                        checked={selectedRows.includes(item.id)}
                                                                        onCheckedChange={(checked) => handleCheckboxChange(checked === true, item)}
                                                                    />
                                                                </td>
                                                                {userPreferences.columns.map((key, j) => {
                                                                    if (props.columns[key]) {
                                                                        return (
                                                                            <td key={j} datagrid-td-column-name={key}>
                                                                                <FieldPreviewSimple item={item} field={key} props={props} entity={entity} />
                                                                            </td>
                                                                        )
                                                                    }
                                                                })}
                                                                <td className='text-right last-td' colSpan={2}>
                                                                    <table className='ms-auto'>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td>
                                                                                    <DataGridLastTdHook item={item} props={props} entity={entity} data={data} setData={setData} refreshData={refreshData} />
                                                                                </td>
                                                                                <td>
                                                                                    <DropdownMenu>
                                                                                        <DropdownMenuTrigger asChild>
                                                                                            <Button variant="outline-secondary" size="sm">
                                                                                                <Icon name="gear" />
                                                                                            </Button>
                                                                                        </DropdownMenuTrigger>

                                                                                        <DropdownMenuContent align="end">
                                                                                            {!hasCustomActions && (
                                                                                            <>
                                                                                            <DropdownMenuItem className='text-sm datagrid-dropdown-view' onClick={() => openInNewPage(i)}>{LanguageProvider.get('defaults.view')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="eye" /></span></DropdownMenuItem>
                                                                                            {
                                                                                                {
                                                                                                    'true': editMenuItem(i),
                                                                                                    'false': <></>,
                                                                                                    'group':
                                                                                                        <>
                                                                                                            {props.authorization && item[props.authorization.groupField] && (
                                                                                                                <>
                                                                                                                    {props.columns[props.authorization.groupField].input_type === 'number' ? (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.groupField] == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && editMenuItem(i)}
                                                                                                                        </>
                                                                                                                    ) : (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.groupField].id == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && editMenuItem(i)}
                                                                                                                        </>
                                                                                                                    )}
                                                                                                                </>
                                                                                                            )}
                                                                                                        </>,
                                                                                                    'user':
                                                                                                        <>
                                                                                                            {props.authorization && item[props.authorization.userField] && (
                                                                                                                <>
                                                                                                                    {props.columns[props.authorization.userField].input_type === 'number' ? (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.userField] == JSON.parse(localStorage.getItem('userInfo')).id && editMenuItem(i)}
                                                                                                                        </>
                                                                                                                    ) : (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.userField].id == JSON.parse(localStorage.getItem('userInfo')).id && editMenuItem(i)}
                                                                                                                        </>
                                                                                                                    )}
                                                                                                                </>
                                                                                                            )}
                                                                                                        </>
                                                                                                }[AuthorizationManager.checkEntityActionAuth(entity, 'edit')]
                                                                                            }

                                                                                            {AuthorizationManager.checkEntityActionAuth(entity, 'create') !== false ? (
                                                                                                <DropdownMenuItem className='text-sm datagrid-dropdown-clone' onClick={() => clone(i)}> {LanguageProvider.get('defaults.clone')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="clone" /></span></DropdownMenuItem>
                                                                                            ) : (
                                                                                                <></>
                                                                                            )}

                                                                                            {
                                                                                                {
                                                                                                    'true': deleteMenuItem(i),
                                                                                                    'false': <></>,
                                                                                                    'group':
                                                                                                        <>
                                                                                                            {props.authorization && item[props.authorization.groupField] && (
                                                                                                                <>
                                                                                                                    {props.columns[props.authorization.groupField].input_type === 'number' ? (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.groupField] == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && deleteMenuItem(i)}
                                                                                                                        </>
                                                                                                                    ) : (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.groupField].id == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && deleteMenuItem(i)}
                                                                                                                        </>
                                                                                                                    )}
                                                                                                                </>
                                                                                                            )}
                                                                                                        </>,
                                                                                                    'user':
                                                                                                        <>
                                                                                                            {props.authorization && item[props.authorization.userField] && (
                                                                                                                <>
                                                                                                                    {props.columns[props.authorization.userField].input_type === 'number' ? (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.userField] == JSON.parse(localStorage.getItem('userInfo')).id && deleteMenuItem(i)}
                                                                                                                        </>
                                                                                                                    ) : (
                                                                                                                        <>
                                                                                                                            {item[props.authorization.userField].id == JSON.parse(localStorage.getItem('userInfo')).id && deleteMenuItem(i)}
                                                                                                                        </>
                                                                                                                    )}
                                                                                                                </>
                                                                                                            )}
                                                                                                        </>
                                                                                                }[AuthorizationManager.checkEntityActionAuth(entity, 'delete')]
                                                                                            }
                                                                                            </>
                                                                                            )}

                                                                                            <DataGridActionHook entity={entity} data={item} refreshData={refreshData} />

                                                                                        </DropdownMenuContent>
                                                                                    </DropdownMenu>
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                            <DataGridTrHook item={item} props={props} entity={entity} refreshData={refreshData} />
                                                        </React.Fragment>
                                                    )
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td className='text-left' colSpan={userPreferences.columns.length + 3}>
                                                        <span className='text-xs text-muted-foreground'>{LanguageProvider.get('defaults.rows')} {data.length} {total && total > 0 ? ( <>/ {total} </>) : null }</span>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </Table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Alert variant="warning">
                                    {LanguageProvider.get('defaults.no_results')}
                                </Alert>
                            </>
                        )}
                    </CardBody>
                </Card>

                <ModalDetails entity={entity} props={props} data={modalDetailsData} closeModalDetails={closeModalDetails} entityAllPreferences={userAllPreferences} />
                <ModalDelete entity={entity} props={props} data={modalDeleteData} closeModalDelete={closeModalDelete} confirmModalDelete={confirmModalDelete} />
            </>
        );
    }
};
