import React from 'react';
import { Spinner } from '../../ui/spinner';
import { LanguageProvider } from '../../../core/language-provider';


export default function Loading() {
    return (
        <>
            <div className='w-full pt-12 text-center text-muted-foreground'>
                {LanguageProvider.get('defaults.loading')}... <Spinner size="sm" />
            </div>
        </>
    );
};
