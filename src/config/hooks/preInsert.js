import { ApiManager } from '../../core/api-manager';
import { DataManager } from '../../core/data-manager';
import { settings } from '../../config/settings';
import { LanguageProvider } from '../../core/language-provider';
import { toast } from '../../components/ui/toast';



export async function preInsert(entity, data) {
    
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