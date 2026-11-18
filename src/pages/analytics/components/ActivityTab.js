import React, { useState, useEffect, useRef } from 'react';
import { Panel } from '../../../components/ui/panel';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';
import { Badge } from '../../../components/ui/badge';
import { Table } from '../../../components/ui/table';
import { Input } from '../../../components/ui/input';
import { Pagination, PaginationItem, PaginationFirst, PaginationPrev, PaginationNext, PaginationLast } from '../../../components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../components/ui/dialog';
import { ApiManager } from '../../../core/api-manager';
import { DataManager } from '../../../core/data-manager';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';

const ActivityTab = ({ timeRange, customDateRange }) => {
    const [loading, setLoading] = useState(true);
    const [activityLog, setActivityLog] = useState([]);
    const [showItemModal, setShowItemModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loadingItem, setLoadingItem] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const recordsPerPage = 50;

    /* La ricerca passa da un valore "assestato" con debounce: si interroga il
       server solo quando si smette di digitare, e si torna a pagina 1 solo
       quando il termine e' davvero cambiato (non al montaggio). */
    const [search, setSearch] = useState('');
    const firstSearchRun = useRef(true);
    useEffect(() => {
        if (firstSearchRun.current) { firstSearchRun.current = false; return; }
        const timer = setTimeout(() => {
            setSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    /* Un solo caricamento per ogni combinazione di filtri e pagina. */
    useEffect(() => {
        loadActivityData();
    }, [timeRange, customDateRange, currentPage, search]);

    const loadActivityData = async () => {
        setLoading(true);
        try {
            // Preparazione parametri per l'API
            const apiParams = {
                timeRange,
                limit: recordsPerPage,
                page: currentPage,
                search: search
            };
            if (timeRange === 'custom' && customDateRange.start && customDateRange.end) {
                apiParams.startDate = customDateRange.start;
                apiParams.endDate = customDateRange.end;
            }

            const response = await ApiManager.sendAuthenticatedRequest('/analytics/activity', apiParams);

            const responseData = response?.data || response || {};
            setActivityLog(responseData.records || []);
            setTotalRecords(responseData.total || 0);
            setTotalPages(Math.ceil((responseData.total || 0) / recordsPerPage));
        } catch (error) {
            console.error('Error loading activity data:', error);
            toast.error('Errore nel caricamento log attività');
        } finally {
            setLoading(false);
        }
    };

    const handleViewItem = async (entity, itemId) => {
        setLoadingItem(true);
        setShowItemModal(true);
        try {
            // Usa DataManager.getItem per recuperare l'elemento
            const response = await DataManager.getItem(entity, itemId);

            // Estrai solo il body dalla risposta
            const itemData = response?.body || response;

            if (itemData) {
                setSelectedItem({
                    entity,
                    id: itemId,
                    data: itemData
                });
            } else {
                throw new Error('Elemento non trovato');
            }
        } catch (error) {
            console.error('Error loading item:', error);
            toast.error('Errore nel caricamento dell\'elemento');
            setShowItemModal(false);
        } finally {
            setLoadingItem(false);
        }
    };

    const getOperationIcon = (operation) => {
        switch(operation) {
            case '2_ADD': return 'plus';
            case '1_EDIT': return 'pen-to-square';
            case '0_DELETE': return 'trash';
            case '3_LOGIN': return 'right-to-bracket';
            case '4_LOGOUT': return 'right-from-bracket';
            default: return 'clock';
        }
    };

    const getOperationLabel = (operation) => {
        switch(operation) {
            case '2_ADD': return 'Creazione';
            case '1_EDIT': return 'Modifica';
            case '0_DELETE': return 'Eliminazione';
            case '3_LOGIN': return 'Login';
            case '4_LOGOUT': return 'Logout';
            default: return operation;
        }
    };

    const getOperationColor = (operation) => {
        switch(operation) {
            case '2_ADD': return 'success';
            case '1_EDIT': return 'warning';
            case '0_DELETE': return 'danger';
            case '3_LOGIN': return 'info';
            case '4_LOGOUT': return 'secondary';
            default: return 'dark';
        }
    };

    if (loading && activityLog.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <Spinner role="status" />
            </div>
        );
    }

    return (
        <>
            <div>
                <div>
                    <Panel
                        icon='clock'
                        title={`Log attività${totalRecords ? ` (${totalRecords})` : ''}`}
                        actions={(
                            <Input
                                type="text"
                                placeholder="Cerca utente, entità o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                size="sm"
                                className='w-64'
                            />
                        )}
                    >
                        <div className={'py-3 transition-opacity ' + (loading ? 'opacity-50' : '')}>
                            {activityLog && activityLog.length > 0 ? (
                                <>
                                    <Table responsive hover size="sm" className="text-xs">
                                        <thead>
                                            <tr className='text-muted-foreground [&>th]:font-medium'>
                                                <th>Data/Ora</th>
                                                <th>Utente</th>
                                                <th>Operazione</th>
                                                <th>Entità</th>
                                                <th>ID Elemento</th>
                                                <th>Dettagli</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {activityLog.map((activity, idx) => (
                                            <tr key={idx}>
                                                <td className="whitespace-nowrap">
                                                    {activity.date ? new Date(activity.date).toLocaleString('it-IT') : 'N/A'}
                                                </td>
                                                <td>
                                                    <span className='font-medium'>{activity.username || 'Sistema'}</span>
                                                    {activity.email && (
                                                        <div className="text-muted-foreground">{activity.email}</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge variant={getOperationColor(activity.operation)} className='text-[0.65rem]'>
                                                        <Icon name={getOperationIcon(activity.operation)} className="me-1" />
                                                        {getOperationLabel(activity.operation)}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {activity.entity ? <code>{activity.entity}</code> : '-'}
                                                </td>
                                                <td>
                                                    {activity.idItem && activity.entity && activity.operation !== '3_LOGIN' && activity.operation !== '4_LOGOUT' ? (
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            className="p-0"
                                                            onClick={() => handleViewItem(activity.entity, activity.idItem)}
                                                        >
                                                            <Icon name="eye" className="me-1" />
                                                            {activity.idItem}
                                                        </Button>
                                                    ) : (
                                                        activity.idItem || '-'
                                                    )}
                                                </td>
                                                <td>
                                                    {activity.details || activity.message || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-4 flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            Mostrando {((currentPage - 1) * recordsPerPage) + 1} - {Math.min(currentPage * recordsPerPage, totalRecords)} di {totalRecords} risultati
                                        </div>
                                        <Pagination className='text-sm'>
                                            <PaginationFirst
                                                onClick={() => setCurrentPage(1)}
                                                disabled={currentPage === 1}
                                            />
                                            <PaginationPrev
                                                onClick={() => setCurrentPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                            />

                                            {/* Mostra max 5 pagine */}
                                            {[...Array(Math.min(5, totalPages))].map((_, index) => {
                                                let pageNum = 1;
                                                if (currentPage <= 3) {
                                                    pageNum = index + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + index;
                                                } else {
                                                    pageNum = currentPage - 2 + index;
                                                }

                                                if (pageNum > 0 && pageNum <= totalPages) {
                                                    return (
                                                        <PaginationItem
                                                            key={pageNum}
                                                            active={pageNum === currentPage}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                        >
                                                            {pageNum}
                                                        </PaginationItem>
                                                    );
                                                }
                                                return null;
                                            })}

                                            <PaginationNext
                                                onClick={() => setCurrentPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                            />
                                            <PaginationLast
                                                onClick={() => setCurrentPage(totalPages)}
                                                disabled={currentPage === totalPages}
                                            />
                                        </Pagination>
                                    </div>
                                )}
                                </>
                            ) : (
                                <div className="py-8 text-center text-sm text-muted-foreground">
                                    Nessuna attività nel periodo selezionato
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>
            </div>

            {/* Modal per visualizzazione elemento */}
            <Dialog open={showItemModal} onOpenChange={(open) => { if (!open) setShowItemModal(false) }}>
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle>
                            Dettagli {selectedItem?.entity} #{selectedItem?.id}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {loadingItem ? (
                            <div className="py-6 text-center">
                                <Spinner />
                            </div>
                        ) : selectedItem?.data ? (
                            <pre className="mb-0 rounded-md bg-muted p-4" style={{ fontSize: '0.7rem' }}>
                                {JSON.stringify(selectedItem.data, null, 2)}
                            </pre>
                        ) : (
                            <p>Nessun dato disponibile</p>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowItemModal(false)}>
                            Chiudi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ActivityTab;
