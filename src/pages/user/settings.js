import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Alert } from '../../components/ui/alert';
import { Spinner } from '../../components/ui/spinner';
import { Card, CardBody } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { FloatingInput } from '../../components/ui/floating-input';
import { LanguageProvider } from '../../core/language-provider';
import { DataManager } from '../../core/data-manager';
import { LoginManager } from '../../core/login-manager';
import avatars from '../../core/avatar';
import { Helmet } from 'react-helmet-async';
import SettingsCache from './components/SettingsCache';
import CurrentSession from './components/CurrentSession';
import OtherTools from './components/OtherTools';
import Icon from '../../components/BodyElements/Icon';


export default function Settings() {

    const [userInfo, setUserInfo] = useState({});
    const [data, setData] = useState(null);
    const [errors, setErrors] = useState('');


    useEffect(() => {
        async function init() {
            var res = LoginManager.getUserInfo()
            console.warn(res)
            setUserInfo(res)
            if(res) {
                var response = await DataManager.getItem('user', res.id)
                if (response.success === 1) {
                    var userData = response.body[0];
                    setData(userData)
                    setName(userData.name)
                    setSurname(userData.surname)
                }
                else {
                    setErrors(response.error.message)
                }
            }
        }

        init()
    }, []);

    useEffect(() => {
        if (userInfo && userInfo.avatar) {
            setAvatar(userInfo.avatar)
        }
    }, [userInfo]);


    //general
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [errorsGeneral, setErrorsGeneral] = useState('');
    const [successGeneral, setSuccessGeneral] = useState('');

    async function handleSubmitGeneral(e) {
        e.preventDefault();
        var body = {
            name: name,
            surname: surname
        }
        var response = await LoginManager.updateProfile(body)
        if (response.success === 0) {
            setErrorsGeneral(response.error.message)
            setSuccessGeneral('')
        }
        else {
            setSuccessGeneral(LanguageProvider.get('settings.general_success'))
            setErrorsGeneral('')
            setTimeout(() => {
                setSuccessGeneral('')
            }, "5000")
        }
    }

    //security
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorsSecurity, setErrorsSecurity] = useState('');
    const [successSecurity, setSuccessSecurity] = useState('');

    async function handleSubmitSecurity(e) {
        e.preventDefault();

        if (newPassword === '' || newPassword !== confirmPassword) {
            setErrorsSecurity(LanguageProvider.get('settings.passwords_match_error'))
            setSuccessSecurity('')
        }
        else {
            var response = await LoginManager.changePassword(password, newPassword, confirmPassword)
            if (response.success === 0) {
                setErrorsSecurity(response.message)
                setSuccessSecurity('')
            }
            else {
                setSuccessSecurity(LanguageProvider.get('settings.general_success'))
                setErrorsSecurity('')
                setTimeout(() => {
                    setSuccessSecurity('')
                }, "5000")
            }
        }
    }

    //avatar
    const [avatar, setAvatar] = useState('');
    const [errorsAvatar, setErrorsAvatar] = useState('');
    const [successAvatar, setSuccessAvatar] = useState('');

    async function handleSubmitAvatar(e) {
        e.preventDefault();
        var body = {
            avatar: avatar
        }
        var response = await LoginManager.updateProfile(body)
        if (response.success === 0) {
            setErrorsAvatar(response.message)
            setSuccessAvatar('')
        }
        else {
            setSuccessAvatar(LanguageProvider.get('settings.avatar_success'))
            setErrorsAvatar('')
            setTimeout(() => {
                setSuccessAvatar('')
                window.location.reload(true)
            }, "1000")
        }
    }


    if (data !== null) {
        return (
            <>
                <Helmet>
                    <title>{LanguageProvider.get('settings.user_settings')}</title>
                </Helmet>

                <div className='mb-4 mt-4 w-full px-3'>
                    <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                        <h3 className='mb-0'>{LanguageProvider.get('settings.user_settings')}</h3>
                    </div>

                    <div className='w-full'>
                        <Card>
                            <CardBody>
                                <Tabs defaultValue="first">
                                    <TabsList>
                                        <TabsTrigger value="first">{LanguageProvider.get('settings.avatar')}</TabsTrigger>
                                        <TabsTrigger value="second">{LanguageProvider.get('settings.general')}</TabsTrigger>
                                        <TabsTrigger value="third">{LanguageProvider.get('settings.security')}</TabsTrigger>
                                        <TabsTrigger value="fourth">{LanguageProvider.get('settings.cache', 'Cache')}</TabsTrigger>
                                        <TabsTrigger value="fifth">{LanguageProvider.get('settings.session', 'Sessione')}</TabsTrigger>
                                        <TabsTrigger value="sixth">{LanguageProvider.get('settings.other', 'Altro')}</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="first">
                                        {/* anteprima dell'avatar selezionato */}
                                        <div className='mt-4 flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-4'>
                                            <img
                                                src={avatars[avatar * 1] || avatars[2]}
                                                alt='avatar selezionato'
                                                className='h-20 w-20 rounded-full object-cover ring-2 ring-primary/40 ring-offset-2'
                                            />
                                            <div className='min-w-0'>
                                                <div className='truncate font-medium text-foreground'>{data.name} {data.surname}</div>
                                                <div className='truncate text-sm text-muted-foreground'>{userInfo && userInfo.email}</div>
                                            </div>
                                        </div>

                                        {/* griglia di scelta */}
                                        <div className='mt-6 grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10'>
                                            {avatars.map((item, i) => {
                                                const selected = avatar * 1 === i;
                                                return (
                                                    <button
                                                        key={i}
                                                        type='button'
                                                        onClick={() => setAvatar(i)}
                                                        title={'Avatar ' + (i + 1)}
                                                        className={
                                                            'relative aspect-square cursor-pointer rounded-full p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ' +
                                                            (selected
                                                                ? 'scale-105 ring-2 ring-primary ring-offset-2'
                                                                : 'opacity-80 hover:scale-105 hover:opacity-100 hover:ring-2 hover:ring-border hover:ring-offset-2')
                                                        }
                                                    >
                                                        <img src={item} alt={'avatar ' + i} className='h-full w-full rounded-full object-cover' />
                                                        {selected && (
                                                            <span className='absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow'>
                                                                <Icon name='check' style={{ fontSize: 10 }} />
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <div className="mb-4 mt-8 text-center">
                                            <Button onClick={handleSubmitAvatar} variant="primary" type="submit">{LanguageProvider.get('settings.avatar_save', 'Save')}</Button>
                                        </div>

                                        {errorsAvatar.length > 0 &&
                                            <Alert variant='danger'>
                                                {errorsAvatar}
                                            </Alert>
                                        }
                                        {successAvatar.length > 0 &&
                                            <Alert variant='success'>
                                                {successAvatar}
                                            </Alert>
                                        }
                                    </TabsContent>
                                    <TabsContent value="second">
                                        <form onSubmit={handleSubmitGeneral} className='mt-6'>
                                            <FloatingInput className='mb-4' label={LanguageProvider.get('settings.name', 'Name')} value={name} type="text" onChange={e => setName(e.target.value)} />

                                            <FloatingInput className='mb-4' label={LanguageProvider.get('settings.surname', 'Surname')} value={surname} type="text" onChange={e => setSurname(e.target.value)} />

                                            <div className="mb-4 mt-6 text-center">
                                                <Button variant="primary" type="submit">{LanguageProvider.get('settings.general_save', 'Save')}</Button>
                                            </div>

                                            {errorsGeneral.length > 0 &&
                                                <Alert variant='danger'>
                                                    {errorsGeneral}
                                                </Alert>
                                            }
                                            {successGeneral.length > 0 &&
                                                <Alert variant='success'>
                                                    {successGeneral}
                                                </Alert>
                                            }
                                        </form>
                                    </TabsContent>
                                    <TabsContent value="third">
                                        <form onSubmit={handleSubmitSecurity} className='mt-6'>
                                            <FloatingInput className='mb-4' label={LanguageProvider.get('settings.password', 'Password')} value={password} type="password" onChange={e => setPassword(e.target.value)} />

                                            <FloatingInput className='mb-4' label={LanguageProvider.get('settings.new_password', 'New password')} value={newPassword} type="password" onChange={e => setNewPassword(e.target.value)} />

                                            <FloatingInput className='mb-4' label={LanguageProvider.get('settings.confirm_password', 'Confirm password')} value={confirmPassword} type="password" onChange={e => setConfirmPassword(e.target.value)} />

                                            <div className="mb-4 mt-6 text-center">
                                                <Button variant="primary" type="submit">{LanguageProvider.get('settings.security_save', 'Save')}</Button>
                                            </div>

                                            {errorsSecurity.length > 0 &&
                                                <Alert variant='danger'>
                                                    {errorsSecurity}
                                                </Alert>
                                            }
                                            {successSecurity.length > 0 &&
                                                <Alert variant='success'>
                                                    {successSecurity}
                                                </Alert>
                                            }
                                        </form>
                                    </TabsContent>
                                    <TabsContent value="fourth">
                                        <SettingsCache />
                                    </TabsContent>
                                    <TabsContent value="fifth">
                                        <CurrentSession />
                                    </TabsContent>
                                    <TabsContent value="sixth">
                                        <OtherTools />
                                    </TabsContent>
                                </Tabs>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </>
        );
    }
    else {
        return (
            <div className='mb-4 mt-4 w-full px-3'>
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
