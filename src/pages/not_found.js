import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';


export default function NotFound() {

    const navigate = useNavigate()

    useEffect(() => {
        navigate('/')
    }, []);


    return (
        <div className='container mx-auto m-12 p-12 text-center'>
            <Spinner />
            <br/><br/>
            <h1>Pagina non trovata</h1>
            <Link to='/'>
                <Button variant='dark' size='lg'>
                    Torna alla homepage
                </Button>
            </Link>
        </div>
    );
};
