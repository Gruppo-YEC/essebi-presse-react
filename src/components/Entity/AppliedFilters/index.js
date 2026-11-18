import React, { useState, useEffect } from 'react';
import { Badge } from '../../ui/badge';
import { LanguageProvider } from '../../../core/language-provider';
import { ViewManager } from '../../../core/view-manager';
import { DataManager } from '../../../core/data-manager';
import Icon from '../../BodyElements/Icon';


/**
 * Badge dei filtri attivi, con testo tradotto ("Autore include marco.cekada")
 * e X per togliere il singolo filtro. Usato sotto SearchPro e nel popover dei
 * filtri di colonna, così traduzioni e comportamento restano identici.
 *
 * Per i campi externalEntity/multipleExternalEntity il valore del constraint
 * è un id (o una lista di id): viene risolto nella label vera con una
 * searchItemsSimple per entità esterna, cachata per la vita del componente.
 *
 * Eventuali children (es. il link "azzera filtri" di SearchPro) vengono
 * appesi in coda ai badge, dentro lo stesso contenitore flex.
 */
export default function AppliedFilters({ entity, constraints, onRemove, children }) {

    // labelsCache[extEntity][id] = label
    const [labelsCache, setLabelsCache] = useState({});
    const properties = ViewManager.getEntityProperties(entity);

    useEffect(() => {
        resolveExternalLabels()
    }, [constraints]);

    function externalColumn(item) {
        var col = properties && properties.columns ? properties.columns[item.fieldName] : null;
        if (col && (col.input_type === 'externalEntity' || col.input_type === 'multipleExternalEntity')) {
            return col;
        }
        return null;
    }

    async function resolveExternalLabels() {
        if (!constraints || constraints.length === 0) return;

        // raccoglie, per entità esterna, gli id non ancora in cache
        var wanted = {};
        constraints.forEach(c => {
            var col = externalColumn(c);
            if (!col || c.type === 'isnull' || c.value === null || typeof c.value === 'undefined') return;
            var ext = col.options.entity;
            String(c.value).split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
                if (labelsCache[ext] && labelsCache[ext][id]) return;
                if (!wanted[ext]) wanted[ext] = { labelField: col.options.labelField || 'name', ids: new Set() };
                wanted[ext].ids.add(id);
            });
        });

        var exts = Object.keys(wanted);
        if (exts.length === 0) return;

        var next = { ...labelsCache };
        for (var i = 0; i < exts.length; i++) {
            var ext = exts[i];
            var ids = Array.from(wanted[ext].ids);
            try {
                var response = await DataManager.searchItemsSimple(ext, 1, ids.length, { field: 'id', order: 'asc' }, '', [], [{ fieldName: 'id', type: 'in', value: ids.join(',') }]);
                if (response.success === 1) {
                    next[ext] = { ...(next[ext] || {}) };
                    response.body.forEach(row => {
                        next[ext][String(row.id)] = row[wanted[ext].labelField] || String(row.id);
                    });
                }
            } catch (e) {
                console.warn('AppliedFilters: label esterna non risolta per ' + ext, e);
            }
        }
        setLabelsCache(next);
    }

    /* label della condizione di un constraint (le stesse chiavi di SearchPro) */
    function typeLabel(type) {
        switch (String(type).toUpperCase()) {
            case 'IN': return LanguageProvider.get('search.in');
            case 'NOT_IN': return LanguageProvider.get('search.not_in');
            case 'LIKE': return LanguageProvider.get('search.contains');
            case 'START': return LanguageProvider.get('search.begin_by');
            case 'END': return LanguageProvider.get('search.end_by');
            case 'VALUE': return LanguageProvider.get('search.equal');
            case 'DIFFERENT_FROM_VALUE': return LanguageProvider.get('search.different');
            case 'MINOR': return LanguageProvider.get('search.minor');
            case 'GREATER': return LanguageProvider.get('search.greater');
            case 'RANGE': return LanguageProvider.get('search.between');
            case 'ISNULL': return LanguageProvider.get('search.isnull');
            default: return type;
        }
    }

    /* valore da mostrare: per le external gli id diventano label,
       per le option il valore diventa la traduzione (se disponibile) */
    function displayValue(item) {
        var col = externalColumn(item);
        if (col) {
            var ext = col.options.entity;
            return String(item.value).split(',').map(s => s.trim()).filter(Boolean)
                .map(id => (labelsCache[ext] && labelsCache[ext][id]) ? labelsCache[ext][id] : id)
                .join(', ');
        }
        var optCol = properties && properties.columns ? properties.columns[item.fieldName] : null;
        if (optCol && optCol.input_type === 'option') {
            return String(item.value).split(',').map(s => s.trim()).filter(Boolean)
                .map(v => {
                    var key = item.fieldName + '.options.' + v;
                    var label = LanguageProvider.getLabel(entity, key);
                    // getLabel restituisce la chiave stessa se la traduzione manca
                    return label === key ? v : label;
                })
                .join(', ');
        }
        return typeof item.value === 'object' ? JSON.stringify(item.value) : item.value;
    }

    /* constraint come stringa unica: "Campo condizione valore" */
    function constraintText(item) {
        const field = LanguageProvider.getLabel(entity, item.fieldName);
        const condLabel = typeLabel(item.type) || '';
        // in mezzo alla frase la condizione va in minuscolo ("Prezzo minore di 10")
        const cond = condLabel.charAt(0).toLowerCase() + condLabel.slice(1);
        if (item.type === 'range') {
            return `${field} ${cond} ${item.min} ${LanguageProvider.get('search.and')} ${item.max}`;
        }
        if (item.type === 'isnull') {
            return `${field} ${cond}`;
        }
        return `${field} ${cond} ${displayValue(item)}`;
    }


    if (!constraints || constraints.length === 0) {
        return null;
    }

    return (
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
            {constraints.map((item, index) => {
                // whitespace-normal + break-words: il Badge di suo non va mai
                // a capo e coi valori lunghi (email) uscirebbe dal popover
                return (
                    <Badge key={index} variant='secondary' className='inline-flex max-w-full items-center whitespace-normal break-words text-left'>
                        <span className='min-w-0'>{constraintText(item)}</span>
                        <span
                            role='button'
                            title={LanguageProvider.get('defaults.delete')}
                            className='ms-1.5 cursor-pointer opacity-60 hover:opacity-100'
                            onClick={() => onRemove(item, index)}
                        >
                            <Icon name="xmark" />
                        </span>
                    </Badge>
                );
            })}
            {children}
        </div>
    );
};
