import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { SimpleTooltip } from '../../../components/ui/tooltip';
import { Panel, PanelRow as Row } from '../../../components/ui/panel';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';
import { LoginManager } from '../../../core/login-manager';
import { LanguageProvider } from '../../../core/language-provider';
import avatars from '../../../core/avatar';

const t = (key, fallback) => LanguageProvider.get(key, fallback);

/**
 * Tab "Sessione" delle impostazioni: chi e' collegato, con quali token,
 * e cosa c'e' nel localStorage. Serve per capire al volo perche' una
 * sessione si comporta in modo strano, senza aprire la console.
 */
export default function CurrentSession() {
    const [info, setInfo] = useState(null);
    const [refreshTime, setRefreshTime] = useState(new Date());
    const [showAll, setShowAll] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const userInfo = LoginManager.getUserInfo();
            const sid = await LoginManager.getSid();
            const ltsid = await LoginManager.getLtsid();
            setInfo({ userInfo, sid, ltsid });
            setRefreshTime(new Date());
        } catch (error) {
            console.error('Error loading session info:', error);
        }
    }

    async function copy(text, name) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(`${name} ${t('session.copied', 'copiato negli appunti')}`);
        } catch (err) {
            toast.error(t('session.copy_failed', 'Copia non riuscita'));
        }
    }

    function forceRefreshSid() {
        LoginManager.refreshSid();
        setTimeout(load, 1000);
    }

    if (!info) {
        return <div className='mt-6 text-center text-sm text-muted-foreground'>{t('defaults.loading', 'Caricamento...')}</div>;
    }

    const { userInfo, sid, ltsid } = info;
    const level = levelInfo(userInfo?.level);
    const storage = [
        { label: 'SID', present: !!localStorage.getItem('sid') },
        { label: 'LTSID', present: !!localStorage.getItem('ltsid') },
        { label: 'UserInfo', present: !!localStorage.getItem('userInfo') },
    ];
    const deeplink = localStorage.getItem('deeplink');

    return (
        <div className='mt-6'>

            {/* Identita' + azioni */}
            <div className='mb-6 flex flex-wrap items-center justify-between gap-4'>
                <div className='flex items-center gap-4'>
                    <img
                        src={avatars[userInfo?.avatar * 1] || avatars[2]}
                        alt=''
                        className='h-14 w-14 rounded-full object-cover ring-2 ring-primary/30 ring-offset-2'
                    />
                    <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                            <span className='truncate text-lg font-semibold leading-tight'>{userInfo?.name} {userInfo?.surname}</span>
                            <Badge variant={level.variant}>{level.label}</Badge>
                        </div>
                        <div className='truncate text-sm text-muted-foreground'>{userInfo?.email || userInfo?.username || '-'}</div>
                    </div>
                </div>
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='sm' onClick={load}>
                        <Icon name='rotate-right' />{t('session.refresh', 'Ricarica')}
                    </Button>
                    <Button variant='outline-secondary' size='sm' onClick={forceRefreshSid}>
                        <Icon name='key' />{t('session.force_refresh_sid', 'Rinnova SID')}
                    </Button>
                </div>
            </div>

            <div className='grid gap-4 md:grid-cols-2'>

                {/* Utente */}
                <Panel icon='user' title={t('session.user', 'Utente')}>
                    <Row label='ID'><code>{userInfo?.id ?? '-'}</code></Row>
                    <Row label='Username'>{userInfo?.username || '-'}</Row>
                    <Row label='Email'>{userInfo?.email || '-'}</Row>
                    <Row label={t('session.level', 'Livello')}>
                        <Badge variant={level.variant}>{level.label}</Badge>
                        <span className='ms-2 text-xs text-muted-foreground'>({userInfo?.level})</span>
                    </Row>
                    {userInfo?.idUserGroup ? <Row label={t('session.group', 'Gruppo')}><code>{userInfo.idUserGroup}</code></Row> : null}
                </Panel>

                {/* Token */}
                <Panel icon='shield-halved' title={t('session.tokens', 'Token di sessione')}
                    footer={t('session.tokens_note', 'Autenticano la tua sessione: non condividerli.')}>
                    <Row label='SID'><Token value={sid} onCopy={() => copy(sid, 'SID')} /></Row>
                    <Row label='LTSID'><Token value={ltsid} onCopy={() => copy(ltsid, 'LTSID')} /></Row>
                    <Row label={t('session.last_refresh', 'Ultimo aggiornamento')}>
                        <span className='text-muted-foreground'>{refreshTime.toLocaleTimeString()}</span>
                    </Row>
                </Panel>

                {/* Storage */}
                <Panel icon='hard-drive' title='localStorage' className='md:col-span-2'>
                    <div className='flex flex-wrap items-center gap-2 py-1'>
                        {storage.map((s) => (
                            <span key={s.label} className={'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ' + (s.present ? 'border-success/30 bg-success/10 text-green-800 dark:text-green-300' : 'border-warning/40 bg-warning/15 text-yellow-900 dark:text-yellow-200')}>
                                <Icon name={s.present ? 'check' : 'xmark'} size='xs' />
                                {s.label}
                            </span>
                        ))}
                        <span className='ms-auto text-xs text-muted-foreground'>
                            {t('session.deeplink', 'Deeplink')}: {deeplink ? <code>{deeplink}</code> : <span>-</span>}
                        </span>
                    </div>
                </Panel>
            </div>

            {/* Tutti i campi */}
            {userInfo && Object.keys(userInfo).length > 0 && (
                <div className='mt-4'>
                    <button type='button' className='inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground' onClick={() => setShowAll(!showAll)}>
                        <Icon name={showAll ? 'chevron-down' : 'chevron-right'} size='xs' />
                        {t('session.all_fields', 'Tutti i campi di userInfo')}
                    </button>
                    {showAll && (
                        <pre className='mb-0 mt-2 max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs leading-snug'>
                            {JSON.stringify(userInfo, null, 2)}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

function Token({ value, onCopy }) {
    return (
        <span className='inline-flex items-center gap-1'>
            <code className='text-xs'>{mask(value)}</code>
            <SimpleTooltip content={t('session.copy', 'Copia')}>
                <Button variant='ghost' size='sm' className='h-6 w-6 px-0' onClick={onCopy} disabled={!value}>
                    <Icon name='copy' size='xs' />
                </Button>
            </SimpleTooltip>
        </span>
    );
}

function mask(str) {
    if (!str) return '-';
    if (str.length <= 8) return '****';
    return str.substring(0, 4) + '····' + str.substring(str.length - 4);
}

function levelInfo(level) {
    switch (level) {
        case 0: return { label: 'Admin', variant: 'danger' };
        case 1: return { label: 'Standard', variant: 'primary' };
        case 2: return { label: 'Restricted', variant: 'warning' };
        default: return { label: `Level ${level}`, variant: 'secondary' };
    }
}
