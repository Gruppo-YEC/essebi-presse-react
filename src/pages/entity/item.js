import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { Card, CardHeader, CardBody } from '../../components/ui/card';
import { LanguageProvider } from '../../core/language-provider';
import { DataManager } from '../../core/data-manager';
import { ViewManager } from '../../core/view-manager';
import FieldPreview from '../../components/Entity/FieldPreview';
import { AuthorizationManager } from '../../core/authorization-manager';
import ModalEntityCompiler from '../../components/Modals/ModalEntityCompiler';
import ModalLogs from '../../components/Modals/ModalLogs';
import { toast } from '../../components/ui/toast';
import Icon from '../../components/BodyElements/Icon';


export default function EntityItem() {

    const [data, setData] = useState(null);
    const excluded = ['deleted', 'id', 'date', 'lastUpdate'];
    const [errors, setErrors] = useState('');
    const { entity } = useParams();
    const props = ViewManager.getEntityProperties(entity);
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const [id, setId] = useState(searchParams.get("id") || null);

    // ModalLogs fa tutto da sé (fetch + timeline): qui basta aprirlo.
    // Il tasto compare solo se il livello utente può vedere l'entità log.
    const [modalLogsStatus, setModalLogsStatus] = useState(false);
    const canViewLogs = AuthorizationManager.checkEntityActionAuth('log', 'view') !== false;

    useEffect(() => {
        init()
    }, []);


    async function init() {
        var response = await DataManager.getItem(entity, id);
        if (response.success === 1 && response.body && response.body.length > 0) {
            console.warn(response.body[0])
            setData(response.body[0])
        }
        else {
            setErrors(LanguageProvider.get('errors.get'))
            console.warn(response)
        }
    }

    /** modal edit */
    const [modalEditStatus, setModalEditStatus] = useState(false);
    function edit() {
        setModalEditStatus(true)
    }
    function closeModalEdit() {
        setModalEditStatus(false)
    }
    async function saveEdit(d) {
        console.warn(d)
        if(id) {
            var response = await DataManager.updateItem(entity, d, id, data)
            if(response.success === 1) {
                toast.success('Elemento aggiornato con successo.', { theme: 'colored' });
                init()
                closeModalEdit()
            }
            else {
                toast.error('Errore durante la modifica. Riprova.', { theme: 'colored' });
            }
        }
    }




    if (data !== null && entity) {
        return (
            <>
                <div className='mb-4 mt-4 w-full px-3'>

                    <h3 className='flex items-center mb-0'>
                        <Button onClick={() => navigate(-1)} variant="light" className='me-3'>
                            <Icon name="chevron-left" />
                        </Button>
                        {LanguageProvider.get('entity.' + entity)}
                    </h3>

                    <div className='row mt-4'>
                        <div className='col-md-12 col-lg-9'>
                            <Card className='mb-4'>
                                <CardBody>
                                    <div className='row'>
                                        {Object.keys(data).map((key, i) => {
                                            var className = "mb-4 col-sm-12 col-md-6 col-lg-4 col-xl-4 col-xxl-3";
                                            if (props.columns && props.columns[key].options && props.columns[key].options.className) {
                                                className = props.columns[key].options.className
                                            }
                                            var input_type = props.columns && props.columns[key] ? props.columns[key].input_type : null
                                            switch (input_type) {
                                                case 'text': className = 'mb-4 col-sm-12 col-md-6 col-lg-6 col-xl-6 col-xxl-6';
                                                break;
                                                case 'richText': className = 'mb-4 col-sm-12 col-md-12';
                                                break;
                                                case 'markdown': className = 'mb-4 col-sm-12 col-md-12';
                                                break;
                                                case 'deepExternalEntity': className = 'mb-4 col-sm-12 col-md-12';
                                                break;
                                                default: className = className
                                            }

                                            if (!excluded.includes(key)) {
                                                return (
                                                    <div key={i} data-input-type={input_type} data-name={'view-item-field-' + key} className={className}>
                                                        <label className='text-muted-foreground' style={{ fontSize: 12 }}>
                                                            <span>{LanguageProvider.getLabel(entity, key)}</span>
                                                        </label>
                                                        <div className='mt-1'>
                                                            <Card>
                                                                <CardBody className='p-2' style={{ minHeight: 40 }}>
                                                                    <FieldPreview item={data} field={key} props={props} entity={entity} adv={true} />
                                                                </CardBody>
                                                            </Card>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        })}
                                    </div>
                                </CardBody>
                            </Card>
                        </div>
                        <div className='col-md-12 col-lg-3'>
                            <div className='mb-4 overflow-hidden rounded-lg border border-black/10 dark:border-border bg-card'>
                                <div className='border-b border-black/10 dark:border-border px-4 py-3 last:border-b-0'>
                                    <div className='flex items-center'>
                                        <Icon name="tag" color={'#aaa'} className='me-2' />
                                        <span className='text-muted-foreground' style={{ fontSize: 11 }}>Id elemento</span>
                                    </div>
                                    <div className='mt-2 text-sm'>
                                        {data.id}
                                    </div>
                                </div>
                                <div className='border-b border-black/10 dark:border-border px-4 py-3 last:border-b-0'>
                                    <div className='flex items-center'>
                                        <Icon name="calendar" color={'#aaa'} className='me-2' />
                                        <span className='text-muted-foreground' style={{ fontSize: 11 }}>Data creazione</span>
                                    </div>
                                    <div className='mt-2 text-sm'>
                                        <FieldPreview item={data} field={'date'} props={props} entity={entity} adv={true} />
                                    </div>
                                </div>
                                <div className='border-b border-black/10 dark:border-border px-4 py-3 last:border-b-0'>
                                    <div className='flex items-center'>
                                        <Icon name="pen-to-square" color={'#aaa'} className='me-2' />
                                        <span className='text-muted-foreground' style={{ fontSize: 11 }}>Ultima modifica</span>
                                    </div>
                                    <div className='mt-2 text-sm'>
                                        <FieldPreview item={data} field={'lastUpdate'} props={props} entity={entity} adv={true} />
                                    </div>
                                </div>
                                {data.author ? (
                                    <div className='border-b border-black/10 dark:border-border px-4 py-3 last:border-b-0'>
                                        <div className='flex items-center'>
                                            <Icon name="user" color={'#aaa'} className='me-2' />
                                            <span className='text-muted-foreground' style={{ fontSize: 11 }}>Autore</span>
                                        </div>
                                        <div className='mt-2 text-sm'>
                                            <FieldPreview item={data} field={'author'} props={props} entity={entity} adv={true} />
                                        </div>
                                    </div>
                                ) : null}
                                {data.idUserGroup ? (
                                    <div className='border-b border-black/10 dark:border-border px-4 py-3 last:border-b-0'>
                                        <div className='flex items-center'>
                                            <Icon name="folder" color={'#aaa'} className='me-2' />
                                            <span className='text-muted-foreground' style={{ fontSize: 11 }}>Gruppo</span>
                                        </div>
                                        <div className='mt-2 text-sm'>
                                            <FieldPreview item={data} field={'idUserGroup'} props={props} entity={entity} adv={true} />
                                        </div>
                                    </div>
                                ) : null}
                                {
                                    {
                                        'true':
                                            <div className='border-b border-black/10 dark:border-border px-4 py-3 last:border-b-0'>
                                                <div className='flex items-center'>
                                                    <Icon name="pen-to-square" color={'#aaa'} className='me-2' />
                                                    <span className='text-muted-foreground' style={{ fontSize: 11 }}>Modifica</span>
                                                </div>
                                                <div className='mt-2 text-sm'>
                                                    <span onClick={() => edit()} className='cursor-pointer text-primary hover:underline' role='button'>Modifica elemento</span>
                                                </div>
                                            </div>,
                                        'false': <></>
                                    }[AuthorizationManager.checkEntityActionAuth(entity, 'edit')]
                                }
                            </div>

                            <ModalEntityCompiler entity={entity} confirmCallback={saveEdit} initData={data} excludedFields={[]} status={modalEditStatus} close={closeModalEdit} />


                            {canViewLogs ? (
                                <>
                                    <Card className='mb-4'>
                                        <CardHeader>
                                            <div className='flex items-center'>
                                                <Icon name="clock-rotate-left" color={'#aaa'} className='me-2' />
                                                <span className='text-muted-foreground' style={{ fontSize: 11 }}>Log</span>
                                            </div>
                                        </CardHeader>
                                        <CardBody>
                                            <Button size="sm" variant="outline-secondary" onClick={() => setModalLogsStatus(true)}>
                                                <Icon name="clock-rotate-left" /> {LanguageProvider.get('logs.view')}
                                            </Button>
                                        </CardBody>
                                    </Card>
                                    <ModalLogs entity={entity} id={id} status={modalLogsStatus} close={() => setModalLogsStatus(false)} />
                                </>
                            ) : null}
                        </div>
                    </div>


                    {errors.length > 0 &&
                        <Alert className='mt-4' variant='danger'>
                            {errors}
                        </Alert>
                    }
                </div>
            </>
        )
    }
    else {
        return (
            <div className='mb-4 mt-4 w-full px-3'>

                <h3 className='flex items-center mb-0'>
                    <Button onClick={() => navigate(-1)} variant="light" className='me-3'>
                        <Icon name="chevron-left" />
                    </Button>
                    {LanguageProvider.get('entity.' + entity)}
                </h3>

                {errors.length > 0 ? (
                    <Alert variant='danger' className='mt-4'>
                        {errors}
                    </Alert>
                ) : (
                    <div className='p-12 text-center'>
                        <Spinner variant="primary" />
                        <p className='text-primary'>{LanguageProvider.get('defaults.loading')}</p>
                    </div>
                )}
            </div>
        )
    }
};
