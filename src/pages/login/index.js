import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { LanguageProvider } from '../../core/language-provider';
import { LoginManager } from '../../core/login-manager';
import loginBg from '../../config/login.jpg';
import { settings } from '../../config/settings';
import Icon from '../../components/BodyElements/Icon';


/**
 * Login in stile shadcn (layout split): form a sinistra,
 * immagine del progetto (config/login.jpg) a destra.
 */
export default function Login() {

    const navigate = useNavigate();
    const [username, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState('');


    async function handleSubmit(e) {
        e.preventDefault();

        // l'autofill di Chrome può riempire i campi senza scatenare onChange
        // (prima del primo gesto utente): i valori si leggono dal form, lo
        // stato fa solo da fallback
        var u = e.target.elements.username ? e.target.elements.username.value : username;
        var p = e.target.elements.password ? e.target.elements.password.value : password;

        var response = await LoginManager.login(u, p, 1);
        console.log(response)
        if (response.success === 0) {
            setErrors(response.message)
        }
    }

    return (
        <div id="login-container" className='grid min-h-svh lg:grid-cols-2'>
            {/* colonna form */}
            <div className='flex flex-col gap-4 p-6 md:p-10'>
                {/* brand come nella sidebar: tile con il logo + nome app */}
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
                                <h1 className='mb-0 text-2xl font-bold tracking-tight'>{LanguageProvider.get('login.title')}</h1>
                                <p className='mb-0 text-sm text-muted-foreground'>{LanguageProvider.get('login.subtitle')}</p>
                            </div>

                            <div className='flex flex-col gap-2'>
                                <Label htmlFor='login-username' className='mb-0 text-sm font-medium'>{LanguageProvider.get('login.username')}</Label>
                                <Input
                                    id='login-username'
                                    name='username'
                                    type='text'
                                    placeholder='name@example.com'
                                    autoComplete='username'
                                    autoFocus
                                    onChange={e => setUserName(e.target.value)}
                                />
                            </div>

                            <div className='flex flex-col gap-2'>
                                <div className='flex items-center justify-between'>
                                    <Label htmlFor='login-password' className='mb-0 text-sm font-medium'>{LanguageProvider.get('login.password')}</Label>
                                    <Link to='/recover' className='text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline'>
                                        {LanguageProvider.get('login.forgot')}
                                    </Link>
                                </div>
                                <div className='relative'>
                                    <Input
                                        id='login-password'
                                        name='password'
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete='current-password'
                                        className='pr-10'
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        type='button'
                                        tabIndex={-1}
                                        title={showPassword ? 'Nascondi password' : 'Mostra password'}
                                        className='absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground'
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <Icon name={showPassword ? 'eye-slash' : 'eye'} />
                                    </button>
                                </div>
                            </div>

                            <Button className='w-full' variant='primary' type='submit'>
                                {LanguageProvider.get('login.login')}
                            </Button>

                            {errors.length > 0 &&
                                <Alert variant='danger' className='mb-0'>
                                    {errors}
                                </Alert>
                            }
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
