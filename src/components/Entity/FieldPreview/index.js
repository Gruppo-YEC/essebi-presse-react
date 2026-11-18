import React, { useState } from 'react';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Table } from '../../ui/table';
import { LanguageProvider } from '../../../core/language-provider';
import { ResourceManager } from '../../../core/resource-manager';
import { ViewManager } from '../../../core/view-manager';
import ModalViewFile from '../../../components/Modals/ModalViewFile';
import ModalDetails from '../../../components/Modals/ModalDetails';
import moment from 'moment';
import { settings } from '../../../config/settings';
import Icon from '../../BodyElements/Icon';


export default function FieldPreview({ item, field, props, entity }) {


    // resource
    const [modalViewFileData, setModalViewFileData] = useState(null)
    function viewFile(res) {
        setModalViewFileData(res)
    }
    function closeModalViewFile() {
        setModalViewFileData(null)
    }


    // external entity details
    const [modalDetailsData, setModalDetailsData] = useState(null)
    const [modalDetailsProps, setModalDetailsProps] = useState(null)
    const [modalDetailsEntity, setModalDetailsEntity] = useState(null)
    function previewExternalDetails(el) {
        //console.warn(field, el[field], props.columns[field].options.entity)
        var e = props.columns[field].options.entity
        var p = ViewManager.getEntityProperties(e)
        setModalDetailsProps(p)
        setModalDetailsEntity(e)
        setModalDetailsData(el[field])
    }
    function closeModalDetails() {
        setModalDetailsData(null)
    }



    if (entity !== null && item !== null && props !== null) {
        if(typeof(item[field]) !== 'undefined' && item[field] !== null && props.columns[field]) {
            return (
                <>
                    {(() => {
                        switch(props.columns[field].input_type) {
                            case 'string':
                                return (
                                    <>{item[field]}</>
                                );
                            
                            case 'date':
                                return (
                                    <>{item[field] ? moment(item[field]).format('DD/MM/YYYY') : '---'}</>
                                );

                            case 'datetime':
                                return (
                                    <>{item[field] ? moment(item[field]).format('DD/MM/YYYY HH:mm') : '---'}</>
                                );
                            
                            case 'time':
                                return (
                                    <>{item[field]}</>
                                );
                            
                            case 'color':
                                return (
                                    <Input
                                        type="color"
                                        className="h-8 w-12 p-1"
                                        disabled
                                        defaultValue={item[field]}
                                    />
                                );
                            
                            case 'password':
                                return (
                                    <>*******</>
                                );
                            
                            case 'link':
                                return (
                                    <a rel="noreferrer" target="_blank" href={item[field]}>{LanguageProvider.get('defaults.open_link')}</a>
                                );

                            case 'currency':
                                var localeCurrency = settings.locale && settings.locale.currency ? settings.locale.currency : 'EUR'
                                var localeCountry = settings.locale && settings.locale.country ? settings.locale.country : 'it-IT'
                                var formattedPrice = "";
                                if(item[field]) {
                                    formattedPrice = parseFloat(item[field]).toLocaleString(localeCountry, {
                                        style: 'currency',
                                        currency: localeCurrency,
                                    });
                                }
                                
                                return (
                                    <>
                                        {formattedPrice}
                                    </>
                                );
                            
                            case 'richText':
                                return (
                                    <div dangerouslySetInnerHTML={{ __html: item[field] }}></div>
                                );

                            case 'markdown':
                                // Testo semplice: si mostra così com'è, senza
                                // interpretarlo come HTML. Il valore arriva dal
                                // database e in anteprima non va reso attivo.
                                return (
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{item[field]}</div>
                                );

                            case 'option':
                                var bg = 'secondary'
                                var opts = props.columns[field].options.options;
                                for (let i = 0; i < opts.length; i++) {
                                    if(opts[i].value == item[field].value && opts[i].bg) {
                                        bg = opts[i].bg
                                    }
                                }
                                var optionVPkey = field + '.options.' + item[field].value
                                return (
                                    <Badge variant={bg}>
                                        {LanguageProvider.getLabel(entity, optionVPkey)}
                                    </Badge>
                                );
                            
                            case 'boolean':
                                var options = props.columns[field].options;
                                if(options.trafficLightBullet && options.trafficLightBullet === true) {
                                    if(item[field] === '1' || item[field] === 1) {
                                        return (
                                            <Icon name="circle" size="lg" color='green' />
                                        )
                                    }
                                    else {
                                        return (
                                            <Icon name="circle" size="lg" color='red' />
                                        )
                                    }
                                }
                                else {
                                    if(item[field] === '1' || item[field] === 1) {
                                        return (
                                            <Badge variant='success'>
                                                {LanguageProvider.get('defaults.true')}
                                            </Badge>
                                        )
                                    }
                                    else {
                                        return (
                                            <Badge variant='danger'>
                                                {LanguageProvider.get('defaults.false')}
                                            </Badge>
                                        )
                                    }
                                }
                            
                            case 'file':
                                var validation = props.columns[field].validation;
                                if(item[field] && (validation.type === 'image' || validation.type === 'signature')) {
                                    return (
                                        <img
                                            src={ResourceManager.getFileUrl(item[field], item[field].entity)}
                                            alt="image"
                                            className='inline-block'
                                            style={{ height: 40, width: 'auto' }}
                                        />
                                    )
                                }
                                else {
                                    return (
                                        <span onClick={() => viewFile(item[field])} role='button' className='cursor-pointer text-primary hover:underline'>{LanguageProvider.get('defaults.open_file')}</span>
                                    )
                                }
                        
                            case 'externalEntity':
                                var externalEntityLabel = props.columns[field].options.labelField;
                                return (
                                    <>
                                        <span onClick={() => previewExternalDetails(item)} role='button' className='cursor-pointer text-primary hover:underline'>{item[field] && item[field][externalEntityLabel]}</span>
                                    </>
                                );
                            
                            case 'multipleExternalEntity':
                                var externalEntityLabel = props.columns[field].options.labelField;
                                if(item[field].length > 0) {
                                    return (
                                        <>
                                            {item[field].map((k, i) => {
                                                return (
                                                    <span key={i} className='inline-block my-0.5 me-1'>
                                                        <Badge variant="secondary">{k[externalEntityLabel]}</Badge>
                                                    </span>
                                                )
                                            })}
                                        </>
                                    )
                                }
                                else {
                                    return (
                                        <>0 {LanguageProvider.get('defaults.elements')}</>
                                    );
                                }
                            
                            case 'deepExternalEntity':
                                var external_entity = props.columns[field].options.entity;
                                const fields_deep = ViewManager.getVisibleColumns(external_entity)
                                const props_deep = ViewManager.getEntityProperties(external_entity)
                                var value = item[field]
                                return (
                                    <>
                                        {typeof value !== 'undefined' && value!== null && value.length > 0 && (
                                            <Table striped hover responsive className='text-sm'>
                                                <thead>
                                                    <tr>
                                                        {fields_deep.map((item, i) => {
                                                            return (
                                                                <th key={i} className='text-sm'>
                                                                    {LanguageProvider.getLabel(external_entity, item)}
                                                                </th>
                                                            )
                                                        })}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(value).map((item2, j) => {
                                                        return (
                                                            <tr key={j}>
                                                                {fields_deep.map((key, j) => {
                                                                    var source_field = props.columns[field].options.source_field
                                                                    if(key === source_field) {
                                                                        return (
                                                                            <td key={j}>
                                                                                {item[props.default_key]}
                                                                            </td>
                                                                        )
                                                                    }
                                                                    else {
                                                                        return (
                                                                            <td key={j}>
                                                                                <FieldPreview item={item2} field={key} props={props_deep} entity={external_entity} />
                                                                            </td>
                                                                        )
                                                                    }
                                                                })}
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </Table>
                                        )}
                                    </>
                                )
                            
                            default:
                                return (
                                    <>{item[field]}</>
                                );
                            
                        }
                    })()}

                    <ModalViewFile data={modalViewFileData} closeModalViewFile={closeModalViewFile} />
                    <ModalDetails entity={modalDetailsEntity} props={modalDetailsProps} data={modalDetailsData} closeModalDetails={closeModalDetails} />
                </>
            )
        }
        else {
            return (
                <></>
            )
        }
    }
    else {
        return (
            <></>
        )
    }
};