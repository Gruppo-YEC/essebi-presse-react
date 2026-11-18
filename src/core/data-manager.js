import { ApiManager } from './api-manager';
import { ViewManager } from './view-manager';
import { Utils } from './utils';
import { CacheManager } from './cache-manager';
import { onUpdate } from '../config/hooks/onUpdate.js';
import { onDelete } from '../config/hooks/onDelete.js';
import { onInsert } from '../config/hooks/onInsert.js';
import { preInsert } from '../config/hooks/preInsert.js';
import { preUpdate } from '../config/hooks/preUpdate.js';
import { preDelete } from '../config/hooks/preDelete.js';
import { LanguageProvider } from './language-provider.js';


/**
 * sorting → stringa per l'API ("field order" oppure "f1 o1, f2 o2").
 * Accetta sia l'oggetto storico {field, order} sia un array di oggetti
 * per l'ordinamento multi-colonna.
 */
function buildOrder(sorting) {
    if (Array.isArray(sorting)) {
        return sorting.map(s => s.field + ' ' + s.order).join(', ')
    }
    return sorting.field + ' ' + sorting.order
}


async function getItems(entity, page, limit, sorting) {
    let offset = page * limit - limit;
    let order = buildOrder(sorting)
    let body = {
        order: order,
        page: page,
        limit: limit,
        offset: offset
    }
    let response = await ApiManager.sendAuthenticatedRequest('/get_items/' + entity, body)
    return response;
}

async function getItem(entity, id) {
    let body = {
        id: id
    }
    let response = await ApiManager.sendAuthenticatedRequest('/get_item/' + entity, body)
    return response;
}

async function updateItem(entity, data, id, previous = null) {
    var pData = parseData(entity, data)
    var p_i = await preUpdate(entity, pData, id, previous)
    if(p_i.success === 1) {
        let body = {
            id: id,
            action: 'edit',
            body: p_i.data
        }
        let response = await ApiManager.sendAuthenticatedRequest('/post/' + entity, body)
        
        // Invalidate cache for this entity when updated
        if (response && response.success === 1) {
            await CacheManager.invalidateEntity(entity);
        }

        onUpdate(response, entity, data, id, previous)
        return response;
    }
    else {
        return p_i
    }
}

async function insertItem(entity, data) {
    var pData = parseData(entity, data)
    var p_i = await preInsert(entity, pData)
    if(p_i.success === 1) {
        let body = {
            action: 'create',
            body: p_i.data
        }
        let response = await ApiManager.sendAuthenticatedRequest('/post/' + entity, body)
        
        // Invalidate cache for this entity when new item is inserted
        if (response && response.success === 1) {
            await CacheManager.invalidateEntity(entity);
        }
        
        onInsert(response, entity, data)

        return response;
    }
    else {
        return p_i
    }
}

async function deleteItem(entity, id) {
    let body = {
        id: id
    }
    var p_i = await preDelete(entity, id)
    if(p_i.success === 1) {
        let response = await ApiManager.sendAuthenticatedRequest('/delete/' + entity, body)
        
        // Invalidate cache for this entity when item is deleted
        if (response && response.success === 1) {
            await CacheManager.invalidateEntity(entity);
        }
        
        onDelete(response, entity, id)

        return response;
    }
    else {
        return p_i
    }
}

async function updateItemNoCache(entity, data, id, previous = null) {
    var pData = parseData(entity, data)
    var p_i = await preUpdate(entity, pData, id, previous)
    if(p_i.success === 1) {
        let body = {
            id: id,
            action: 'edit',
            body: p_i.data
        }
        let response = await ApiManager.sendAuthenticatedRequest('/post/' + entity, body)
        
        onUpdate(response, entity, data, id, previous)
        return response;
    }
    else {
        return p_i
    }
}

async function insertItemNoCache(entity, data) {
    var pData = parseData(entity, data)
    var p_i = await preInsert(entity, pData)
    if(p_i.success === 1) {
        let body = {
            action: 'create',
            body: p_i.data
        }
        let response = await ApiManager.sendAuthenticatedRequest('/post/' + entity, body)
        
        onInsert(response, entity, data)

        return response;
    }
    else {
        return p_i
    }
}

async function deleteItemNoCache(entity, id) {
    let body = {
        id: id
    }
    var p_i = await preDelete(entity, id)
    if(p_i.success === 1) {
        let response = await ApiManager.sendAuthenticatedRequest('/delete/' + entity, body)

        onDelete(response, entity, id)

        return response;
    }
    else {
        return p_i
    }
}

async function searchItems(entity, page, limit, sorting, query, fields, constraints) {
    let offset = page * limit - limit;
    let order = buildOrder(sorting)
    let body = {
        order: order,
        page: page,
        limit: limit,
        offset: offset,
        query: query,
        fields: fields,
        constraints: constraints
    }
    let response = await ApiManager.sendAuthenticatedRequest('/search_items/' + entity, body)
    return response;
}

