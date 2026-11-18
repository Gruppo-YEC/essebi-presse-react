import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { LanguageProvider } from '../../core/language-provider';
import { LoginManager } from '../../core/login-manager';
import loginBg from '../../config/login.jpg';
import { settings } from '../../config/settings';


/**
 * Recupero password, stesso layout split della pagina di login.
 */
export default function Recover() {

    const navigate = useNavigate();
    const [username, setUserName] = useState('');
    const [sending, setSending] = useState(0);
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSending(1);
        let response = await LoginManager.recoverPassword(username);
        setSending(0);

        if (response.success === 1) {
            navigate('/reset');
        } else {
            setError(response.message || LanguageProvider.get('login.forgot_error', 'Errore nel recupero password'));
        }
    }

    return (
        <div className='grid min-h-svh lg:grid-cols-2'>
            {/* colonna form */}
            <div className='flex flex-col gap-4 p-6 md:p-10'>
                <div className='flex items-center justify-center gap-2.5 md:justify-start'>
                    <span className='flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground'>
                        <img src={settings.logo} alt='logo' className='h-5 w-5 object-contain' />
                    </span>
                    <span className='text-sm font-semibold'>{settings.title}</span>
                </div>

                <div className='flex flex-1 items-center justify-center'>
                    <div className='w-full max-w-sm'>
                        <form onSubmit={handleSubmit} className='flex flex-col gap-6'>
                            <div className='text-center'>
                                <h1 className='mb-0 text-2xl font-bold tracking-tight'>{LanguageProvider.get('login.forgot')}</h1>
                            </div>

                            {error && (
                                <Alert variant='danger' className='mb-0'>
                                    {error}
                                </Alert>
                            )}

                            <div className='flex flex-col gap-2'>
                                <Label htmlFor='recover-username' className='mb-0 text-sm font-medium'>{LanguageProvider.get('login.username')}</Label>
                                <Input
                                    id='recover-username'
                                    type='text'
                                    placeholder='name@example.com'
                                    autoComplete='username'
                                    autoFocus
                                    onChange={e => setUserName(e.target.value)}
                                />
                            </div>

                            {sending === 1 ? (
                                <Button className='w-full' variant='primary' disabled>
                                    {LanguageProvider.get('login.send_forgot_password_key')}
                                    <Spinner size='sm' />
                                </Button>
                            ) : (
                                <Button className='w-full' variant='primary' type='submit'>
                                    {LanguageProvider.get('login.send_forgot_password_key')}
                                </Button>
                            )}

                            <div className='text-center text-sm'>
                                <Link to='/' className='text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'>
                                    {LanguageProvider.get('login.back_to_login')}
                                </Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* colonna immagine (nascosta su mobile) */}
            <div className='relative hidden bg-muted lg:block'>
                <img
                    src={loginBg}
                    alt=''
                    className='absolute inset-0 h-full w-full object-cover'
                />
            </div>
        </div>
    );
};
