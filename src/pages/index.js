import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '../components/ui/alert';
import { Spinner } from '../components/ui/spinner';
import { LanguageProvider } from '../core/language-provider';
import { LoginManager } from '../core/login-manager';
import Dashboard from '../config/Dashboard';


export default function Home() {

    const [data, setData] = useState(null);
    const [errors, setErrors] = useState('');
    const navigate = useNavigate();


    useEffect(() => {

        async function init() {
            var userInfo = LoginManager.getUserInfo()
            setData(userInfo)
        }

        init()
    }, []);




    if (data !== null) {
        return (
            <div className='container mx-auto mb-12 mt-12 px-3'>
                <h3>Ciao, {data.name} {data.surname}</h3>
                <Dashboard />
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
