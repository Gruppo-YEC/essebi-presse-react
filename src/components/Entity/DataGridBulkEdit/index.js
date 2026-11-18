import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Spinner } from '../../ui/spinner';
import { Combobox } from '../../ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { DataManager } from '../../../core/data-manager';
import { CacheManager } from '../../../core/cache-manager';
import { ViewManager } from '../../../core/view-manager';
import { AuthorizationManager } from '../../../core/authorization-manager';
import { LanguageProvider } from '../../../core/language-provider';
import { toast } from '../../ui/toast';
import Field from '../Field';
import Icon from '../../BodyElements/Icon';


/* Tipi non modificabili in blocco: le relazioni multiple/deep hanno righe
   figlie proprie, e impostare la stessa password su N record non ha senso. */
const EXCLUDED_TYPES = ['multipleExternalEntity', 'deepExternalEntity', 'password'];


/**
 * Valore iniziale del campo scelto: stessa logica di initializeKeyValue in
 * FormEntityInstanceCompiler, così il campo parte come nel form "add".
 */
function initialValue(column) {
    const def = column.options ? column.options.default : undefined;
    switch (column.input_type) {
        case 'externalEntity': return '';
        case 'boolean': return def ? def : false;
        case 'option': return def ? { value: def, label: def } : '';
        case 'file': return null;
        default: return def ? def : '';
    }
}

function isEmpty(column, value) {
    if (value === null || value === undefined || value === '') return true;
    if (column.input_type === 'option') return value.value === undefined || value.value === null || value.value === '';
    return false;
}

const t = (key, fallback) => LanguageProvider.get('bulk_edit.' + key, fallback);


/**
 * Modifica massiva dei record selezionati nel datagrid: si sceglie un campo
 * con options.editable === true in tables.json (e concesso dall'authMap) e il
 * valore da assegnare, reso con il Field del framework come nel form edit.
 *
 * Stessa logica di "Elimina selezione" (DataGridSelection): un
 * updateItemNoCache per riga, quindi preUpdate/onUpdate del progetto valgono
 * anche qui, e un'unica invalidazione della cache alla fine. Nei deep
 * (reference_entity) agisce sull'entità della relazione, come la cancellazione.
 *
 * Il bottone compare solo se l'utente può fare edit sull'entità e se c'è
 * almeno un campo modificabile in blocco. Nato in yec-crm (BulkEditSelection
 * di progetto), portato nel core perché vale per ogni entità.
 */
