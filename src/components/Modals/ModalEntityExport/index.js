import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Alert } from '../../ui/alert';
import { Spinner } from '../../ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { ApiManager } from '../../../core/api-manager';
import { Utils } from '../../../core/utils';
import Icon from '../../BodyElements/Icon';


export default function ModalEntityExport({ entity, props, entityPreferences, status, close, params, searchObj }) {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    function closeModal() {
        setLoading(false)
        setError('')
        close()
    }

    async function exportAll() {
        if(loading === false) {
            setLoading(true)
            setError('')

            // Export all columns
            await exportForImport(1, 100000, null);
        }
    }

    async function exportVisibleColumns() {
        if(loading === false) {
            setLoading(true)
            setError('')

            // Export only visible columns from entityPreferences, always include 'id'
            let visibleColumns = entityPreferences?.columns || null;
            if (visibleColumns && !visibleColumns.includes('id')) {
                visibleColumns = ['id', ...visibleColumns];
            }
            await exportForImport(1, 100000, visibleColumns);
        }
    }

    async function exportForImport(page, limit, columns) {
        try {
            // Build translations object from entity_language
            const translations = {};
            if (props && props.columns) {
                Object.keys(props.columns).forEach(fieldName => {
                    const translation = LanguageProvider.getLabel(entity, fieldName);
                    if (translation) {
                        translations[fieldName] = translation;
                    }
                });
            }

            const response = await ApiManager.sendAuthenticatedRequest('/utils/export_for_import', {
                entity: entity,
                offset: (page - 1) * limit,
                limit: limit,
                order: params.sortingField + ' ' + params.sortingOrder,
                query: searchObj.query || null,
                fields: searchObj.fields || null,
                constraints: searchObj.constraints || null,
                translations: translations,
                /* searchObj.fields sono i campi su cui cerca il testo libero, non
                   le colonne: le colonne da esportare vanno passate intere. */
                columns: columns
            });

            if (response.success === 1 && response.data) {
                Utils.downloadBase64(response.data);
                closeModal();
            } else {
                setError(response.message || LanguageProvider.get('export.export_error'));
            }
        } catch (e) {
            setError(LanguageProvider.get('export.export_error'));
        }

        setLoading(false)
    }


    if(props !== null && status !== false) {
        return (
            <>
                <Dialog open={status} onOpenChange={(open) => { if (!open) closeModal() }}>
                    <DialogContent size="lg">
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('defaults.export')} - {LanguageProvider.get('entity.'+entity)}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            {loading === false &&
                                <div className='py-2'>
                                    <div className='text-sm font-medium'>{LanguageProvider.get('export.export_options')}</div>
                                    <div className='mb-4 text-xs text-muted-foreground'>{LanguageProvider.get('export.export_description')}</div>

                                    <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                                        <button type='button' onClick={exportVisibleColumns} className='flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/60'>
                                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary'>
                                                <Icon name='table-columns' />
                                            </div>
                                            <div className='min-w-0'>
                                                <div className='text-sm font-medium'>{LanguageProvider.get('export.export_visible_columns')}</div>
                                                <div className='text-xs text-muted-foreground'>{LanguageProvider.get('export.export_visible_columns_description')}</div>
                                            </div>
                                        </button>
                                        <button type='button' onClick={exportAll} className='flex items-start gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/60'>
                                            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
                                                <Icon name='table' />
                                            </div>
                                            <div className='min-w-0'>
                                                <div className='text-sm font-medium'>{LanguageProvider.get('export.export_all')}</div>
                                                <div className='text-xs text-muted-foreground'>{LanguageProvider.get('export.export_all_records')}</div>
                                            </div>
                                        </button>
                                    </div>

                                    {error && (
                                        <Alert variant='danger' className='mt-4'>
                                            {error}
                                        </Alert>
                                    )}

                                    <div className='mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3'>
                                        <ul className='mb-0 list-disc ps-4 text-xs text-muted-foreground'>
                                            <li>{LanguageProvider.get('export.excel_format_info')}</li>
                                            <li>{LanguageProvider.get('export.system_fields_excluded')}</li>
                                            <li>{LanguageProvider.get('export.private_fields_excluded')}</li>
                                            {entity && entity.startsWith('gyv_') ? (
                                                <li>{LanguageProvider.get('export.mysql_view_entity')}: {LanguageProvider.get('export.cannot_import_view').toLowerCase()}</li>
                                            ) : (
                                                <li>{LanguageProvider.get('export.import_compatible_format')}</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            }
                            {loading === true &&
                                <div className='flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground'>
                                    <Spinner size='sm' />{LanguageProvider.get('export.preparing_export')}
                                </div>
                            }
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="secondary" size="sm" onClick={closeModal}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
};
