import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Table } from '../../ui/table';
import { Spinner } from '../../ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import FieldPreviewSimple from '../../Entity/FieldPreviewSimple';
import ModalDetailsActionsHook from '../../../components/Hooks/ModalDetailsActions';
import { settings } from '../../../config/settings';


export default function ModalDetails({ entity, props, data = null, closeModalDetails, entityAllPreferences = null }) {

    const excluded = ['deleted'];
    const [statusModalDetails, setStatusModalDetails] = useState(false);
    const [selectedPreference, setSelectedPreference] = useState(null);
    const [visibleColumns, setVisibleColumns] = useState(null);

    useEffect(() => {
        if (data === null)
            setStatusModalDetails(false)
        else
            setStatusModalDetails(true)
    }, [data]);

    // Gestione preferenze
    const handlePreferenceClick = (preference) => {
        if (preference === 'all') {
            setSelectedPreference('all');
            setVisibleColumns(null); // null significa mostra tutto
        } else {
            setSelectedPreference(preference.id);
            try {
                const content = typeof preference.content === 'string'
                    ? JSON.parse(preference.content)
                    : preference.content;
                setVisibleColumns(content?.columns || []);
            } catch (e) {
                console.error('Errore nel parsing della preferenza:', e);
                setVisibleColumns(null);
            }
        }
    };

    // Controlla se una colonna deve essere visualizzata
    const shouldShowColumn = (columnName) => {
        if (visibleColumns === null) return true; // Mostra tutto
        return visibleColumns.includes(columnName);
    };



    if (props !== null) {
        return (
            <>
                <Dialog open={statusModalDetails} onOpenChange={(open) => { if (!open) closeModalDetails() }}>
                    <DialogContent
                        size={settings.modalDefaultSize && settings.modalDefaultSize.details ? settings.modalDefaultSize.details : "xl"}
                        id={'modal-details-' + entity}
                        onPointerDownOutside={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle>{LanguageProvider.get('defaults.details')} - {LanguageProvider.get('entity.' + entity)}</DialogTitle>
                        </DialogHeader>
                        <DialogBody>
                            {data !== null ? (
                                <>
                                    {entityAllPreferences !== null && (
                                        <div className="mb-4 flex flex-wrap gap-2">
                                            <Badge
                                                variant={selectedPreference === 'all' || selectedPreference === null ? 'primary' : 'secondary'}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handlePreferenceClick('all')}
                                            >
                                                Visualizza tutto
                                            </Badge>
                                            {entityAllPreferences.map((pref) => (
                                                <Badge
                                                    key={pref.id}
                                                    variant={selectedPreference === pref.id ? 'primary' : 'secondary'}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handlePreferenceClick(pref)}
                                                >
                                                    {pref.label || '(senza nome)'}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                    <Table striped responsive className='mb-0 border text-sm [&>tbody>tr>td]:border' style={{ tableLayout: 'fixed' }}>
                                        <tbody>
                                            {Object.keys(data).map((key, i) => {
                                                if (!excluded.includes(key) && shouldShowColumn(key)) {
                                                    return (
                                                        <tr key={i} data-name={'modal-details-field-' + key}>
                                                            {/* td, non th: il bg-card del th copriva lo striping
                                                                e la colonna sinistra restava sempre bianca */}
                                                            <td colSpan={2} className='text-left font-semibold'>
                                                                <span>{LanguageProvider.getLabel(entity, key)}</span>
                                                            </td>
                                                            <td colSpan={3}>
                                                                <FieldPreviewSimple item={data} field={key} props={props} entity={entity} />
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                                return null;
                                            })}
                                        </tbody>
                                    </Table>
                                </>
                            ) : (
                                <div className='text-center'>
                                    <Spinner size='sm' />
                                </div>
                            )}
                        </DialogBody>
                        <DialogFooter>
                            <ModalDetailsActionsHook entity={entity} data={data} />

                            <Button variant="secondary" onClick={closeModalDetails}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
};
