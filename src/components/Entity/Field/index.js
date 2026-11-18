import React from 'react';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select as NativeSelect } from '../../ui/select';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/select-dropdown';
import { DatePicker } from '../../ui/date-picker';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { LanguageProvider } from '../../../core/language-provider';
import FieldTooltip from '../../../components/Entity/FieldTooltip';
import FileField from '../../../components/Fields/File';
import ExternalEntity from '../../../components/Fields/ExternalEntity';
import MultipleExternalEntity from '../../../components/Fields/MultipleExternalEntity';
import DeepExternalEntity from '../../../components/Fields/DeepExternalEntity';
import RichText from '../../../components/Fields/RichText';
import Cropper from '../../../components/Fields/Cropper';
import PhoneInput from '../../../components/Fields/PhoneInput';
import CurrencyInput from '../../../components/Fields/CurrencyInput';
import AddressInput from '../../../components/Fields/AddressInput';
import Signature from '../../../components/Fields/Signature';
import CodeEditor from '../../../components/Fields/CodeEditor';
import Markdown from '../../../components/Fields/Markdown';


export default function Field({ type, fieldKey, value = null, entity, view, save, data, noclass = false }) {


    if (entity !== null) {

        return (
            <>

                {view.properties.columns[fieldKey].options && view.properties.columns[fieldKey].options.isNewLine ? (
                    <>
                        <div className='isNewLine-field' style={{flexBasis: 'calc(100% - 1.5rem)', borderTop: '0.5px solid lightgray', marginTop: 20, marginBottom: 20, marginLeft: '.75rem', marginRight: '.75rem'}}></div>
                    </>
                ) : (
                    <></>
                )}

                {(() => {

                    var idField = entity + "_field_" + fieldKey;
                    /* default: massimo 4 campi per riga — con 6 diventano troppo
                       stretti, soprattutto sui monitor dei portatili */
                    var className = "mb-4 col-sm-12 col-md-6 col-lg-4 col-xl-3";
                    if(view.properties.columns[fieldKey].options && view.properties.columns[fieldKey].options.className) {
                        className = view.properties.columns[fieldKey].options.className
                    }
                    if(noclass === true) {
                        className = ""
                    }
                    var fieldClassName = "field__" + type;
                    var label = LanguageProvider.getLabel(entity, fieldKey);
                    if(view.properties.columns[fieldKey].validation) {
                        if(view.properties.columns[fieldKey].validation.required === true) {
                            label = label + " *"
                        }
                    }

                    switch (type) {
                        case 'string': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                        type="text"
                                        value={value !== null ? value : ''}
                                        required={view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        maxLength={view.properties.columns[fieldKey].validation.maxLength}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                    />
                                </div>
                            </div>
                        );

                        case 'text': return (
                            <div className={noclass ? "" : "mb-4 col-sm-12 col-md-6 col-lg-4 col-xl-4 col-xxl-4"} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Textarea
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                        rows={3}
                                        value={value !== null ? value : ''}
                                        required={view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        maxLength={view.properties.columns[fieldKey].validation.maxLength}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                    />
                                </div>
                            </div>
                        );

                        case 'phone': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <PhoneInput value={value} entity={entity} fieldKey={fieldKey} update={save} />
                                </div>
                            </div>
                        );

                        case 'address': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <AddressInput value={value} entity={entity} fieldKey={fieldKey} update={save} view={view} />
                                </div>
                            </div>
                        );

                        case 'password': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        type="password"
                                        value={value}
                                        required={view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                    />
                                </div>
                            </div>
                        );

                        case 'date': {
                            return (
                                <div className={className} id={idField} data-field-name={fieldKey}>
                                    <div className={fieldClassName}>
                                        <Label className='text-sm'>
                                            {label}
                                            <FieldTooltip view={view} fieldKey={fieldKey} />
                                        </Label>
                                        <DatePicker
                                            value={value}
                                            required={view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false}
                                            onChange={(v) => save(fieldKey, v)}
                                            disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                        />
                                    </div>
                                </div>
                            )
                        };

                        case 'time': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        type="time"
                                        value={value}
                                        required={view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                    />
                                </div>
                            </div>
                        );

                        case 'datetime': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>{label}</Label>
                                    <Input
                                        type="datetime-local"
                                        value={value}
                                        required={view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                    />
                                </div>
                            </div>
                        );

                        case 'number': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        type="number"
                                        value={value}
                                        required={view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                        min={view.properties.columns[fieldKey].validation.min ? view.properties.columns[fieldKey].validation.min : null}
                                        max={view.properties.columns[fieldKey].validation.max ? view.properties.columns[fieldKey].validation.max : null}
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                    />
                                </div>
                            </div>
                        );

                        case 'float': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={value}
                                        required={view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                        min={view.properties.columns[fieldKey].validation.min ? view.properties.columns[fieldKey].validation.min : null}
                                        max={view.properties.columns[fieldKey].validation.max ? view.properties.columns[fieldKey].validation.max : null}
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                    />
                                </div>
                            </div>
                        );

                        case 'currency': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <CurrencyInput value={value} entity={entity} fieldKey={fieldKey} update={save} view={view} />
                                </div>
                            </div>
                        );

                        case 'color': return (
                            <div className={className} id={idField}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        type="color"
                                        className="h-10 w-16 cursor-pointer p-1"
                                        value={value}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                    />
                                </div>
                            </div>
                        );

                        case 'boolean': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <div>
                                        <Switch
                                            onCheckedChange={(checked) => save(fieldKey, + checked)}
                                            checked={!!parseInt(value)}
                                            disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                        />
                                    </div>
                                </div>
                            </div>
                        );

                        case 'email': return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                        type="email"
                                        pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                                        value={value !== null ? value : ''}
                                        required={view.properties.columns[fieldKey].validation.required === true ? true : false}
                                        maxLength={view.properties.columns[fieldKey].validation.maxLength}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                    />
                                </div>
                            </div>
                        );

                        case 'externalEntity': {
                            let field = view.properties.columns[fieldKey].options.labelField;
                            let itemEntity = view.properties.columns[fieldKey].options.entity;
                            var required = view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false

                            return (
                                <div className={className} id={idField} data-field-name={fieldKey}>
                                    <ExternalEntity parentEntity={entity} parentItem={data} entity={itemEntity} update={save} value={value} externalField={field} field={fieldKey} label={label} required={required} />
                                </div>
                            )
                        }

                        case 'multipleExternalEntity': {
                            let field = view.properties.columns[fieldKey].options.labelField;
                            let itemEntity = view.properties.columns[fieldKey].options.entity;
                            var required = view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false

                            return (
                                <div className={className} id={idField} data-field-name={fieldKey}>
                                    <MultipleExternalEntity parentEntity={entity} parentItem={data} entity={itemEntity} update={save} value={value} externalField={field} field={fieldKey} label={label} required={required} />
                                </div>
                            )
                        }

                        case 'deepExternalEntity': {
                            let field = view.properties.columns[fieldKey].options.labelField;
                            let itemEntity = view.properties.columns[fieldKey].options.entity;

                            return (
                                <div className="mb-4 col-sm-12 col-md-12" id={idField} data-field-name={fieldKey}>
                                    <DeepExternalEntity parentEntity={entity} parentItem={data} entity={itemEntity} update={save} value={value} externalField={field} field={fieldKey} label={label} />
                                </div>
                            )
                        }

                        case 'option': {
                            var options = view.properties.columns[fieldKey].options.options;
                            /**
                             * Radix vieta le SelectItem con value vuoto, quindi la voce
                             * "Seleziona" (che svuota il campo) usa una sentinella
                             * rimappata a '' nel salvataggio. Il value '' sul Root
                             * mostra il placeholder e lascia invalida la select nativa
                             * nascosta, così checkValidity() blocca i required vuoti.
                             */
                            const EMPTY_OPTION = '__CKD_EMPTY__';
                            return (
                                <div className={className} id={idField} data-field-name={fieldKey}>
                                    <div className={fieldClassName}>
                                        <Label className='text-sm'>
                                            {label}
                                            <FieldTooltip view={view} fieldKey={fieldKey} />
                                        </Label>
                                        <Select
                                            required={view.properties.columns[fieldKey].validation && view.properties.columns[fieldKey].validation.required === true ? true : false}
                                            onValueChange={(v) => { const val = v === EMPTY_OPTION ? '' : v; save(fieldKey, {'value': val, 'label': val}) }}
                                            value={value !== null && value !== undefined && value.value !== undefined && value.value !== null && value.value !== '' ? String(value.value) : ''} /* !== e non falsy: 0 è un valore valido (es. livello admin) */
                                            disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder='Seleziona' />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={EMPTY_OPTION} className='text-muted-foreground'>Seleziona</SelectItem>
                                                {options.map((option, w) => {
                                                    var optionVPkey = fieldKey + '.options.' + option.value
                                                    return (
                                                        <SelectItem key={w} value={String(option.value)}>{LanguageProvider.getLabel(entity, optionVPkey)}</SelectItem>
                                                    )
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )
                        };

                        case 'richText': {
                            return (
                                <div className="mb-4 col-sm-12 col-md-12" id={idField} data-field-name={fieldKey}>
                                    <div className={fieldClassName}>
                                        <Label className='text-sm'>
                                            {label}
                                            <FieldTooltip view={view} fieldKey={fieldKey} />
                                        </Label>
                                        <RichText value={value} entity={entity} fieldKey={fieldKey} update={save} />
                                    </div>
                                </div>
                            )
                        };

                        case 'markdown': {
                            let options = view.properties.columns[fieldKey].options;
                            return (
                                <div className="mb-4 col-sm-12 col-md-12" id={idField} data-field-name={fieldKey}>
                                    <div className={fieldClassName}>
                                        <Label className='text-sm'>
                                            {label}
                                            <FieldTooltip view={view} fieldKey={fieldKey} />
                                        </Label>
                                        <Markdown value={value} entity={entity} fieldKey={fieldKey} update={save} options={options} />
                                    </div>
                                </div>
                            )
                        };

                        case 'code': {
                            let options = view.properties.columns[fieldKey].options;
                            return (
                                <div className="mb-4 col-sm-12 col-md-12" id={idField} data-field-name={fieldKey}>
                                    <div className={fieldClassName}>
                                        <Label className='text-sm'>
                                            {label}
                                            <FieldTooltip view={view} fieldKey={fieldKey} />
                                        </Label>
                                        <CodeEditor value={value} entity={entity} fieldKey={fieldKey} update={save} options={options} />
                                    </div>
                                </div>
                            )
                        };

                        case 'file': {
                            let options = view.properties.columns[fieldKey].options;
                            let validation = view.properties.columns[fieldKey].validation;
                            if(typeof options !== 'undefined' && options.crop === true) {
                                return (
                                    <div className={className + ' field_input_file_cropper'} id={idField} data-field-name={fieldKey}>
                                        <Cropper entity={entity} label={label} field={fieldKey} options={options} validation={validation} value={value} update={save} />
                                    </div>
                                )
                            }
                            else if(typeof options !== 'undefined' && options.signature === true) {
                                return (
                                    <div className={className + ' field_input_file'} id={idField} data-field-name={fieldKey}>
                                        <Signature entity={entity} label={label} field={fieldKey} options={options} validation={validation} value={value} update={save} />
                                    </div>
                                )
                            }
                            else {
                                return (
                                    <div className={className + ' field_input_file'} id={idField} data-field-name={fieldKey}>
                                        <FileField entity={entity} label={label} field={fieldKey} options={options} validation={validation} value={value} update={save} />
                                    </div>
                                )
                            }
                        };

                        default: return (
                            <div className={className} id={idField} data-field-name={fieldKey}>
                                <div className={fieldClassName}>
                                    <Label className='text-sm'>
                                        {label}
                                        <FieldTooltip view={view} fieldKey={fieldKey} />
                                    </Label>
                                    <Input
                                        type="text"
                                        value={value !== null ? value : ''}
                                        onChange={(event) => save(fieldKey, event.target.value)}
                                        disabled={view.properties.columns[fieldKey].options.disabled ? true : false}
                                    />
                                </div>
                            </div>
                        );

                    }
                })()}
            </>
        )
    }
    else {
        return (
            <></>
        )
    }
};
