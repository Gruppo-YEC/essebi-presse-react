import React, { useState, useEffect } from 'react';
import { Panel, Stat } from '../../../components/ui/panel';
import { Spinner } from '../../../components/ui/spinner';
import { Doughnut } from 'react-chartjs-2';
import { ApiManager } from '../../../core/api-manager';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';

const OverviewTab = ({ timeRange, customDateRange, chartOptions }) => {
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState(null);
    const [availableEntities, setAvailableEntities] = useState([]);
    const [hiddenEntities, setHiddenEntities] = useState(['user_group', 'auth_token', 'auth_pin', 'user_entity_saved_filters', 'user_entity_preferences', 'log']);

    useEffect(() => {
        loadOverviewData();
    }, [timeRange, customDateRange]);

    const loadOverviewData = async () => {
        setLoading(true);
        try {
            // Preparazione parametri per l'API
            const apiParams = { timeRange };
            if (timeRange === 'custom' && customDateRange.start && customDateRange.end) {
                apiParams.startDate = customDateRange.start;
                apiParams.endDate = customDateRange.end;
            }

            const response = await ApiManager.sendAuthenticatedRequest('/analytics/overview', apiParams);

            const processedData = response?.data || response;
            setOverviewData(processedData);
            
            if (processedData?.availableEntities) {
                setAvailableEntities(processedData.availableEntities);
            }
        } catch (error) {
            console.error('Error loading overview data:', error);
            toast.error('Errore nel caricamento dati overview');
        } finally {
            setLoading(false);
        }
    };

    // Ottieni tutte le entità (visibili e nascoste)
    const getAllEntities = () => {
        return overviewData?.entities || {};
    };

    // Filtra entità per il grafico (solo quelle non nascoste)
    const getChartEntities = () => {
        if (!overviewData?.entities) return {};
        
        const filtered = {};
        Object.entries(overviewData.entities).forEach(([entity, data]) => {
            if (!hiddenEntities.includes(entity)) {
                filtered[entity] = data;
            }
        });
        return filtered;
    };

    // Toggle visibilità entità
    const toggleEntityVisibility = (entity) => {
        setHiddenEntities(prev => {
            if (prev.includes(entity)) {
                return prev.filter(e => e !== entity);
            } else {
                return [...prev, entity];
            }
        });
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
            {/* Numeri */}
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon="users" label="Utenti attivi" value={overviewData?.activeUsers || 0}>
                    <Change value={overviewData?.usersChange} />
                </Stat>
                <Stat icon="chart-line" label="Operazioni" value={overviewData?.todayOperations || 0}>
                    <Change value={overviewData?.operationsChange} />
                </Stat>
                <Stat icon="boxes-stacked" label="Entità totali" value={availableEntities?.length || overviewData?.availableEntities?.length || 0} />
                <Stat icon="gauge-high" label="Sistema" value="Attivo" />
            </div>

            {/* Distribuzione Entità */}
            <div>
                <div>
                    <Panel icon="chart-pie" title="Distribuzione entità">
                        <div className="py-4">
                            {(() => {
                                const allEntities = getAllEntities();
                                const chartEntities = getChartEntities();
                                const allEntityKeys = Object.keys(allEntities);
                                const chartEntityKeys = Object.keys(chartEntities);
                                
                                if (allEntityKeys.length === 0) {
                                    return (
                                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                                            <div className="text-center">
                                                <Icon name="chart-pie" size="3x" className="mb-4" />
                                                <p>Nessun dato disponibile per la distribuzione entità</p>
                                            </div>
                                        </div>
                                    );
                                }

                                const colors = [
                                    '#5887da', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
                                    '#6c757d', '#fd7e14', '#e83e8c', '#20c997', '#6f42c1',
                                    '#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0',
                                    '#9966ff', '#ff9f40', '#ff6633', '#45b7d1', '#96ceb4'
                                ];

                                return (
                                    <>
                                        {/* Lista entità sopra il grafico */}
                                        <div className="mb-6">
                                            <div className="mb-3 text-xs text-muted-foreground">Clicca un'entità per mostrarla o nasconderla nel grafico</div>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                                {allEntityKeys.map((entity, index) => {
                                                    const isHidden = hiddenEntities.includes(entity);
                                                    return (
                                                        <button
                                                            key={entity}
                                                            type="button"
                                                            className={`flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent ${isHidden ? 'opacity-50' : ''}`}
                                                            onClick={() => toggleEntityVisibility(entity)}
                                                            title={isHidden ? 'Clicca per mostrare nel grafico' : 'Clicca per nascondere dal grafico'}
                                                        >
                                                            <span
                                                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                                style={{ backgroundColor: isHidden ? 'var(--muted-foreground)' : colors[index % colors.length] }}
                                                            />
                                                            <span className="min-w-0 grow">
                                                                <span className="block truncate text-sm font-medium">
                                                                    {entity.charAt(0).toUpperCase() + entity.slice(1).replace(/_/g, ' ')}
                                                                </span>
                                                                <span className="block text-xs text-muted-foreground">
                                                                    {allEntities[entity]?.total || 0} record
                                                                </span>
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Grafico a torta */}
                                        {chartEntityKeys.length > 0 ? (
                                            <div style={{ height: '400px', position: 'relative' }}>
                                                <Doughnut 
                                                    data={{
                                                        labels: chartEntityKeys.map(entity => 
                                                            entity.charAt(0).toUpperCase() + entity.slice(1).replace(/_/g, ' ')
                                                        ),
                                                        datasets: [{
                                                            data: chartEntityKeys.map(entity => chartEntities[entity]?.total || 0),
                                                            backgroundColor: chartEntityKeys.map(entity => {
                                                                const originalIndex = allEntityKeys.indexOf(entity);
                                                                return colors[originalIndex % colors.length];
                                                            })
                                                        }]
                                                    }}
                                                    options={{
                                                        ...chartOptions,
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            ...chartOptions.plugins,
                                                            legend: {
                                                                display: false
                                                            },
                                                            tooltip: {
                                                                callbacks: {
                                                                    label: function(context) {
                                                                        const entity = chartEntityKeys[context.dataIndex];
                                                                        const data = chartEntities[entity];
                                                                        return `${entity}: ${data?.total || 0} record`;
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center text-muted-foreground">
                                                <p>Seleziona almeno un'entità per visualizzare il grafico</p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </Panel>
                </div>
            </div>
        </>
    );
};

/** Variazione percentuale sotto un numero: verde se sale, rossa se scende. */
function Change({ value }) {
    if (!value) return null;
    const up = value > 0;
    return (
        <div className={'mt-1 text-xs ' + (up ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300')}>
            <Icon name={up ? 'arrow-trend-up' : 'arrow-trend-down'} size='xs' className='me-1' />{up ? '+' : ''}{value}%
        </div>
    );
}

export default OverviewTab;