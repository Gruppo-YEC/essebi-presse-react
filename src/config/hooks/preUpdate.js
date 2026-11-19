import { ApiManager } from '../../core/api-manager';
import { DataManager } from '../../core/data-manager';
import { settings } from '../../config/settings';
import { LanguageProvider } from '../../core/language-provider';
import { toast } from '../../components/ui/toast';
import { checkUniqueFields, trimUniqueFields } from './uniqueFields';



/* previous: l'item prima della modifica, se il chiamante lo aveva in mano
   (pagine edit/item, cambio password utenti) — altrimenti null.
   Utile per confrontare i campi: if (previous && previous.stato !== data.stato) */
export async function preUpdate(entity, data, id, previous = null) {

    var d = trimUniqueFields(entity, {...data})

    // Campi univoci del catalogo (sku, slug, code): nessun UNIQUE a schema, si controlla qui.
    // Il record in modifica (id) è escluso dal confronto.
    var unique = await checkUniqueFields(entity, d, id)
    if(unique.success !== 1) {
        // Le pagine add/edit mostrano solo "salvataggio non riuscito": il motivo lo diciamo qui
        toast.error(unique.message)
        return { success: 0, data: d, message: unique.message }
    }

    if(entity === 'sample') {
        d.sample1 = 'test'
    }
    
    return {
        success: 1,
        data: d,
        message: ''
    }
}