import React, { useState, useEffect } from 'react';
import { Badge } from '../../ui/badge';
import { Label } from '../../ui/label';
import { PickerBox, PickerRequiredInput } from '../../ui/picker-box';
import { ViewManager } from '../../../core/view-manager';
import { Utils } from '../../../core/utils';
import ModalPicker from '../../../components/Modals/ModalPicker';


export default function MultipleExternalEntity({ parentEntity, parentItem, externalField, label, field, value, entity, update, required }) {

    const [view, setView] = useState(null)

    useEffect(() => {
        const properties = ViewManager.getEntityProperties(entity);
        let availableFields = Utils.cloneObject(ViewManager.getEditableColumns(entity));
        /* options.visibleColumns sull'external (facoltativa, nel tables.json
           dell'entità padre): le colonne del picker per questo specifico
           collegamento, al posto di quelle standard dell'entità collegata.
           Le colonne inesistenti vengono scartate. */
        const parentProps = ViewManager.getEntityProperties(parentEntity);
        const customColumns = parentProps && parentProps.columns && parentProps.columns[field] && parentProps.columns[field].options ? parentProps.columns[field].options.visibleColumns : null;
        if (Array.isArray(customColumns) && customColumns.length > 0) {
            availableFields = customColumns.filter(c => properties && properties.columns && properties.columns[c]);
        }
        setView({'availableFields':availableFields, 'properties':properties})
    }, [entity]);


    /* modal picker */
    const [statusModalPicker, setStatusModalPicker] = useState(false)
    const [modalPickerData, setModalPickerData] = useState(null)
    const [labelPicker, setLabelPicker] = useState(null)
    const [keyPicker, setKeyPicker] = useState(null)
    const modalPickerEntity = entity

    function closeModalPicker() {
        setStatusModalPicker(false)
        setModalPickerData(null)
    }
    function openPickModal(data, label, itemEntity, key) {
        if(data === null) {
            data = []
        }
        setLabelPicker(label)
        setModalPickerData(data)
        setKeyPicker(key)
        setStatusModalPicker(true)
    }
    function saveModalPicker(key, value) {
        if (value !== null) {
            update(key, value)
        }
        setModalPickerData(null)
    }



    if(view !== null) return (
        <>

            <div className="field__externalEntity multiple">
                <Label className='text-sm'>{label}</Label>
                <br />
                <div className='relative'>
                    <PickerBox
                        icon="bars"
                        wrap
                        data-slot='picker-box'
                        data-required={required == true ? 'true' : undefined}
                        data-placeholder={typeof value !== 'undefined' && value && value.length ? undefined : ''}
                        onClick={() => openPickModal(value, externalField, entity, field)}
                        onAction={() => openPickModal(value, externalField, entity, field)}
                    >
                        {typeof value !== 'undefined' && value && value.length ? (
                            <>
                                {(value).map((item, j) => {
                                    return (
                                        <Badge key={j} variant="secondary" className="max-w-full shrink-0 overflow-hidden">
                                            <span className="truncate">{item[externalField]}</span>
                                        </Badge>
                                    )
                                })}
                            </>
                        ) : null}
                    </PickerBox>
                    {required == true ? (
                        <PickerRequiredInput value={typeof value !== 'undefined' && value && value.length ? value.length : ''} />
                    ) : null}
                </div>
            </div>


            {statusModalPicker ? (
                <ModalPicker statusModalPicker={statusModalPicker} parentEntity={parentEntity} parentItem={parentItem} view={view} selected={modalPickerData} entity={modalPickerEntity} keyPicker={keyPicker} labelPicker={labelPicker} saveModalPicker={saveModalPicker} closeModalPicker={closeModalPicker} />
            ) : (
                <></>
            )}

        </>
    )
};