function parseData(entity, data) {
    let parsed = {}
    let props = ViewManager.getEntityProperties(entity);
    for (const [key, value] of Object.entries(data)) {
        //console.log(entity, key, value);
        if(typeof value !== 'undefined' && value !== null && props.columns[key]) {
            var type = props.columns[key].input_type;
            if(type === 'externalEntity') {
                if(value === '') {
                    parsed[key] = null
                }
                else {
                    parsed[key] = value.id
                }
            }
            else if(type === 'deepExternalEntity') {
                //console.warn()
                var temp = [];
                for (var i=0; i<value.length; i++) {
                    var p = parseData(props.columns[key].options.entity, value[i])
                    temp.push(p)
                }
                parsed[key] = temp;
            }
            else if(type === 'multipleExternalEntity') {
                var temp = [];
                for (var i=0; i<value.length; i++) {
                    var id = value[i].id
                    temp.push(id)
                }
                parsed[key] = temp;
            }
            else if(type === 'option') {
                parsed[key] = value.value
            }
            else if(type === 'file') {
                parsed[key] = value.hash
            }
            else if(type === 'password') {
                console.log('p', value)
                if(value !== '' && value !== null) {
                    parsed[key] = Utils.encrypt(value)
                }
            }
            else if(type === 'boolean') {
                if(value != 1 && value != 0) {
                    parsed[key] = 0
                }
                else {
                    parsed[key] = value
                }
            }
            else if(type === 'date') {
                if(value === '') {
                    parsed[key] = null
                }
                else {
                    parsed[key] = value
                }
            }
            else if(type === 'time') {
                if(value === '') {
                    parsed[key] = null
                }
                else {
                    parsed[key] = value
                }
            }
            else if(type === 'datetime') {
                if(value === '') {
                    parsed[key] = null
                }
                else {
                    var t = value.replace("T", " ");
                    parsed[key] = t
                }
            }
            else {
                parsed[key] = value
            }
        }
        else {
            if(props.columns[key]) {
                var type = props.columns[key].input_type;
                if(type === 'file') {
                    parsed[key] = null //save null only if it is a file cos we have to clear the field
                }
                if(type === 'externalEntity') {
                    parsed[key] = null //we have to clear the field
                }
            }
            //parsed[key] = null //not adding in parsed array => field will not be updated
        }
    }
    return parsed;
}



async function getItemsSimple(entity, page, limit, sorting) {
    // Check cache first
    const cachedResponse = await CacheManager.getCachedItems(entity, page, limit, sorting);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // If not in cache, make the API call
    let offset = page * limit - limit;
    let order = buildOrder(sorting)
    let body = {
        order: order,
        page: page,
        limit: limit,
        offset: offset
    }
    let response = await ApiManager.sendAuthenticatedRequest('/get_items_simple/' + entity, body)
    
    // Cache the successful response
    if (response && response.success === 1) {
        CacheManager.cacheItems(entity, page, limit, sorting, response);
    }
    
    return response;
}

async function getItemSimple(entity, id) {
    // Check cache first
    const cachedResponse = await CacheManager.getCachedItem(entity, id);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // If not in cache, make the API call
    let body = {
        id: id
    }
    let response = await ApiManager.sendAuthenticatedRequest('/get_item_simple/' + entity, body)
    
    // Cache the successful response
    if (response && response.success === 1) {
        CacheManager.cacheItem(entity, id, response);
    }
    
    return response;
}

async function searchItemsSimple(entity, page, limit, sorting, query, fields, constraints) {
    // Check cache first
    const cachedResponse = await CacheManager.getCachedSearchItems(entity, page, limit, sorting, query, fields, constraints);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // If not in cache, make the API call
    let offset = page * limit - limit;
    let order = buildOrder(sorting)
    let body = {
        order: order,
        page: page,
        limit: limit,
        offset: offset,
        query: query,
        fields: fields,
        constraints: constraints
    }
    let response = await ApiManager.sendAuthenticatedRequest('/search_items_simple/' + entity, body)
    
    // Cache the successful response
    if (response && response.success === 1) {
        CacheManager.cacheSearchItems(entity, page, limit, sorting, query, fields, constraints, response);
    }
    
    return response;
}


export const DataManager = {
    getItems: getItems,
    getItem: getItem,
    updateItem: updateItem,
    insertItem: insertItem,
    deleteItem: deleteItem,
    updateItemNoCache: updateItemNoCache,
    insertItemNoCache: insertItemNoCache,
    deleteItemNoCache: deleteItemNoCache,
    searchItems: searchItems,
    getItemsSimple: getItemsSimple,
    getItemSimple: getItemSimple,
    searchItemsSimple: searchItemsSimple,
    /* esposta per le pagine che chiamano endpoint diversi da /post (es. /users/edit)
       e devono comunque appiattire i valori come fa il salvataggio standard */
    parseData: parseData
};