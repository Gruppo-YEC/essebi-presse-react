import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/BodyElements/Icon';
import { LanguageProvider } from '../../../core/language-provider';

/**
 * Tab "Altro" delle impostazioni: scorciatoie alle pagine di servizio del
 * framework che non hanno una voce di menu propria.
 */
const TOOLS = [
    {
        to: '/schema',
        icon: 'diagram-project',
        title: () => LanguageProvider.get('header.schema', 'Schema entità'),
        text: () => LanguageProvider.get('other.schema_desc', 'Entità, campi e collegamenti del progetto, così come sono configurati.'),
    },
    {
        to: '/resources',
        icon: 'server',
        title: () => LanguageProvider.get('header.resources', 'Risorse di sistema'),
        text: () => LanguageProvider.get('other.resources_desc', 'File caricati, spazio occupato e dettagli di ogni risorsa.'),
    },
    {
        to: '/license',
        icon: 'circle-info',
        title: () => LanguageProvider.get('header.about', 'Informazioni'),
        text: () => LanguageProvider.get('other.license_desc', 'Chi sviluppa il framework e la versione in uso.'),
    },
];

export default function OtherTools() {
    return (
        <div className='mt-6 grid gap-4 sm:grid-cols-2'>
            {TOOLS.map((t) => (
                <Link
                    key={t.to}
                    to={t.to}
                    className='group flex items-start gap-4 rounded-xl border border-border bg-card p-5 text-foreground no-underline transition-colors hover:border-primary/40 hover:bg-accent/60'
                >
                    <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                        <Icon name={t.icon} size='lg' />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-2'>
                            <div className='font-semibold leading-tight'>{t.title()}</div>
                            <Icon name='arrow-right' size='sm' className='shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground' />
                        </div>
                        <p className='mb-0 mt-1 text-sm text-muted-foreground'>{t.text()}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
