import React, { useState, useEffect } from 'react';
import { Panel, PanelRow as Row } from '../../../components/ui/panel';
import { Badge } from '../../../components/ui/badge';
import { Spinner } from '../../../components/ui/spinner';
import { Button } from '../../../components/ui/button';

import { ApiManager } from '../../../core/api-manager';
import { toast } from '../../../components/ui/toast';
import Icon from '../../../components/BodyElements/Icon';

const PerformanceTab = () => {
    const [loading, setLoading] = useState(true);
    const [serverInfo, setServerInfo] = useState(null);
    const [browserInfo, setBrowserInfo] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        loadServerData();
        getBrowserInfo();
    }, []);

    const loadServerData = async () => {
        setLoading(true);
        try {
            const startTime = performance.now();
            
            // Info server
            const serverResponse = await ApiManager.sendAuthenticatedRequest('/analytics/server_info');

            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            setServerInfo({
                ...(serverResponse?.data || serverResponse),
                lastResponseTime: responseTime
            });
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error loading server data:', error);
            toast.error('Errore nel caricamento info server');
        } finally {
            setLoading(false);
        }
    };


    const getBrowserInfo = () => {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        setBrowserInfo({
            userAgent: navigator.userAgent,
            browser: getBrowserName(),
            platform: navigator.platform,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            connectionType: connection?.effectiveType || 'unknown',
            downlink: connection?.downlink || 'unknown',
            rtt: connection?.rtt || 'unknown'
        });
    };

    const getBrowserName = () => {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        return 'Unknown';
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                    {lastUpdate && <><Icon name="clock" className="me-1" />Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}</>}
                </div>
                <Button variant="ghost" size="sm" onClick={loadServerData} disabled={loading}>
                    <Icon name="rotate-right" spin={loading} />Aggiorna
                </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Panel icon="server" title="Server">
                    {serverInfo ? (
                        <>
                            <Row label="PHP">{serverInfo.phpVersion || '-'}</Row>
                            <Row label="MySQL">{serverInfo.mysqlVersion || '-'}</Row>
                            <Row label="Sistema operativo">{serverInfo.osInfo || '-'}</Row>
                            <Row label="Framework">{serverInfo.frameworkVersion || '-'}</Row>
                            <Row label="Server software">{serverInfo.serverSoftware || '-'}</Row>
                            <Row label="Memoria utilizzata">{serverInfo.memoryUsage || '-'}</Row>
                            <Row label="Tempo di risposta">{serverInfo.lastResponseTime} ms</Row>
                        </>
                    ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground">Dati server non disponibili</div>
                    )}
                </Panel>

                <Panel icon="globe" title="Browser">
                    {browserInfo ? (
                        <>
                            <Row label="Browser">{browserInfo.browser}</Row>
                            <Row label="Piattaforma">{browserInfo.platform}</Row>
                            <Row label="Lingua">{browserInfo.language}</Row>
                            <Row label="Cookie">
                                <Badge variant={browserInfo.cookieEnabled ? 'success' : 'danger'}>{browserInfo.cookieEnabled ? 'Abilitati' : 'Disabilitati'}</Badge>
                            </Row>
                            <Row label="Connessione">
                                <Badge variant={browserInfo.onLine ? 'success' : 'danger'}>{browserInfo.onLine ? 'Online' : 'Offline'}</Badge>
                            </Row>
                            <Row label="Tipo connessione">{browserInfo.connectionType}</Row>
                            <Row label="Velocità download">{browserInfo.downlink} Mbps</Row>
                        </>
                    ) : (
                        <div className="py-6 text-center text-sm text-muted-foreground">Dati browser non disponibili</div>
                    )}
                </Panel>
            </div>
        </>
    );
};

export default PerformanceTab;