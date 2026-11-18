import React, { useState, useEffect } from 'react';
import { Panel } from '../../../components/ui/panel';
import { Spinner } from '../../../components/ui/spinner';

import { Line } from 'react-chartjs-2';
import { ApiManager } from '../../../core/api-manager';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';

const SessionsTab = ({ timeRange, customDateRange, chartOptions }) => {
    const [loading, setLoading] = useState(true);
    const [sessionsData, setSessionsData] = useState(null);

    useEffect(() => {
        loadSessionsData();
    }, [timeRange, customDateRange]);

    const loadSessionsData = async () => {
        setLoading(true);
        try {
            // Preparazione parametri per l'API
            const apiParams = { timeRange };
            if (timeRange === 'custom' && customDateRange.start && customDateRange.end) {
                apiParams.startDate = customDateRange.start;
                apiParams.endDate = customDateRange.end;
            }

            const response = await ApiManager.sendAuthenticatedRequest('/analytics/sessions', apiParams);
            setSessionsData(response?.data || response);
        } catch (error) {
            console.error('Error loading sessions data:', error);
            toast.error('Errore nel caricamento dati sessioni');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Spinner role="status" />
            </div>
        );
    }

    return (
        <div>
            <div>
                <Panel icon='users' title='Login / Logout'>
                    <div className='py-4' style={{ height: '500px' }}>
                        {sessionsData?.logins && sessionsData?.logouts && sessionsData.labels ? (
                            <Line 
                                data={{
                                    labels: sessionsData.labels,
                                    datasets: [
                                        {
                                            label: 'Login',
                                            data: sessionsData.logins,
                                            borderColor: '#17a2b8',
                                            backgroundColor: 'rgba(23, 162, 184, 0.1)',
                                            fill: true,
                                            tension: 0.4
                                        },
                                        {
                                            label: 'Logout',
                                            data: sessionsData.logouts,
                                            borderColor: '#6c757d',
                                            backgroundColor: 'rgba(108, 117, 125, 0.1)',
                                            fill: true,
                                            tension: 0.4
                                        }
                                    ]
                                }}
                                options={chartOptions}
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Icon name="chart-line" size="3x" className="mb-4" />
                                    <p>Dati login/logout non disponibili</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Panel>
            </div>
        </div>
    );
};

export default SessionsTab;