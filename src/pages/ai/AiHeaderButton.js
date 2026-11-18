import React from 'react';
import { Button } from '../../components/ui/button';
import Icon from '../../components/BodyElements/Icon';
import { useAi } from './AiProvider';

/**
 * Bottone in header che apre e chiude il pannello dell'assistente.
 * Montato da HeaderBlock; sparisce da solo se il pannello non e' attivo
 * per questo utente (settings.aiAssistant) o sulla pagina a tutto schermo.
 */
export default function AiHeaderButton() {
    const ai = useAi();
    if (!ai || !ai.panelEnabled || ai.onAssistantPage) return null;

    return (
        <Button
            variant={ai.panelOpen ? 'outline-primary' : 'ghost'}
            size='sm'
            className='h-8 gap-2 px-2'
            onClick={ai.togglePanel}
            title={ai.panelOpen ? 'Chiudi assistente' : 'Apri assistente'}
            aria-pressed={ai.panelOpen}
        >
            <Icon name='robot' />
            <span className='hidden sm:inline'>Assistente</span>
        </Button>
    );
}