export default function DataGridBulkEdit({ entity, referenceEntity = null, selectedRows, setSelectedRows, refreshData }) {

    const [show, setShow] = useState(false);
    const [fieldKey, setFieldKey] = useState(null);
    const [value, setValue] = useState(null);
    const [validated, setValidated] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const target = referenceEntity || entity;
    if (!target || AuthorizationManager.checkEntityActionAuth(target, 'edit') === false) return <></>;

    const properties = ViewManager.getEntityProperties(target);
    if (!properties || !properties.columns) return <></>;
    const view = { properties: properties };
    /* solo i campi con options.editable === true in tables.json, non
       options.disabled (nel form sono in sola lettura, qui non devono
       diventare modificabili), e tra questi quelli che l'authMap concede
       all'utente corrente */
    const fields = (ViewManager.getEditableColumns(target) || []).filter((key) => {
        const col = properties.columns[key];
        return col && col.options && col.options.editable === true && !col.options.disabled && EXCLUDED_TYPES.includes(col.input_type) === false;
    });
    if (fields.length === 0) return <></>;

    const column = fieldKey ? properties.columns[fieldKey] : null;
    const fieldLabel = fieldKey ? LanguageProvider.getLabel(target, fieldKey) : '';
    const fieldOptions = fields.map((key) => ({ value: key, label: LanguageProvider.getLabel(target, key) }));
    const formId = 'bulk-edit-' + target;

    const handleClose = () => { if (!saving) setShow(false) };
    const handleShow = () => { setFieldKey(null); setValue(null); setValidated(false); setConfirm(false); setShow(true) };

    function selectField(option) {
        const key = option ? option.value : null
        setFieldKey(key)
        setValue(key ? initialValue(properties.columns[key]) : null)
        setValidated(false)
    }

    /* primo step: valida il valore e apre la conferma */
    function requestConfirm() {
        if (!column) return;
        setValidated(true)
        const form = document.getElementById(formId)
        const required = column.validation && column.validation.required === true
        /* il required nativo non è affidabile su Select e DatePicker: il
           vuoto sui required si controlla anche a mano. Un option vuoto non
           è rappresentabile via API (Post.checkField lo rifiuta). */
        if ((form && form.checkValidity() === false) || (required && isEmpty(column, value))) {
            toast.error(t('required', 'Valore obbligatorio per') + ' ' + fieldLabel);
            return;
        }
        if (column.input_type === 'option' && isEmpty(column, value)) {
            toast.error(t('select_value', 'Seleziona un valore per') + ' ' + fieldLabel);
            return;
        }
        setConfirm(true)
    }

    async function updateAll() {
        setSaving(true)
        let ok = 0, ko = 0
        for (let i = 0; i < selectedRows.length; i++) {
            const r = await DataManager.updateItemNoCache(target, { [fieldKey]: value }, selectedRows[i])
            if (r && r.success === 1) ok++
            else ko++
        }
        await CacheManager.invalidateEntity(target);
        setSaving(false)
        setConfirm(false)
        setShow(false)
        if (ko === 0) toast.success(`${fieldLabel} ${t('updated_on', 'aggiornato su')} ${ok} ${t('elements', 'elementi')}`)
        else toast.error(`${t('updated', 'Aggiornati')} ${ok} ${t('elements', 'elementi')}, ${ko} ${t('not_updated', 'non aggiornati')}`)
        setSelectedRows([])
        if (refreshData) refreshData()
    }

    return (
        <>
            <Button size="sm" variant="outline-primary" onClick={handleShow}>
                {t('title', 'Modifica selezione')} ({selectedRows.length}) <Icon name="pen-to-square" />
            </Button>

            <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose() }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('title', 'Modifica selezione')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="mb-3 text-sm text-muted-foreground">
                            {t('intro_before', 'Il valore scelto verrà assegnato a tutti i')} {selectedRows.length} {t('intro_after', 'elementi selezionati.')}
                        </p>
                        <form id={formId} noValidate className={validated ? 'was-validated' : ''} onSubmit={e => { e.preventDefault() }}>
                            <div className="mb-4 field__option">
                                <Label className="text-sm">{t('field', 'Campo')}</Label>
                                <Combobox options={fieldOptions} value={fieldKey} onChange={selectField} placeholder={t('field_placeholder', 'Seleziona')} searchPlaceholder={t('field_search', 'Cerca campo...')} disabled={saving} />
                            </div>
                            {column && (
                                /* key: rimonta il Field al cambio campo, così
                                   non si porta dietro lo stato interno del precedente */
                                /* data={null}: con N righe non c'è un record padre, e
                                   il ModalPicker senza padre salta i filtri
                                   equalToParentField (equalToValue e customFilter
                                   restano). Field usa data solo come parentItem */
                                <Field key={fieldKey} type={column.input_type} fieldKey={fieldKey} value={value} entity={target} view={view} data={null} save={(k, v) => setValue(v)} noclass />
                            )}
                        </form>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={handleClose} disabled={saving}>
                            {LanguageProvider.get('defaults.close')}
                        </Button>
                        <Button variant="primary" onClick={requestConfirm} disabled={!column || saving}>
                            {LanguageProvider.get('defaults.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirm} onOpenChange={(open) => { if (!open && !saving) setConfirm(false) }}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>{t('confirm_title', 'Confermi la modifica?')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="mb-3">
                            {t('confirm_before', 'Il campo')} <strong>{fieldLabel}</strong> {t('confirm_middle', 'verrà aggiornato su')} <strong>{selectedRows.length}</strong> {t('elements', 'elementi')}.
                        </p>
                        <p className="mb-3 text-sm">
                            {t('confirm_irreversible', 'La modifica è immediata e non reversibile.')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t('confirm_note', 'Eventuali automatismi previsti nel form di compilazione standard verranno ignorati.')}
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setConfirm(false)} disabled={saving}>
                            {LanguageProvider.get('defaults.close')}
                        </Button>
                        <Button variant="danger" onClick={updateAll} disabled={saving}>
                            {t('apply', 'Applica modifica')} {saving && <Spinner className="ms-1" size="sm" />}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
