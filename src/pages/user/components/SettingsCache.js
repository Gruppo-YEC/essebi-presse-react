import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../components/ui/dialog';
import { SimpleTooltip } from '../../../components/ui/tooltip';
import { Panel, Stat } from '../../../components/ui/panel';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';
import { CacheManager } from '../../../core/cache-manager';
import { LanguageProvider } from '../../../core/language-provider';

const t = (key, fallback) => LanguageProvider.get(key, fallback);

/**
 * Tab "Cache" delle impostazioni: cosa c'e' nella cache in memoria del
 * DataManager, quanto pesa, cosa e' scaduto, e i comandi per svuotarla.
 */
export default function SettingsCache() {
    const [entries, setEntries] = useState([]);
    const [stats, setStats] = useState({ totalEntries: 0, totalSize: 0, expiredEntries: 0, entitiesCached: 0 });
    const [lastPullTime, setLastPullTime] = useState(null);
    const [selected, setSelected] = useState(null);
    const cacheEnabled = CacheManager.isCacheEnabled();

    useEffect(() => { load(); }, []);

    function load() {
        try {
            const list = [];
            for (const [key, value] of CacheManager.cache.entries()) {
                list.push({
                    key,
                    timestamp: new Date(value.timestamp),
                    expiry: new Date(value.expiry),
                    size: JSON.stringify(value.data).length,
                    type: key.split(':')[0],     // getItems, getItem, searchItems
                    entity: key.split(':')[1],
                    isExpired: Date.now() > value.expiry,
                    data: value.data,
                });
            }
            list.sort((a, b) => b.timestamp - a.timestamp);
            setEntries(list);
            setStats({
                totalEntries: list.length,
                totalSize: list.reduce((sum, e) => sum + e.size, 0),
                expiredEntries: list.filter((e) => e.isExpired).length,
                entitiesCached: new Set(list.map((e) => e.entity)).size,
            });
            const pull = localStorage.getItem(CacheManager.LAST_PULL_KEY);
            setLastPullTime(pull ? new Date(parseInt(pull)) : null);
        } catch (error) {
            console.error('Error loading cache data:', error);
        }
    }

    function clearAll() {
        CacheManager.clearAll();
        load();
        toast.success(t('cache.cache_cleared_success'));
    }

    function clearExpired() {
        CacheManager.clearExpiredEntries();
        load();
        toast.success(t('cache.expired_cleared_success'));
    }

    function clearEntity(entity) {
        CacheManager.clearEntity(entity);
        load();
        toast.success(t('cache.entity_cache_cleared_success').replace('{entity}', entity));
    }

    return (
        <div className='mt-6'>

            {/* Stato + azioni */}
            <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-3'>
                    <span className={'flex h-2.5 w-2.5 rounded-full ' + (cacheEnabled ? 'bg-success' : 'bg-warning')} />
                    <div>
                        <div className='text-sm font-medium'>
                            {t('cache.cache_status')} <span className='ms-1'>{cacheEnabled ? t('cache.enabled') : t('cache.disabled')}</span>
                        </div>
                        <div className='text-xs text-muted-foreground'>
                            {cacheEnabled ? t('cache.cache_active') : t('cache.cache_disabled')}
                            {!cacheEnabled && <> {t('cache.enable_cache')} <code>usingCache: true</code> {t('cache.in_settings')}</>}
                        </div>
                    </div>
                </div>
                <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='sm' onClick={load}>
                        <Icon name='rotate-right' />{t('cache.refresh')}
                    </Button>
                    <Button variant='ghost' size='sm' onClick={clearExpired} disabled={!cacheEnabled || stats.expiredEntries === 0}>
                        <Icon name='broom' />{t('cache.clear_expired')}
                    </Button>
                    <Button variant='outline-danger' size='sm' onClick={clearAll} disabled={!cacheEnabled || stats.totalEntries === 0}>
                        <Icon name='trash' />{t('cache.clear_all_cache')}
                    </Button>
                </div>
            </div>

            {/* Numeri */}
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                <Stat icon='layer-group' value={stats.totalEntries} label={t('cache.total_entries')} />
                <Stat icon='table' value={stats.entitiesCached} label={t('cache.entities_cached')} />
                <Stat icon='database' value={formatBytes(stats.totalSize)} label={t('cache.total_size')} />
                <Stat icon='clock' value={stats.expiredEntries} label={t('cache.expired_entries')} className={stats.expiredEntries > 0 ? '[&>div:last-child]:text-warning-foreground' : ''} />
            </div>
            {lastPullTime && (
                <div className='mt-2 text-right text-xs text-muted-foreground'>
                    {t('cache.last_sync_check')} {lastPullTime.toLocaleString()}
                </div>
            )}

            {/* Voci */}
            <div className='mt-6'>
                {entries.length ? (
                    <Panel icon='layer-group' title={`${t('cache.cache_entries')} (${entries.length})`}>
                        {entries.map((e) => (
                            <div key={e.key} className={'flex items-center gap-4 py-2.5 text-sm ' + (e.isExpired ? 'text-muted-foreground' : '')}>
                                <div className='flex min-w-0 flex-1 items-center gap-2'>
                                    <Badge variant={typeVariant(e.type)} className='shrink-0 text-[0.65rem]'>{e.type}</Badge>
                                    <code className='truncate text-xs'>{e.entity}</code>
                                </div>
                                <div className='hidden shrink-0 text-xs text-muted-foreground md:block'>
                                    {t('cache.cached_at')} {e.timestamp.toLocaleTimeString()} · {t('cache.expires_at').toLowerCase()} {e.expiry.toLocaleTimeString()}
                                </div>
                                <div className='w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground'>{formatBytes(e.size)}</div>
                                <div className='w-16 shrink-0 text-right'>
                                    {e.isExpired
                                        ? <Badge variant='warning' className='text-[0.65rem]'>{t('cache.expired')}</Badge>
                                        : <Badge variant='success' className='text-[0.65rem]'>{t('cache.valid')}</Badge>}
                                </div>
                                <div className='flex shrink-0 gap-0.5'>
                                    <SimpleTooltip content={t('cache.detail')}>
                                        <Button variant='ghost' size='sm' className='h-7 w-7 px-0' onClick={() => setSelected(e)}>
                                            <Icon name='eye' />
                                        </Button>
                                    </SimpleTooltip>
                                    <SimpleTooltip content={t('cache.clear')}>
                                        <Button variant='ghost' size='sm' className='h-7 w-7 px-0 text-danger hover:text-danger' onClick={() => clearEntity(e.entity)}>
                                            <Icon name='trash' />
                                        </Button>
                                    </SimpleTooltip>
                                </div>
                            </div>
                        ))}
                    </Panel>
                ) : (
                    <div className='rounded-xl border border-dashed border-border py-12 text-center'>
                        <div className='mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground'>
                            <Icon name='database' />
                        </div>
                        <div className='font-medium'>{t('cache.no_cache_entries')}</div>
                        <p className='mx-auto mb-0 mt-1 max-w-md text-sm text-muted-foreground'>{t('cache.no_cache_entries_desc')}</p>
                    </div>
                )}
            </div>

            {/* Dettaglio */}
            <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
                <DialogContent size='lg'>
                    <DialogHeader>
                        <DialogTitle>{t('cache.cache_entry_details')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {selected && (
                            <>
                                <div className='grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3'>
                                    <Field label={t('cache.type')}><Badge variant={typeVariant(selected.type)}>{selected.type}</Badge></Field>
                                    <Field label={t('cache.entity')}><code>{selected.entity}</code></Field>
                                    <Field label={t('cache.status')}>
                                        {selected.isExpired
                                            ? <Badge variant='warning'>{t('cache.expired')}</Badge>
                                            : <Badge variant='success'>{t('cache.valid')}</Badge>}
                                    </Field>
                                    <Field label={t('cache.cached_at')}>{selected.timestamp.toLocaleString()}</Field>
                                    <Field label={t('cache.expires_at')}>{selected.expiry.toLocaleString()}</Field>
                                    <Field label={t('cache.size')}>{formatBytes(selected.size)}</Field>
                                </div>
                                <Field label={t('cache.cache_key')} className='mt-5'>
                                    <code className='break-all text-xs'>{selected.key}</code>
                                </Field>
                                <Field label={t('cache.cached_data')} className='mt-5'>
                                    <pre className='mb-0 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs leading-snug'>
                                        {JSON.stringify(selected.data, null, 2)}
                                    </pre>
                                </Field>
                            </>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant='secondary' onClick={() => setSelected(null)}>{t('cache.close')}</Button>
                        {selected && (
                            <Button variant='danger' onClick={() => { clearEntity(selected.entity); setSelected(null); }}>
                                <Icon name='trash' />{t('cache.clear_entity_cache')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Field({ label, children, className }) {
    return (
        <div className={className}>
            <div className='mb-1 text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground'>{label.replace(/:$/, '')}</div>
            <div className='text-sm'>{children}</div>
        </div>
    );
}

function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function typeVariant(type) {
    switch (type) {
        case 'getItems': return 'primary';
        case 'getItem': return 'success';
        case 'searchItems': return 'warning';
        default: return 'secondary';
    }
}
