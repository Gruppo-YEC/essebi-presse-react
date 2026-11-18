import React, { lazy, Suspense } from 'react';
import Login from './index';
import Loading from '../../components/BodyElements/Loading';
import { getNlPageLoader } from '../nlpage/loader';
import { settings } from '../../config/settings';
import { reloadOnStaleChunk } from '../../core/lazy-import';


/**
 * Pagina mostrata su / a chi non è loggato: src/config/nl_pages/<settings.loginPage>
 * se impostata, altrimenti (o se manca, o se l'import fallisce anche dopo il reload
 * per chunk obsoleto) la Login standard.
 * A tutto schermo, senza il wrapper di NlPage. Risolta una volta sola:
 * settings non cambia a runtime.
 */
const loadCustomLogin = settings.loginPage ? getNlPageLoader(settings.loginPage) : null;

if (settings.loginPage && !loadCustomLogin) {
    console.warn(`settings.loginPage: src/config/nl_pages/${settings.loginPage}/index.js non esiste, uso la login standard`);
}

const CustomLogin = loadCustomLogin
    ? lazy(() => loadCustomLogin().catch(error => {
        console.warn(`settings.loginPage: import di ${settings.loginPage} fallito, uso la login standard`, error);
        return reloadOnStaleChunk(error, { default: Login });
    }))
    : null;


export default function LoginPage() {

    if (!CustomLogin) {
        return <Login />;
    }

    return (
        <Suspense fallback={<Loading />}>
            <CustomLogin />
        </Suspense>
    );
};
