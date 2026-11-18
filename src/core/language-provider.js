import { language } from '../components/Language';

function get(identifier, defaultString) {
    if (!identifier) return "";

    var exploded = identifier.split('.');

    var base = language;

    /** carico lingua salvata */
    var language_pack = localStorage.getItem('language_pack')
    if(language_pack) {
        base = JSON.parse(language_pack)
    }
    /** fine */

    for (var i = 0; i < exploded.length; i++) {
        var key = exploded[i];
        base = base[key];

        if (base === null) {
            return "loading....";
        }
        else if (base === undefined) {
            return defaultString;
        }
    }

    return base;
}

function getLabel(entity, field) {

    var base = language.labels;

    /** carico lingua salvata */
    var language_pack = localStorage.getItem('language_pack')
    if(language_pack) {
        base = JSON.parse(language_pack).labels
    }
    /** fine */

    if(base[entity] && base[entity][field]) {
        return base[entity][field]
    }
    else {
        return field
    }
}


export const LanguageProvider = {
    get: get,
    getLabel: getLabel
};