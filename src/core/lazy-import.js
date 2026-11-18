/**
 * Dopo un deploy i chunk col vecchio hash spariscono da build/assets, e il fallback
 * SPA (_redirects: /* /index.html 200) risponde all'import con index.html: un tab
 * aperto sul bundle precedente vede fallire l'import di ogni pagina lazy. Un reload
 * prende il nuovo index.html con i nuovi hash.
 *
 * Il timestamp in sessionStorage evita il loop quando il chunk manca davvero
 * (o la rete è giù): entro RELOAD_WINDOW dall'ultimo reload si mostra il fallback.
 */
const RELOAD_KEY = 'ckd_chunk_reload_at';
const RELOAD_WINDOW = 10 * 1000;


function reloadedRecently() {
    try {
        return Date.now() - Number(sessionStorage.getItem(RELOAD_KEY) || 0) < RELOAD_WINDOW;
    } catch {
        return false;
    }
}


function markReload() {
    try {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
        // senza sessionStorage niente guardia: si ricarica comunque
    }
}


/**
 * Da usare nel .catch di un import dinamico passato a React.lazy:
 *   lazy(() => loader().catch(error => reloadOnStaleChunk(error, Fallback)))
 * Ricarica la pagina e resta in sospeso (il Suspense mostra il suo fallback fino
 * al reload); se ha già ricaricato da poco risolve con il modulo `fallback`.
 */
export function reloadOnStaleChunk(error, fallback) {
    if (!reloadedRecently()) {
        markReload();
        window.location.reload();
        return new Promise(() => {});
    }
    console.error('Import dinamico fallito anche dopo il reload', error);
    return Promise.resolve(fallback);
}
