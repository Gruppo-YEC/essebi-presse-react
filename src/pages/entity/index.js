import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Alert } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { LanguageProvider } from '../../core/language-provider';
import StandardView from '../../components/Entity/StandardView';


export default function Entity() {

    const [errors, setErrors] = useState('');
    const { entity } = useParams();

    const [entityBefore, setEntityBefore] = useState(null);


    useEffect(() => {
        setEntityBefore(entity)
    }, [entity]);



    if (entityBefore === entity) {
        return (
            <div className='mb-4 mt-4 w-full px-3'>
                <StandardView entity={entity} title={LanguageProvider.get('entity.'+entity)} />
            </div>
        )
    }
    else {
        return (
            <div className='container mx-auto mb-12 mt-12 px-3'>
                {errors.length > 0 &&
                    <Alert variant='danger'>
                        {errors}
                    </Alert>
                }
                <div className='p-12 text-center'>
                    <Spinner variant="primary" />
                    <p className='text-primary'>{LanguageProvider.get('defaults.loading')}</p>
                </div>
            </div>
        )
    }
};
