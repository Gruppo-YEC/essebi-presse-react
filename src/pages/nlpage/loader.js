/** Pagine not-logged disponibili in src/config/nl_pages/<Nome>/index.js, risolte a build-time */
const pages = import.meta.glob('../../config/nl_pages/*/index.js');


/**
 * Loader della pagina not-logged <name>, da passare a React.lazy;
 * null se src/config/nl_pages/<name>/index.js non esiste.
 */
export function getNlPageLoader(name) {
    return pages[`../../config/nl_pages/${name}/index.js`] || null;
}
