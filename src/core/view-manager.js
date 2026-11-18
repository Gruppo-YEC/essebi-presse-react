import { AuthorizationManager } from './authorization-manager';


let properties = {};

function getProperties() {
    return properties
}

function setProperties(obj) {
    properties = obj
}

function getColumns(entity) {
    var am = AuthorizationManager.getAuthMap()
    return am.entities[entity].fields
}

function getVisibleColumns(entity) {
    var am = AuthorizationManager.getAuthMap()
    return am.entities[entity].visible_fields
}

function getEditableColumns(entity) {
    var am = AuthorizationManager.getAuthMap()
    return am.entities[entity].editable_fields
}

function getEntityProperties(entity) {
    return properties[entity]
}

function getSearchableColumns(entity) {
    var s = []
    if(properties[entity]) {
        var p = properties[entity]
        const searchableTypes = ['string', 'text', 'email', 'phone', 'richText', 'markdown', 'date', 'time', 'datetime', 'number', 'float', 'boolean', 'option', 'currency', 'externalEntity']
        const excluded = ['deleted']
        var visible = Object.keys(p.columns)
        for (let i = 0; i < visible.length; i++) {
            if(searchableTypes.includes(p.columns[visible[i]].input_type) && !excluded.includes(visible[i])) {
                s.push(visible[i])
            }
        }
    }

    return s
}



export const ViewManager = {
    getProperties: getProperties,
    setProperties: setProperties,
    getEntityProperties: getEntityProperties,
    getColumns: getColumns,
    getVisibleColumns: getVisibleColumns,
    getEditableColumns: getEditableColumns,
    getSearchableColumns: getSearchableColumns
};