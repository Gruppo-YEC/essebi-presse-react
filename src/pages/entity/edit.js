import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { Card, CardBody } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../components/ui/dialog';
import { toast } from '../../components/ui/toast';
import { LanguageProvider } from '../../core/language-provider';
import { DataManager } from '../../core/data-manager';
import { ViewManager } from '../../core/view-manager';
import FormEntityInstanceCompiler from '../../components/Entity/FormEntityInstanceCompiler';
import Icon from '../../components/BodyElements/Icon';


export default function EntityEdit() {

    const [data, setData] = useState(null);
    const [errors, setErrors] = useState('');
    const { entity } = useParams();
    const props = ViewManager.getEntityProperties(entity);
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const [id, setId] = useState(searchParams.get("id") || null)
    /* state.body: valori che sovrascrivono quelli del record, come in add.js
       (li usa l'assistente AI per arrivare qui col form gia' precompilato) */
    const { state } = useLocation();

    useEffect(() => {
        async function init() {
            var response = await DataManager.getItem(entity, id);
            if(response.success === 1 && response.body.length) {
                console.warn(response.body[0])
                setData(state && state.body ? { ...response.body[0], ...state.body } : response.body[0])
            }
            else {
                setErrors(LanguageProvider.get('errors.get'))
                console.warn(response)
            }
        }
        init()
    }, []);


    async function saveElement(el) {
        const idToast = toast.loading(LanguageProvider.get("toast.loading"))
        console.log(el)
        var response = await DataManager.updateItem(entity, el, id, data);
        if(response.success === 1) {
            toast.update(idToast, { render: LanguageProvider.get("toast.updateSuccess"), type: "success", isLoading: false, autoClose: 1500 });

            navigate(-1)
        }
        else {
            toast.update(idToast, { render: LanguageProvider.get("toast.updateFail"), type: "error", isLoading: false, autoClose: 1500 });

            setErrors(LanguageProvider.get('errors.update'))
            console.warn(response)
            setTimeout(() => {
                setErrors('')
            }, "5000")
        }
    }



    const [statusModalGoBack, setStatusModalGoBack] = useState(false)

    function closeModalGoBack() {
        setStatusModalGoBack(false)
    }




    if (data !== null) {
        return (
            <>
                <div className='mb-4 mt-4 w-full px-3'>

                    <h3 className='flex items-center mb-0'>
                        <Button onClick={() => setStatusModalGoBack(true)} variant="light" className='me-3'>
                            <Icon name="chevron-left" />
                        </Button>
                        {LanguageProvider.get('defaults.edit')} - {LanguageProvider.get('entity.'+entity)}
                    </h3>



                    <Card className='mt-4'>
                        <CardBody>
                            <FormEntityInstanceCompiler entity={entity} confirmCallback={saveElement} initData={data} />
                        </CardBody>
                    </Card>
                    {errors.length > 0 &&
                        <Alert className='mt-4' variant='danger'>
                            {errors}
                        </Alert>
                    }
                </div>


                <Dialog open={statusModalGoBack} onOpenChange={(open) => { if (!open) closeModalGoBack() }}>
                    <DialogContent size="md">
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('defaults.go_back_title')}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            <p>{LanguageProvider.get('defaults.go_back_text')}</p>
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="success" onClick={() => navigate(-1)}>
                                {LanguageProvider.get('defaults.exit')}
                            </Button>
                            <Button variant="secondary" onClick={closeModalGoBack}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
