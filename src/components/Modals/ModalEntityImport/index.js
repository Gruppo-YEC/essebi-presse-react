import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Alert } from '../../ui/alert';
import { Spinner } from '../../ui/spinner';
import { FileDropzone } from '../../ui/picker-box';
import { SwitchField } from '../../ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import { ApiManager } from '../../../core/api-manager';
import { CacheManager } from '../../../core/cache-manager';
import { Utils } from '../../../core/utils';
import { settings } from '../../../config/settings';
import './ImportTable.css';
import Icon from '../../BodyElements/Icon';

export default function ModalEntityImport({ entity, props, status, close, refreshData }) {

    const [step, setStep] = useState(1); // 1: upload, 2: preview, 3: result
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState(null);
    const [parsedData, setParsedData] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [error, setError] = useState('');
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);

    // Check if entity is a SQL view (starts with gyv_)
    const isSqlView = entity && entity.startsWith('gyv_');

    useEffect(() => {
        if (!status) {
            // Reset when modal closes
            setStep(1);
            setFileData(null);
            setParsedData(null);
            setImportResult(null);
            setError('');
        }
    }, [status]);

    function closeModal() {
        close();
    }

    // Download template
    async function downloadTemplate() {
        setLoading(true);
        setError('');

        try {
            const response = await ApiManager.sendAuthenticatedRequest('/utils/import_download_template', {
                entity: entity
            });

            if (response.success === 1) {
                Utils.downloadBase64(response.data);
            } else {
                setError(response.message || LanguageProvider.get('import.download_template_error') || 'Failed to download template');
            }
        } catch (e) {
            setError(LanguageProvider.get('import.download_template_error') || 'Error downloading template');
        }

        setLoading(false);
    }

    // Download full data
    async function downloadFullData() {
        setLoading(true);
        setError('');

        // Always use export for import (with labels)
        await exportForImport(1, 100000);
    }
    async function exportForImport(page, limit) {
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
                order: ' id ASC',
                query: null,
                fields: null,
                constraints: null,
                translations: translations
            });

            if (response.success === 1 && response.data) {
                Utils.downloadBase64(response.data);
            } else {
                setError(response.message || LanguageProvider.get('import.export_failed'));
            }
        } catch (e) {
            setError(LanguageProvider.get('import.export_error'));
        }

        setLoading(false)
    }


    // Handle file upload
    function handleFileUpload(e) {
        const file = e.target.files[0];
        /* Azzerato subito: cosi' riscegliere lo stesso file dopo un errore fa
           scattare di nuovo onChange. */
        e.target.value = '';
        if (!file) return;

        // Check file type
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

        if (!validTypes.includes(fileExt)) {
            setError(LanguageProvider.get('import.invalid_file_type'));
            return;
        }

        setError('');
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target.result;
            // Convert ArrayBuffer to base64 in chunks to avoid stack overflow
            const base64 = arrayBufferToBase64(content);
            setFileData({
                name: file.name,
                content: base64,
                type: fileExt
            });
            parseFile(base64);
        };

        reader.readAsArrayBuffer(file);
    }

    // Helper function to convert ArrayBuffer to base64 in chunks
    function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 8192; // Process 8KB at a time
        let binary = '';

        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }

        return btoa(binary);
    }

    // Parse uploaded file
    async function parseFile(fileContent) {
        setLoading(true);
        setError('');

        try {
            const response = await ApiManager.sendAuthenticatedRequest('/utils/import_parse_file', {
                entity: entity,
                fileContent: fileContent
            });

            if (response.success === 1) {
                setParsedData(response.data);
                setStep(2);
            } else {
                /* Messaggio e dettagli in un'unica stringa: setError due volte di
                   seguito leggeva lo stato vecchio e perdeva il messaggio. */
                const lines = [response.message || LanguageProvider.get('import.parse_file_error')];
                if (Array.isArray(response.errors)) lines.push(...response.errors);
                setError(lines.join('\n'));
            }
        } catch (e) {
            setError(LanguageProvider.get('import.parse_file_error'));
        }

        setLoading(false);
    }

    // Execute import
    async function executeImport() {
        if (!parsedData || !parsedData.rows) return;

        setLoading(true);
        setError('');

        try {
            const response = await ApiManager.sendAuthenticatedRequest('/utils/import_execute', {
                entity: entity,
                rows: parsedData.rows
            });

            if (response.success === 1) {
                setImportResult(response.results);
                setStep(3);

                // Clear cache for the imported entity
                await CacheManager.invalidateEntity(entity);

                // Refresh the data grid
                if (refreshData) {
                    console.log('Refreshing data after import')
                    refreshData();
                }
            } else {
                const lines = [response.message || LanguageProvider.get('import.import_error')];
                if (response.results?.errors) {
                    lines.push(...response.results.errors.map(e => `${LanguageProvider.get('import.row')} ${e.row}: ${e.errors.join(', ')}`));
                }
                setError(lines.join('\n'));
            }
        } catch (e) {
            setError(LanguageProvider.get('import.import_execute_error'));
        }

        setLoading(false);
    }

    // Reset to start
    function reset() {
        setStep(1);
        setFileData(null);
        setParsedData(null);
        setImportResult(null);
        setError('');
    }

    // Get field type icon
    function getFieldIcon(fieldName, fieldConfig) {
        if (!fieldConfig) return <Icon name="question" className="field-icon me-1" />;

        const type = fieldConfig.input_type || 'string';
        const iconMap = {
            string: 'font',
            text: 'align-left',
            richText: 'pen-to-square',
            number: 'hashtag',
            float: 'calculator',
            currency: 'dollar-sign',
            boolean: 'toggle-on',
            date: 'calendar-day',
            datetime: 'clock',
            time: 'clock',
            option: 'list',
            externalEntity: 'link',
            file: 'file',
            password: 'lock',
            color: 'palette',
            address: 'location-dot'
        };

        return <Icon name={iconMap[type] || 'question'} className="field-icon me-1" />;
    }

    // Get row status badge
    function getRowStatusBadge(row) {
        if (row.errors && row.errors.length > 0) {
            return <Badge variant="danger">{LanguageProvider.get('import.error_badge')}</Badge>;
        }
        if (row.warnings && row.warnings.length > 0) {
            return <Badge variant="warning">{LanguageProvider.get('import.warning_badge')}</Badge>;
        }
        if (row.action === 'update') {
            return <Badge variant="info">{LanguageProvider.get('import.update_badge')}</Badge>;
        }
        return <Badge variant="success">{LanguageProvider.get('import.insert_badge')}</Badge>;
    }

    // Get field display value
    function getFieldDisplay(row, fieldName) {
        const value = row.data[fieldName];

        // Check if this is a resolved external entity
        if (row._resolved && row._resolved[fieldName]) {
            const resolved = row._resolved[fieldName];
            return (
                <span>
                    {resolved.label}
                    <Badge variant="secondary" className="ms-1">ID: {resolved.id}</Badge>
                </span>
            );
        }

        // Regular value
        if (value === null || value === undefined) {
            return <span className="text-muted-foreground">-</span>;
        }

        if (typeof value === 'boolean') {
            return value ? LanguageProvider.get('import.yes') : LanguageProvider.get('import.no');
        }

        return String(value);
    }

    if (props !== null && status !== false) {
        return (
            <>
                <Dialog open={status} onOpenChange={(open) => { if (!open) closeModal() }}>
                    <DialogContent
                        size={settings.modalDefaultSize && settings.modalDefaultSize.entityImport ? settings.modalDefaultSize.entityImport : "xl"}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                {LanguageProvider.get('defaults.import')} - {LanguageProvider.get('entity.'+entity)}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody id="modal-entity-import-body">
                            {isSqlView && (
                                <div className="px-6 py-10 text-center">
                                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
                                        <Icon name="triangle-exclamation" />
                                    </div>
                                    <div className="font-medium">{LanguageProvider.get('import.import_not_available')}</div>
                                    <p className="mx-auto mb-0 mt-1 max-w-md text-sm text-muted-foreground">
                                        {LanguageProvider.get('import.sql_view_notice')} {LanguageProvider.get('import.sql_view_desc').replace('{entity}', entity)}
                                    </p>
                                    <p className="mx-auto mb-0 mt-3 max-w-md text-xs text-muted-foreground">{LanguageProvider.get('import.sql_view_note')}</p>
                                </div>
                            )}

                            {!isSqlView && loading && (
                                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                                    <Spinner size="sm" />{LanguageProvider.get('import.processing')}
                                </div>
                            )}

                            {!isSqlView && !loading && step === 1 && (
                                <>
                                    <div className="mb-4">
                                        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-medium">{LanguageProvider.get('import.step1_title')}</div>
                                                <div className="text-xs text-muted-foreground">{LanguageProvider.get('import.step1_desc')}</div>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <Button variant="outline-secondary" size="sm" onClick={downloadTemplate}>
                                                    <Icon name="download" />{LanguageProvider.get('import.download_template')}
                                                </Button>
                                                <Button variant="outline-secondary" size="sm" onClick={downloadFullData}>
                                                    <Icon name="download" />{LanguageProvider.get('import.download_full_dataset')}
                                                </Button>
                                            </div>
                                        </div>

                                        <FileDropzone
                                            accept=".csv,.xlsx,.xls"
                                            onChange={handleFileUpload}
                                            label={fileData ? fileData.name : LanguageProvider.get('import.upload_file')}
                                            hint={LanguageProvider.get('import.accepted_formats')}
                                        />
                                    </div>

                                    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                                        <div className="mb-1 text-xs font-medium">{LanguageProvider.get('import.instructions')}</div>
                                        <ul className="mb-0 list-disc ps-4 text-xs text-muted-foreground">
                                            <li>{LanguageProvider.get('import.instruction1')}</li>
                                            <li>{LanguageProvider.get('import.instruction2')}</li>
                                            <li>{LanguageProvider.get('import.instruction3')}</li>
                                            <li>{LanguageProvider.get('import.instruction4')}</li>
                                            <li>{LanguageProvider.get('import.instruction5')}</li>
                                        </ul>
                                    </div>
                                </>
                            )}

                            {!isSqlView && !loading && step === 2 && parsedData && (
                                <>
                                    <div className="mb-4">
                                        <div className="text-sm font-medium">{LanguageProvider.get('import.step2_title')}</div>
                                        <div className="mb-3 text-xs text-muted-foreground">{LanguageProvider.get('import.step2_desc')}</div>

                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap gap-1.5">
                                            <Badge variant="success">{LanguageProvider.get('import.valid_rows')}: {parsedData.rows.filter(r => !r.errors || r.errors.length === 0).length}</Badge>
                                            {' '}
                                            <Badge variant="danger">{LanguageProvider.get('import.errors')}: {parsedData.rows.filter(r => r.errors && r.errors.length > 0).length}</Badge>
                                            {' '}
                                            <Badge variant="info">{LanguageProvider.get('import.updates')}: {parsedData.rows.filter(r => r.action === 'update').length}</Badge>
                                            {' '}
                                            <Badge variant="primary">{LanguageProvider.get('import.inserts')}: {parsedData.rows.filter(r => r.action === 'insert').length}</Badge>
                                            </div>
                                            <SwitchField
                                                className="text-sm"
                                                label={LanguageProvider.get('import.show_only_errors')}
                                                checked={showOnlyErrors}
                                                onCheckedChange={(checked) => setShowOnlyErrors(checked === true)}
                                            />
                                        </div>

                                        <div className="import-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                            <table className="import-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 50 }}>{LanguageProvider.get('import.row')}</th>
                                                        <th style={{ width: 100 }}>{LanguageProvider.get('import.status')}</th>
                                                        {parsedData.headers.map((header, i) => (
                                                            <th key={i}>
                                                                {getFieldIcon(header, parsedData.importableFields?.[header])}
                                                                {LanguageProvider.getLabel(entity, header) || header}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {parsedData.rows
                                                        .filter(row => !showOnlyErrors || (row.errors && row.errors.length > 0))
                                                        .map((row, i) => (
                                                        <tr key={i} className={row.errors && row.errors.length > 0 ? 'is-error' : ''}>
                                                            <td>{row._original_row || i + 1}</td>
                                                            <td>{getRowStatusBadge(row)}</td>
                                                            {parsedData.headers.map((header, j) => (
                                                                <td key={j}>
                                                                    {getFieldDisplay(row, header)}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Show errors */}
                                        {parsedData.rows.some(r => r.errors && r.errors.length > 0) && (
                                            <Alert variant="danger" className="mt-4">
                                                <div className="mb-1 text-sm font-medium">{LanguageProvider.get('import.errors_found')}</div>
                                                <ul className="mb-0 list-disc ps-4 text-xs">
                                                    {parsedData.rows.filter(r => r.errors && r.errors.length > 0).map((row, i) => (
                                                        <li key={i}>
                                                            {LanguageProvider.get('import.row')} {row._original_row || i + 1}: {row.errors.join(', ')}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Alert>
                                        )}
                                    </div>
                                </>
                            )}

                            {!isSqlView && !loading && step === 3 && importResult && (
                                <>
                                    <div className="mb-4">
                                        <div className="mb-3 text-sm font-medium">{LanguageProvider.get('import.step3_title')}</div>

                                        <Alert variant="success">
                                            <div className="mb-1 text-sm font-medium">{LanguageProvider.get('import.import_summary')}</div>
                                            <ul className="mb-0 list-disc ps-4 text-sm">
                                                <li>{LanguageProvider.get('import.records_inserted')}: {importResult.inserted}</li>
                                                <li>{LanguageProvider.get('import.records_updated')}: {importResult.updated}</li>
                                                {importResult.errors && importResult.errors.length > 0 && (
                                                    <li>{LanguageProvider.get('import.errors')}: {importResult.errors.length}</li>
                                                )}
                                            </ul>
                                        </Alert>

                                        {importResult.errors && importResult.errors.length > 0 && (
                                            <Alert variant="danger" className="mt-3">
                                                <div className="mb-1 text-sm font-medium">{LanguageProvider.get('import.errors')}</div>
                                                <ul className="mb-0 list-disc ps-4 text-xs">
                                                    {importResult.errors.map((err, i) => (
                                                        <li key={i}>
                                                            {LanguageProvider.get('import.row')} {err.row}: {err.errors.join(', ')}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </Alert>
                                        )}
                                    </div>
                                </>
                            )}

                            {error && (
                                <Alert variant="danger" className='mt-4'>
                                    <pre className="mb-0 whitespace-pre-wrap font-sans text-sm">{error}</pre>
                                </Alert>
                            )}
                        </DialogBody>
                        <DialogFooter>
                            {(isSqlView || step === 1) && (
                                <Button variant="secondary" size="sm" onClick={closeModal}>
                                    {LanguageProvider.get('defaults.close')}
                                </Button>
                            )}

                            {!isSqlView && step === 2 && (
                                <>
                                    <Button variant="ghost" size="sm" onClick={closeModal}>
                                        {LanguageProvider.get('defaults.cancel')}
                                    </Button>
                                    <Button variant="outline-secondary" size="sm" onClick={reset}>
                                        <Icon name="arrow-left" />{LanguageProvider.get('import.back')}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={executeImport}
                                        disabled={!parsedData || parsedData.rows.some(r => r.errors && r.errors.length > 0)}
                                    >
                                        <Icon name="upload" />{LanguageProvider.get('import.execute_import')}
                                    </Button>
                                </>
                            )}

                            {!isSqlView && step === 3 && (
                                <>
                                    <Button variant="secondary" size="sm" onClick={closeModal}>
                                        {LanguageProvider.get('defaults.close')}
                                    </Button>
                                    <Button variant="primary" size="sm" onClick={reset}>
                                        <Icon name="plus" />{LanguageProvider.get('import.import_more')}
                                    </Button>
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return null;
};
