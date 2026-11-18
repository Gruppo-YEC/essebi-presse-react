import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { LanguageProvider } from '../../core/language-provider';
import { LoginManager } from '../../core/login-manager';
import loginBg from '../../config/login.jpg';
import { settings } from '../../config/settings';


/**
 * Reset password, stesso layout split della pagina di login.
 */
export default function Reset() {

    const navigate = useNavigate();
    const [key, setKey] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();

        let response = await LoginManager.resetPassword(key, password, confirmPassword)

        console.log(response)
        if (response.success === 1) {
            navigate('/')
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
                            <div className='flex flex-col gap-1 text-center'>
                                <h1 className='mb-0 text-2xl font-bold tracking-tight'>{LanguageProvider.get('login.reset_password')}</h1>
                                <p className='mb-0 text-sm text-muted-foreground'>{LanguageProvider.get('login.insert_password_key')}</p>
                            </div>

                            <div className='flex flex-col gap-2'>
                                <Label htmlFor='reset-key' className='mb-0 text-sm font-medium'>{LanguageProvider.get('login.password_key')}</Label>
                                <Input
                                    id='reset-key'
                                    type='text'
                                    autoFocus
                                    onChange={e => setKey(e.target.value)}
                                />
                            </div>

                            <div className='flex flex-col gap-2'>
                                <Label htmlFor='reset-password' className='mb-0 text-sm font-medium'>{LanguageProvider.get('login.new_password')}</Label>
                                <Input
                                    id='reset-password'
                                    type='password'
                                    autoComplete='new-password'
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>

                            <div className='flex flex-col gap-2'>
                                <Label htmlFor='reset-confirm-password' className='mb-0 text-sm font-medium'>{LanguageProvider.get('login.confirm_new_password')}</Label>
                                <Input
                                    id='reset-confirm-password'
                                    type='password'
                                    autoComplete='new-password'
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <Button className='w-full' variant='primary' type='submit'>
                                {LanguageProvider.get('login.confirm_reset')}
                            </Button>

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
