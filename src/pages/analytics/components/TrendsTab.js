import React, { useState, useEffect } from 'react';
import { Panel } from '../../../components/ui/panel';
import { Select as NativeSelect } from '../../../components/ui/select';
import { Spinner } from '../../../components/ui/spinner';

import { Line } from 'react-chartjs-2';
import { ApiManager } from '../../../core/api-manager';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';

const TrendsTab = ({ timeRange, customDateRange, chartOptions, availableEntities = [] }) => {
    const [loading, setLoading] = useState(true);
    const [selectedEntity, setSelectedEntity] = useState('all');
    const [trendsData, setTrendsData] = useState(null);
    const [generalTrends, setGeneralTrends] = useState(null);

    useEffect(() => {
        loadTrendsData();
    }, [timeRange, customDateRange, selectedEntity]);

    const loadTrendsData = async () => {
        setLoading(true);
        try {
            // Preparazione parametri per l'API
            const apiParams = { timeRange };
            if (timeRange === 'custom' && customDateRange.start && customDateRange.end) {
                apiParams.startDate = customDateRange.start;
                apiParams.endDate = customDateRange.end;
            }

            // Se l'entità selezionata non è "all", aggiungi il filtro entity
            if (selectedEntity && selectedEntity !== 'all') {
                apiParams.entity = selectedEntity;
            }
            // Per "all" non aggiungiamo il parametro entity, così il backend esclude il filtro

            const trendsResponse = await ApiManager.sendAuthenticatedRequest('/analytics/trends', apiParams);
            const trendsResult = trendsResponse?.data || trendsResponse;
            
            setTrendsData(trendsResult);
            setGeneralTrends(trendsResult);
        } catch (error) {
            console.error('Error loading trends data:', error);
            toast.error('Errore nel caricamento dati trends');
        } finally {
            setLoading(false);
        }
    };

    const handleEntityChange = (entity) => {
        setSelectedEntity(entity);
    };

    if (loading) {
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
                        icon='arrow-trend-up'
                        title='Trend temporali'
                        actions={(
                            <NativeSelect size='sm' className='w-auto' value={selectedEntity} onChange={(e) => handleEntityChange(e.target.value)}>
                                <option value="all">Tutte le entità</option>
                                {availableEntities.map(entity => (
                                    <option key={entity} value={entity}>
                                        {entity.charAt(0).toUpperCase() + entity.slice(1)}
                                    </option>
                                ))}
                            </NativeSelect>
                        )}
                    >
                        <div className='py-4' style={{ height: '500px' }}>
                            {trendsData && trendsData.labels && trendsData.labels.length > 0 ? (
                                <Line 
                                    data={{
                                        labels: trendsData.labels || [],
                                        datasets: [
                                            {
                                                label: 'Creazioni',
                                                data: trendsData.created || [],
                                                borderColor: '#28a745',
                                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                                fill: true,
                                                tension: 0.4
                                            },
                                            {
                                                label: 'Modifiche',
                                                data: trendsData.updated || [],
                                                borderColor: '#ffc107',
                                                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                                                fill: true,
                                                tension: 0.4
                                            },
                                            {
                                                label: 'Eliminazioni',
                                                data: trendsData.deleted || [],
                                                borderColor: '#dc3545',
                                                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                                fill: true,
                                                tension: 0.4
                                            }
                                        ]
                                    }}
                                    options={{
                                        ...chartOptions,
                                        interaction: {
                                            mode: 'index',
                                            intersect: false,
                                        },
                                        plugins: {
                                            ...chartOptions.plugins,
                                            tooltip: {
                                                callbacks: {
                                                    title: (context) => {
                                                        return `Data: ${context[0].label}`;
                                                    }
                                                }
                                            }
                                        }
                                    }}
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    <div className="text-center">
                                        <Icon name="chart-line" size="3x" className="mb-4" />
                                        <p>Nessun dato disponibile per il periodo selezionato</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Panel>
                </div>
            </div>
        </>
    );
};

export default TrendsTab;