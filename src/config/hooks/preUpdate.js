import { ApiManager } from '../../core/api-manager';
import { DataManager } from '../../core/data-manager';
import { settings } from '../../config/settings';
import { LanguageProvider } from '../../core/language-provider';
import { toast } from '../../components/ui/toast';



/* previous: l'item prima della modifica, se il chiamante lo aveva in mano
   (pagine edit/item, cambio password utenti) — altrimenti null.
   Utile per confrontare i campi: if (previous && previous.stato !== data.stato) */
export async function preUpdate(entity, data, id, previous = null) {

    var d = {...data}

    if(entity === 'sample') {
        d.sample1 = 'test'
    }
    
    return {
        success: 1,
        data: d,
        message: ''
    }
}