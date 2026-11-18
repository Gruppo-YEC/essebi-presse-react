import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { SimpleTooltip } from '../../components/ui/tooltip';
import Icon from '../../components/BodyElements/Icon';
import { useAi } from './AiProvider';
import { ChatThread, Composer, Disclaimer } from './ChatThread';
import { describeLocation } from './pageContext';
import './style.css';

/**
 * Pannello laterale dell'assistente: la stessa conversazione della pagina
 * /ai-assistant, aperta a destra su qualsiasi pagina del gestionale.
 * Montato in App.js quando settings.aiAssistant.panel e' attivo; si apre dal
 * bottone in header (AiHeaderButton) o da solo quando l'assistente porta
 * l'utente da un'altra parte.
 *
 * Due viste, una alla volta:
 *  - la CHAT (thread + barra di scrittura);
 *  Non mostra mai form: se l'assistente vuole far inserire o modificare un
 *  record (ui_open_form) porta l'utente alla pagina standard, precompilata,
 *  e il pannello resta aperto a lato.
 *
 * Il pannello non copre la pagina: sui desktop il contenuto si stringe
 * (classe ai-panel-open su #column-container, vedi style.css), sui mobile
 * si sovrappone. Sulla pagina /ai-assistant non si monta: sarebbe doppio.
 */
export default function AiPanel() {
    const ai = useAi();
    const location = useLocation();
    if (!ai || !ai.panelEnabled || !ai.panelOpen || ai.onAssistantPage) return null;

    /* Dove si trova l'utente: e' il contesto che l'assistente riceve. */
    const where = describeLocation(location);

    return (
        <aside id='ai-panel' className='ai-assistant ai-panel' aria-label='Assistente AI'>

            <div className='ai-panel-head'>
                <div className='ai-panel-title'>
                    <Icon name='robot' size='sm' className='me-2 text-muted-foreground' />
                    <span className='ai-panel-title-text'>
                        <span>Assistente AI</span>
                        {where ? (
                            <SimpleTooltip content="L'assistente sa che sei in questa pagina">
                                <span className='ai-panel-where'><Icon name='location-dot' size='sm' className='me-1' />{where}</span>
                            </SimpleTooltip>
                        ) : null}
                    </span>
                </div>
                <div className='ai-panel-actions'>
                    <SimpleTooltip content='Nuova conversazione'>
                        <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={ai.reset} disabled={ai.pending || !ai.started}>
                            <Icon name='pen-to-square' />
                        </Button>
                    </SimpleTooltip>
                    <SimpleTooltip content='Apri a tutto schermo'>
                        <Button variant='ghost' size='sm' className='h-8 w-8 p-0' asChild>
                            <Link to='/ai-assistant'><Icon name='up-right-and-down-left-from-center' /></Link>
                        </Button>
                    </SimpleTooltip>
                    <SimpleTooltip content='Chiudi'>
                        <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={ai.closePanel}>
                            <Icon name='xmark' />
                        </Button>
                    </SimpleTooltip>
                </div>
            </div>

            {ai.started ? (
                <ChatThread compact />
            ) : (
                <div className='ai-panel-empty'>
                    <Icon name='robot' className='ai-panel-empty-icon' />
                    <div className='ai-panel-empty-title'>Chiedi qualcosa sui dati o su come si usa il gestionale</div>
                    <div className='ai-panel-empty-hint'>
                        L'assistente vede la pagina che hai aperto. Dalla scheda di un cliente puoi chiedere
                        "Quanto ci deve?" o "Riassumi la situazione di questo cliente" senza dire di chi parli.
                        Puoi anche dirgli "Portami ai pagamenti scaduti" o "Inserisci un nuovo cliente".
                    </div>
                </div>
            )}
            <div className='ai-panel-footer'>
                <Composer rows={1} placeholder='Scrivi un messaggio' autoFocus />
                <Disclaimer />
            </div>
        </aside>
    );
}
