import { ApiManager } from '../../core/api-manager';
import { DataManager } from '../../core/data-manager';
import { settings } from '../../config/settings';
import { LanguageProvider } from '../../core/language-provider';
import { toast } from '../../components/ui/toast';
import { checkUniqueFields, trimUniqueFields } from './uniqueFields';



export async function preInsert(entity, data) {
    
    var d = trimUniqueFields(entity, {...data})

    // Campi univoci del catalogo (sku, slug, code): nessun UNIQUE a schema, si controlla qui
    var unique = await checkUniqueFields(entity, d)
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