import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { Card, CardBody } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../components/ui/dialog';
import { toast } from '../../components/ui/toast';
import { LanguageProvider } from '../../core/language-provider';
import { DataManager } from '../../core/data-manager';
import { ViewManager } from '../../core/view-manager';
import FormEntityInstanceCompiler from '../../components/Entity/FormEntityInstanceCompiler';
import Icon from '../../components/BodyElements/Icon';


export default function EntityAdd() {

    const { entity } = useParams();
    const props = ViewManager.getEntityProperties(entity);
    const navigate = useNavigate();
    const [errors, setErrors] = useState('');
    const { state } = useLocation();

    const [data, setData] = useState(state && state.body || {});



    async function saveElement(el) {
        const idToast = toast.loading(LanguageProvider.get("toast.loading"))
        console.log(el)
        var response = await DataManager.insertItem(entity, el);
        if (response.success === 1) {
            toast.update(idToast, { render: LanguageProvider.get("toast.insertSuccess"), type: "success", isLoading: false, autoClose: 1500 });

            if (props.callback_entity) {
                navigate('/entity/' + props.callback_entity)
            }
            else {
                navigate('/entity/' + entity)
            }
        }
        else {
            toast.update(idToast, { render: LanguageProvider.get("toast.insertFail"), type: "error", isLoading: false, autoClose: 1500 });

            setErrors(LanguageProvider.get('errors.insert'))
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



    return (
        <>
            <div className='mb-4 mt-4 w-full px-3'>

                <h3 className='flex items-center mb-0'>
                    <Button onClick={() => setStatusModalGoBack(true)} variant="light" className='me-3'>
                        <Icon name="chevron-left" />
                    </Button>
                    {LanguageProvider.get('defaults.add')} - {LanguageProvider.get('entity.' + entity)}
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

};
