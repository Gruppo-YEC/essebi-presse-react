import { ApiManager } from '../../core/api-manager';
import { DataManager } from '../../core/data-manager';
import { settings } from '../../config/settings';
import { LanguageProvider } from '../../core/language-provider';
import { toast } from '../../components/ui/toast';



/* previous: l'item prima della modifica, se il chiamante lo aveva in mano — altrimenti null */
export function onUpdate(response, entity, data, id, previous = null) {
    
}