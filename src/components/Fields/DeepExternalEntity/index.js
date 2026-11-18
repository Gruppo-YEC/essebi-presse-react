import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Table } from '../../ui/table';
import { Card, CardBody } from '../../ui/card';
import { InputGroup, InputGroupText } from '../../ui/input-group';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { AuthorizationManager } from '../../../core/authorization-manager';
import FormEntityInstanceCompiler from '../../../components/Entity/FormEntityInstanceCompiler';
import { ViewManager } from '../../../core/view-manager';
import FieldPreview from '../../../components/Entity/FieldPreview';
import { Utils } from '../../../core/utils';
import Icon from '../../BodyElements/Icon';


export default function DeepExternalEntityField({ parentEntity, parentItem, externalField, label, field, value, entity, update }) {


    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState({});
    const [index, setIndex] = useState(null);
    const props = ViewManager.getEntityProperties(entity);
    const propsParentEntity = ViewManager.getEntityProperties(parentEntity);
    /* options.visibleColumns sulla deep (facoltativa, nel tables.json
       dell'entità padre): le colonne della tabella per questo specifico
       collegamento, al posto delle visibili standard dell'entità collegata.
       Le colonne inesistenti vengono scartate. */
    let fields = ViewManager.getVisibleColumns(entity);
    const customColumns = propsParentEntity && propsParentEntity.columns && propsParentEntity.columns[field] && propsParentEntity.columns[field].options ? propsParentEntity.columns[field].options.visibleColumns : null;
    if (Array.isArray(customColumns) && customColumns.length > 0) {
        fields = customColumns.filter(c => props && props.columns && props.columns[c]);
    }



    function closeModal() {
        setShowModal(false)
        setIndex(null)
        setData({})
    }

    function openModal() {
        setShowModal(true)
    }

    async function saveElement(el) {
        if (value === null) {
            value = []
        }
        if (index !== null) {
            var tempId = value[index].id
            el.id = tempId
            value[index] = el
        }
        else {
            value.push(el)
        }
        update(field, value)
        closeModal()
    }

    function edit(item, j) {
        setData(item)
        setIndex(j)
    }

    function remove(item, j) {
        if (j > -1) {
            value.splice(j, 1);
        }
        update(field, value)
    }

    function clone(item, j) {
        var el = Utils.cloneObject(item)
        delete el.id
        value.push(el)
        update(field, value)
        setIndex(null)
        setData({})
    }

    useEffect(() => {
        if (index !== null) {
            openModal()
        }
    }, [index]);


    /** search in deep */
    const tbodyRef = useRef(null);
    const [search, setSearch] = useState('');
    useEffect(() => {
        const timeOutId = setTimeout(() => filterTableData(), 400);
        return () => clearTimeout(timeOutId);
    }, [search]);

    function filterTableData() {
        if (!tbodyRef.current) return;

        const normalized = search.trim().toLowerCase();
        Array.from(tbodyRef.current.rows).forEach(row => {
            const text = Array
                .from(row.cells)
                .map(cell => cell.textContent || '')
                .join(' ')
                .toLowerCase();
            row.style.display = text.includes(normalized) ? '' : 'none';
        });
    }


    /* voci di menu Edit/Delete ripetute nei vari rami di autorizzazione */
    const editMenuItem = (item, j) => (
        <DropdownMenuItem className='text-sm' onClick={() => edit(item, j)}>{LanguageProvider.get('defaults.edit')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="pen-to-square" /></span></DropdownMenuItem>
    )
    const deleteMenuItem = (item, j) => (
        <DropdownMenuItem className='text-sm' onClick={() => remove(item, j)}>{LanguageProvider.get('defaults.delete')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="trash" /></span></DropdownMenuItem>
    )


    return (
        <>
            <div className="field__deepExternalEntity">
                {label ? (
                    <Label className='text-sm'>{label}</Label>
                ) : null}

                {/* searchbar a sinistra, Aggiungi a destra (stesso stile di
                    Crea nuovo di StandardView, in piccolo) */}
                <div className='mb-3 flex items-center justify-between gap-2'>
                    {typeof value !== 'undefined' && value !== null && value.length > 0 ? (
                        <InputGroup style={{ width: 220 }}>
                            <Input
                                size="sm"
                                placeholder={LanguageProvider.get('defaults.search')}
                                value={search} onChange={(event) => setSearch(event.target.value)} type="text"
                            />
                            <InputGroupText className='px-2 py-1'>
                                <Icon name="magnifying-glass" />
                                {search.length > 0 ? (
                                    <span className='text-sm text-danger'>*</span>
                                ) : null}
                            </InputGroupText>
                        </InputGroup>
                    ) : (
                        <span />
                    )}

                    {
                        {
                            'true': <Button variant="outline-success" size="sm" onClick={() => openModal()}>
                                <Icon name="plus" /> {LanguageProvider.get('defaults.add')}
                            </Button>,
                            'false': <Button variant="outline-success" size="sm" disabled>
                                <Icon name="plus" /> {LanguageProvider.get('defaults.add')}
                            </Button>,
                            'group': <Button variant="outline-success" size="sm" onClick={() => openModal()}>
                                <Icon name="plus" /> {LanguageProvider.get('defaults.add')}
                            </Button>,
                            'user': <Button variant="outline-success" size="sm" onClick={() => openModal()}>
                                <Icon name="plus" /> {LanguageProvider.get('defaults.add')}
                            </Button>,
                        }[AuthorizationManager.checkEntityActionAuth(entity, 'create')]
                    }
                </div>

                {/* la tabella si vede sempre, anche vuota: colonne + riga "nessun elemento" */}
                <Card className='rounded-none'>
                        <CardBody style={{ padding: 0 }}>
                        <div className='table-responsive' style={{ overflowX: 'auto' }}>
                        <Table striped hover className='mb-0 text-sm' data-table-reference={entity + '-deepExternalTable'}>
                            <thead className='text-sm'>
                                <tr>
                                    {fields.map((item, i) => {
                                        return (
                                            <th key={i} className='text-sm'>
                                                {LanguageProvider.getLabel(entity, item)}
                                            </th>
                                        )
                                    })}
                                    <th className='head-last-td'></th>
                                </tr>
                            </thead>
                            <tbody ref={tbodyRef}>
                                {(typeof value === 'undefined' || value === null || value.length === 0) ? (
                                    <tr>
                                        <td colSpan={fields.length + 1} className='text-center text-muted-foreground'>
                                            {LanguageProvider.get('defaults.no_elements', 'Nessun elemento')}
                                        </td>
                                    </tr>
                                ) : null}
                                {(value || []).map((item, j) => {
                                    return (
                                        <tr key={j}>
                                            {fields.map((key, j) => {
                                                var source_field = propsParentEntity.columns[field].options.source_field
                                                if (key === source_field) {
                                                    return (
                                                        <td key={j} datagrid-td-column-name={key}>
                                                            {parentItem[propsParentEntity.default_key]}
                                                        </td>
                                                    )
                                                }
                                                else {
                                                    return (
                                                        <td key={j} datagrid-td-column-name={key}>
                                                            <FieldPreview item={item} field={key} props={props} entity={entity} />
                                                        </td>
                                                    )
                                                }
                                            })}
                                            <td className='text-right last-td'>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline-secondary" size="sm">
                                                            <Icon name="gear" />
                                                        </Button>
                                                    </DropdownMenuTrigger>

                                                    <DropdownMenuContent align="end">
                                                        {item.id ? (
                                                            <>
                                                                {
                                                                    {
                                                                        'true': editMenuItem(item, j),
                                                                        'false': <></>,
                                                                        'group':
                                                                            <>
                                                                                {props.authorization && item[props.authorization.groupField] && (
                                                                                    <>
                                                                                        {props.columns[props.authorization.groupField].input_type === 'number' ? (
                                                                                            <>
                                                                                                {item[props.authorization.groupField] == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && editMenuItem(item, j)}
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                {item[props.authorization.groupField].id == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && editMenuItem(item, j)}
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
                                                                                                {item[props.authorization.userField] == JSON.parse(localStorage.getItem('userInfo')).id && editMenuItem(item, j)}
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                {item[props.authorization.userField].id == JSON.parse(localStorage.getItem('userInfo')).id && editMenuItem(item, j)}
                                                                                            </>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                    }[AuthorizationManager.checkEntityActionAuth(entity, 'edit')]
                                                                }

                                                                {AuthorizationManager.checkEntityActionAuth(entity, 'create') !== false ? (
                                                                    <DropdownMenuItem className='text-sm' onClick={() => clone(item, j)}>{LanguageProvider.get('defaults.clone')} <span style={{ width: 30, textAlign: 'center' }} className='ms-auto ps-3'><Icon name="clone" /></span></DropdownMenuItem>
                                                                ) : (
                                                                    <></>
                                                                )}

                                                                {
                                                                    {
                                                                        'true': deleteMenuItem(item, j),
                                                                        'false': <></>,
                                                                        'group':
                                                                            <>
                                                                                {props.authorization && item[props.authorization.groupField] && (
                                                                                    <>
                                                                                        {props.columns[props.authorization.groupField].input_type === 'number' ? (
                                                                                            <>
                                                                                                {item[props.authorization.groupField] == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && deleteMenuItem(item, j)}
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                {item[props.authorization.groupField].id == JSON.parse(localStorage.getItem('userInfo')).idUserGroup && deleteMenuItem(item, j)}
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
                                                                                                {item[props.authorization.userField] == JSON.parse(localStorage.getItem('userInfo')).id && deleteMenuItem(item, j)}
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                {item[props.authorization.userField].id == JSON.parse(localStorage.getItem('userInfo')).id && deleteMenuItem(item, j)}
                                                                                            </>
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                    }[AuthorizationManager.checkEntityActionAuth(entity, 'delete')]
                                                                }
                                                            </>
                                                        ) : (
                                                            <>
                                                                {editMenuItem(item, j)}
                                                                {deleteMenuItem(item, j)}
                                                            </>
                                                        )}


                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </Table>
                        </div>
                        </CardBody>
                </Card>

            </div>


            <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent size="xl" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{LanguageProvider.get('defaults.edit')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <FormEntityInstanceCompiler entity={entity} confirmCallback={saveElement} initData={data} confirmLabel={LanguageProvider.get('defaults.confirm', 'Conferma')} confirmVariant="primary" confirmSize="default" />
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={closeModal}>
                            {LanguageProvider.get('defaults.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )

};
