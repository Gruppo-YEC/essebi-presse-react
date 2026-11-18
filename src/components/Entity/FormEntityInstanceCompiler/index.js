import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Spinner } from '../../ui/spinner';
import { Badge } from '../../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import { LanguageProvider } from '../../../core/language-provider';
import { ViewManager } from '../../../core/view-manager';
import { Utils } from '../../../core/utils';
import Field from '../../../components/Entity/Field';
import DeepExternalEntity from '../../../components/Fields/DeepExternalEntity';
import InstanceCompilerTopHook from '../../../config/hooks/InstanceCompilerTopHook';


const GENERAL_TAB = '__general__';

export default function FormEntityInstanceCompiler({ entity, confirmCallback, initData={}, excludedFields=[], confirmLabel=null, confirmVariant='success', confirmSize='lg' }) {

    const [data, setData] = useState({});
    const [scopeData, setScopeData] = useState({});
    const [validated, setValidated] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(GENERAL_TAB);


    useEffect(() => {
        init()
    }, [entity]);


    function initializeKeyValue(properties, key) {
        var type = properties.columns[key].input_type;
        if(type === 'externalEntity') {
            setDataKeyValue(key, '')
        }
        else if(type === 'multipleExternalEntity') {
            setDataKeyValue(key, [])
        }
        else if(type === 'deepExternalEntity') {
            setDataKeyValue(key, [])
        }
        else if(type === 'boolean') {
            if(properties.columns[key].options.default) {
                setDataKeyValue(key, properties.columns[key].options.default)
            }
            else {
                setDataKeyValue(key, false)
            }
        }
        else if(type === 'option') {
            if(properties.columns[key].options.default) {
                var v = {
                    value: properties.columns[key].options.default,
                    label: properties.columns[key].options.default
                }
                setDataKeyValue(key, v)
            }
            else {
                setDataKeyValue(key, '')
            }
        }
        else if(type === 'file') {
            setDataKeyValue(key, null)
        }
        else {
            if(properties.columns[key].options.default) {
                setDataKeyValue(key, properties.columns[key].options.default)
            }
            else {
                setDataKeyValue(key, '')
            }
            
        }
    }

    async function init(){
        setActiveTab(GENERAL_TAB)
        //init properties
        const properties = ViewManager.getEntityProperties(entity);
        const availableFields = Utils.cloneObject(ViewManager.getEditableColumns(entity));

        updateScopeData({'availableFields':availableFields, 'properties':properties});

        if(Object.keys(initData).length === 0) {
            setData({})
            availableFields.map((key, i) => {
                if(excludedFields.includes(key) === false) {
                    initializeKeyValue(properties, key)
                }
            })
        }
        else {
            setData({})
            availableFields.map((key, i) => {
                if(excludedFields.includes(key) === false) {
                    if(typeof(initData[key]) !== 'undefined' && initData[key] !== null) {
                        var type = properties.columns[key].input_type;
                        if(type === 'deepExternalEntity') {
                            if(initData[key] === null) {
                                setDataKeyValue(key, [])
                            }
                            else {
                                setDataKeyValue(key, initData[key])
                            }
                        }
                        else {
                            setDataKeyValue(key, initData[key])
                        }
                    }
                    else {
                        initializeKeyValue(properties, key)
                    }
                }
            })
            //setData(initData)
        }
    }

    function setDataKeyValue(key, value) {
        setData((prevState) => ({
            ...prevState,
            [key]: value
        }));
    }

    function updateScopeData(obj) {
        let updatedData = scopeData;
        Object.assign(updatedData, obj)
        setScopeData(updatedData)
    }

    async function handleSave() {
        setSaving(true)
        const form = document.getElementById('form-compiler-' + entity)
        setValidated(true)
        
        if (form.checkValidity() === false) {
            console.log('form is not valid')
            /* i campi validabili stanno tutti nella tab generale: se il form
               è invalido mentre si guarda una deep, si torna lì per vederli */
            setActiveTab(GENERAL_TAB)
        }
        else {
            console.log(data)
            console.log('form is valid')
            await confirmCallback(data)
        }
        setSaving(false)
    }

    function entityFieldCallback(key, value) {
        setDataKeyValue(key, value)
    }

    if(scopeData && scopeData.properties && data){

        const includedFields = scopeData.availableFields.filter((key) => excludedFields.includes(key) === false);
        const deepFields = includedFields.filter((key) => scopeData.properties.columns[key].input_type === 'deepExternalEntity');
        const mainFields = includedFields.filter((key) => scopeData.properties.columns[key].input_type !== 'deepExternalEntity');
        const hasTabs = deepFields.length > 0;

        const mainFieldsRow = (
            <div className='row'>
                {mainFields.map((key) => {
                    var type = scopeData.properties.columns[key].input_type;
                    return (
                        <Field data={data} key={key} view={scopeData} type={type} value={data[key]} fieldKey={key} entity={entity} save={entityFieldCallback} />
                    )
                })}
            </div>
        );

        const saveLabel = confirmLabel !== null ? confirmLabel : (
            hasTabs
                ? LanguageProvider.get('defaults.save') + ' — ' + LanguageProvider.get('entity.' + entity, entity)
                : LanguageProvider.get('defaults.save')
        );

        return (
            <div data-instance-compiler-entity={entity}>
                <InstanceCompilerTopHook data={data} dataId={(initData && initData.id) ? initData.id : null} setDataKeyValue={setDataKeyValue} entity={entity} />

                <form id={'form-compiler-' + entity} noValidate className={validated ? 'was-validated' : ''} onSubmit={e => { e.preventDefault() }}>
                    {hasTabs ? (
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList>
                                <TabsTrigger value={GENERAL_TAB}>
                                    {LanguageProvider.get('defaults.general_data', 'Dati generali')}
                                </TabsTrigger>
                                {deepFields.map((key) => (
                                    <TabsTrigger key={key} value={key}>
                                        {LanguageProvider.getLabel(entity, key)}
                                        <Badge variant="secondary" pill>{Array.isArray(data[key]) ? data[key].length : 0}</Badge>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* forceMount: i campi devono restare nel DOM anche quando
                                la tab non è attiva, altrimenti checkValidity() non li vede */}
                            <TabsContent value={GENERAL_TAB} forceMount className='data-[state=inactive]:hidden'>
                                {mainFieldsRow}
                            </TabsContent>

                            {deepFields.map((key) => {
                                var options = scopeData.properties.columns[key].options;
                                return (
                                    <TabsContent key={key} value={key}>
                                        <div id={entity + '_field_' + key} data-field-name={key}>
                                            <DeepExternalEntity parentEntity={entity} parentItem={data} entity={options.entity} update={entityFieldCallback} value={data[key]} externalField={options.labelField} field={key} label={''} />
                                        </div>
                                    </TabsContent>
                                )
                            })}
                        </Tabs>
                    ) : (
                        mainFieldsRow
                    )}
                </form>

                <div className={hasTabs ? 'mt-6 border-t border-border pt-4 text-left' : 'text-left'}>
                    {saving ? (
                        <Button size={confirmSize} variant={confirmVariant} disabled>
                            {saveLabel} <Spinner className="ms-1" size='sm' />
                        </Button>
                    ) : (
                        <Button size={confirmSize} variant={confirmVariant} onClick={() => handleSave()}>
                            {saveLabel}
                        </Button>
                    )}
                </div>
            </div>
        );
    }
    else {
        return (
            <div className='mx-auto mb-12 mt-12 w-full max-w-3xl px-3'>
                <div className='p-12 text-center'>
                    <Spinner variant="primary" />
                    <p className='text-primary'>{LanguageProvider.get('defaults.loading')}</p>
                </div>
            </div>
        )
    }
};