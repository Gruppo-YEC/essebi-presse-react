import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select as NativeSelect } from '../../components/ui/select';
import { Spinner } from '../../components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Card, CardBody } from '../../components/ui/card';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import Icon from '../../components/BodyElements/Icon';
import { ApiManager } from '../../core/api-manager';
import { LoginManager } from '../../core/login-manager';
import { settings } from '../../config/settings';
import { toast } from '../../components/ui/toast';

// Import dei componenti tab
import OverviewTab from './components/OverviewTab';
import TrendsTab from './components/TrendsTab';
import SessionsTab from './components/SessionsTab';
import PerformanceTab from './components/PerformanceTab';
import ActivityTab from './components/ActivityTab';


// Registra i componenti di Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function Analytics() {
    const [userInfo, setUserInfo] = useState(LoginManager.getUserInfo());
    const [canViewAnalytics, setCanViewAnalytics] = useState(false);
    // Stati principali
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('7d');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [availableEntities, setAvailableEntities] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadEntities();
    }, []);


    useEffect(() => {
        if (userInfo !== null && settings.advancedAnalytics && Array.isArray(settings.advancedAnalytics)) {
            setCanViewAnalytics(settings.advancedAnalytics.includes(parseInt(userInfo.level)))
        }
        else {
            setCanViewAnalytics(false)
        }
    }, [userInfo]);


    const loadEntities = async () => {
        try {
            const response = await ApiManager.sendAuthenticatedRequest('/analytics/overview', {
                timeRange: '7d'
            });

            const overviewData = response?.data || response;
            if (overviewData?.availableEntities) {
                setAvailableEntities(overviewData.availableEntities);
            }
        } catch (error) {
            console.error('Error loading entities:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        const startTime = Date.now();

        try {
            // Forza il refresh di tutte le tab triggerando un re-render
            const currentTab = activeTab;
            setActiveTab(''); // Resetta temporaneamente

            // Ricarica le entità
            await loadEntities();

            // Piccolo delay per permettere ai componenti di aggiornarsi
            setTimeout(() => {
                setActiveTab(currentTab); // Ripristina la tab attiva
            }, 100);

        } catch (error) {
            console.error('Error refreshing data:', error);
            toast.error('Errore nel refresh dei dati');
        } finally {
            // Calcola il tempo trascorso e assicura un delay minimo di 2 secondi
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, 2000 - elapsedTime);

            setTimeout(() => {
                setRefreshing(false);
            }, remainingTime);
        }
    };

    // Scarica log CSV
    const exportLogs = async () => {
        setExporting(true);
        try {
            // Prepara i parametri per l'API
            const apiParams = { timeRange };
            if (timeRange === 'custom' && customDateRange.start && customDateRange.end) {
                apiParams.startDate = customDateRange.start;
                apiParams.endDate = customDateRange.end;
            }

            const response = await ApiManager.sendAuthenticatedRequest('/analytics/export', apiParams);
            const responseData = response?.data || response;

            if (responseData?.content && responseData?.filename) {
                // Converti il base64 in blob
                const byteCharacters = atob(responseData.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: responseData.mimeType });

                // Crea un link temporaneo per il download
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = responseData.filename;
                document.body.appendChild(link);
                link.click();

                // Pulisci
                window.URL.revokeObjectURL(url);
                document.body.removeChild(link);

                toast.success('Log scaricati con successo');
            } else {
                throw new Error('Risposta non valida dal server');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Errore nel download dei log');
        } finally {
            setExporting(false);
        }
    };

    // Configurazione grafici
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: document.documentElement.classList.contains('dark-theme-active') ? '#e0e0e0' : '#333'
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        scales: {
            x: {
                grid: {
                    color: document.documentElement.classList.contains('dark-theme-active') ? '#404040' : '#e0e0e0'
                },
                ticks: {
                    color: document.documentElement.classList.contains('dark-theme-active') ? '#b0b0b0' : '#666'
                }
            },
            y: {
                grid: {
                    color: document.documentElement.classList.contains('dark-theme-active') ? '#404040' : '#e0e0e0'
                },
                ticks: {
                    color: document.documentElement.classList.contains('dark-theme-active') ? '#b0b0b0' : '#666'
                }
            }
        }
    };

    return (
        <div className='mb-4 mt-4 w-full px-3'>

            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <h3 className='mb-0'>Analytics</h3>
                {canViewAnalytics === true && (
                    <div className='flex flex-wrap items-center gap-2'>
                        <NativeSelect size='sm' className='w-auto' value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                            <option value="24h">Ultime 24 ore</option>
                            <option value="7d">Ultimi 7 giorni</option>
                            <option value="30d">Ultimi 30 giorni</option>
                            <option value="custom">Personalizzato</option>
                        </NativeSelect>
                        {timeRange === 'custom' && (
                            <>
                                <Input size='sm' type='date' className='w-auto' value={customDateRange.start} onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })} />
                                <Icon name='arrow-right' size='xs' className='text-muted-foreground' />
                                <Input size='sm' type='date' className='w-auto' value={customDateRange.end} onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })} />
                            </>
                        )}
                        <Button variant='ghost' size='sm' onClick={handleRefresh} disabled={refreshing}>
                            {refreshing ? <Spinner size='sm' /> : <Icon name='rotate-right' />}Aggiorna
                        </Button>
                        <Button variant='outline-secondary' size='sm' onClick={exportLogs} disabled={exporting} title='Scarica log del periodo in formato CSV'>
                            {exporting ? <Spinner size='sm' /> : <Icon name='download' />}Scarica log
                        </Button>
                    </div>
                )}
            </div>

            {canViewAnalytics === true ? (
                <Card>
                    <CardBody>
                        <Tabs value={activeTab} onValueChange={(k) => setActiveTab(k)}>
                            <TabsList>
                                <TabsTrigger value="overview"><Icon name="gauge-high" />Overview</TabsTrigger>
                                <TabsTrigger value="trends"><Icon name="arrow-trend-up" />Trend</TabsTrigger>
                                <TabsTrigger value="sessions"><Icon name="users" />Sessioni</TabsTrigger>
                                <TabsTrigger value="activity"><Icon name="clock" />Attività</TabsTrigger>
                                <TabsTrigger value="performance"><Icon name="chart-line" />Performance</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview">
                                <OverviewTab timeRange={timeRange} customDateRange={customDateRange} chartOptions={chartOptions} />
                            </TabsContent>
                            <TabsContent value="trends">
                                <TrendsTab timeRange={timeRange} customDateRange={customDateRange} chartOptions={chartOptions} availableEntities={availableEntities} />
                            </TabsContent>
                            <TabsContent value="sessions">
                                <SessionsTab timeRange={timeRange} customDateRange={customDateRange} chartOptions={chartOptions} />
                            </TabsContent>
                            <TabsContent value="activity">
                                <ActivityTab timeRange={timeRange} customDateRange={customDateRange} />
                            </TabsContent>
                            <TabsContent value="performance">
                                <PerformanceTab />
                            </TabsContent>
                        </Tabs>
                    </CardBody>
                </Card>
            ) : null}
        </div>
    );
};