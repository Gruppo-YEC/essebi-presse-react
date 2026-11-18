import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardBody } from '../../components/ui/card';
import { LanguageProvider } from '../../core/language-provider';
import { LoginManager } from '../../core/login-manager';
import Icon from '../../components/BodyElements/Icon';



export default function Logout() {

    let navigate = useNavigate();


    async function handleSubmit() {
        var response = await LoginManager.logout();
        navigate('/')
    }


    return (
        <div className='flex justify-center px-3 py-16'>

            <Card className='w-full max-w-md'>
                <CardBody className='p-8 text-center'>
                    <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger'>
                        <Icon name='arrow-right-from-bracket' size='lg' />
                    </div>
                    <h3 className='mb-1 text-xl font-semibold'>{LanguageProvider.get('logout.title')}</h3>
                    <p className='mb-6 text-muted-foreground'>{LanguageProvider.get('logout.subtitle')}</p>
                    <Button onClick={handleSubmit} variant='danger' size='lg' className='w-full'>
                        {LanguageProvider.get('logout.confirm')}
                    </Button>
                </CardBody>
            </Card>

        </div>
    );
};
