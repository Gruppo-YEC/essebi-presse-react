import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { LanguageProvider } from '../../../core/language-provider';

/** Versione per cui si è già ricaricato in questo tab: se dopo il reload il bundle
 *  è ancora vecchio (index.html in cache) il modal non si riapre all'infinito. */
const RELOADED_FOR_KEY = 'ckd_version_reloaded_for';

function readReloadedFor() {
    try { return sessionStorage.getItem(RELOADED_FOR_KEY); } catch { return null; }
}

function writeReloadedFor(version) {
    try { sessionStorage.setItem(RELOADED_FOR_KEY, version); } catch { /* storage non disponibile */ }
}

const VersionCheck = () => {
    const [showModal, setShowModal] = useState(false);
    const [newVersion, setNewVersion] = useState(null);

    useEffect(() => {
        // chiave usata fino alla 3.9: la versione ora è nel bundle
        try { localStorage.removeItem('app_version'); } catch { /* storage non disponibile */ }

        // In dev __APP_VERSION__ è fissato all'avvio di Vite: alzare version.json con
        // il dev server acceso aprirebbe il modal a ogni reload. L'HMR basta.
        if (import.meta.env.DEV) return;

        // Initial check
        checkVersion();

        // Set interval for periodic checks (every 15 minutes)
        const intervalId = setInterval(() => {
            checkVersion();
        }, 15 * 60 * 1000); // 15 minutes in milliseconds

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, []);

    const checkVersion = async () => {
        try {
            // Fetch version.json with cache busting
            const response = await fetch(`/version.json?t=${Date.now()}`);
            const data = await response.json();
            const serverVersion = data.version;

            // Confronto con la versione del bundle in esecuzione (vite.config.mjs, define):
            // ogni tab sa con che build gira, a differenza di localStorage condiviso
            if (serverVersion && serverVersion !== __APP_VERSION__) {
                if (readReloadedFor() === serverVersion) {
                    console.warn(`Version check: ricaricato per la ${serverVersion} ma il bundle è ancora la ${__APP_VERSION__} (index.html in cache?)`);
                    return;
                }
                setNewVersion(serverVersion);
                setShowModal(true);
            }
        } catch (error) {
            console.warn('Error checking version:', error);
        }
    };

    const handleRefresh = () => {
        if (newVersion) {
            writeReloadedFor(newVersion);
        }

        // Force refresh without cache
        window.location.reload(true);
    };

    /* backdrop statico: il modal si chiude solo ricaricando */
    return (
        <Dialog open={showModal}>
            <DialogContent
                hideClose
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
                className='top-1/2 -translate-y-1/2'
            >
                <DialogHeader>
                    <DialogTitle>{LanguageProvider.get('version.update_available', 'Aggiornamento Disponibile')}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <p>{LanguageProvider.get('version.update_message', 'È disponibile una nuova versione dell\'applicazione. Per utilizzare le nuove funzionalità è necessario ricaricare la pagina.')}</p>
                    {newVersion && (
                        <p className="text-muted-foreground">
                            <small>{LanguageProvider.get('version.new_version', 'Nuova versione')}: <strong>{newVersion}</strong></small>
                        </p>
                    )}
                </DialogBody>
                <DialogFooter>
                    <Button variant="primary" onClick={handleRefresh}>
                        {LanguageProvider.get('version.reload_now', 'Ricarica Ora')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default VersionCheck;
