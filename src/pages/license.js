import React from 'react';
import { Button } from '../components/ui/button';
import { LanguageProvider } from '../core/language-provider';
import logoYec from '../assets/yec.svg';
import Icon from '../components/BodyElements/Icon';

/** Pagina "Informazioni": chi sviluppa il framework e la versione in uso. */
export default function About() {

    const storedVersion = __APP_VERSION__;

    return (
        <div className='mb-4 mt-4 w-full px-3'>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-3'>
                <h3 className='mb-0'>{LanguageProvider.get('header.about')}</h3>
            </div>

            <div className='mx-auto max-w-2xl'>
                <div className='overflow-hidden rounded-xl border border-border bg-card'>
                    <div className='flex flex-col items-center px-8 py-10 text-center'>
                        <img src={logoYec} width='160' alt='GRUPPO YEC' className='mb-8' />
                        <p className='mb-0 max-w-md text-sm leading-relaxed text-muted-foreground'>
                            GRUPPO YEC è una Tech Company specializzata nello sviluppo di soluzioni digitali innovative. Dal software alla Artificial Intelligence, fino alla robotica. Realizziamo soluzioni software personalizzate per dare vita a prodotti digitali.
                        </p>
                        <div className='mt-6 flex flex-wrap justify-center gap-2'>
                            <Button asChild variant='primary' size='sm'>
                                <a target='_blank' rel='noreferrer' href='https://gruppoyec.com'>
                                    <Icon name='arrow-up-right-from-square' />Visita il sito
                                </a>
                            </Button>
                            <Button asChild variant='outline-secondary' size='sm'>
                                <a target='_blank' rel='noreferrer' href='https://gruppoyec.com/contact'>
                                    <Icon name='envelope' />Contattaci
                                </a>
                            </Button>
                        </div>
                    </div>
                    <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground'>
                        <span>Framework sviluppato da GRUPPO YEC SBRL</span>
                        <span className='inline-flex items-center gap-1.5'>
                            <Icon name='code-branch' size='xs' />
                            {LanguageProvider.get('other.version', 'Versione')} <code>{storedVersion || '-'}</code>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
