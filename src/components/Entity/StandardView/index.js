import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Spinner } from '../../ui/spinner';
import { Alert } from '../../ui/alert';
import { Card, CardBody } from '../../ui/card';
import { settings } from '../../../config/settings';
import { LanguageProvider } from '../../../core/language-provider';
import { DataManager } from '../../../core/data-manager';
import { ViewManager } from '../../../core/view-manager';
import { AuthorizationManager } from '../../../core/authorization-manager';
import DataGrid from '../../../components/Entity/DataGrid';
import PaginationBlock from '../../../components/Entity/Pagination';
import SearchPro from '../../../components/Entity/SearchPro';
import StandardViewHookTop from '../../../config/hooks/StandardViewTopHook';
import StandardViewHookBottom from '../../../config/hooks/StandardViewBottomHook';
import { Utils } from '../../../core/utils';
import _ from "lodash";
import Icon from '../../BodyElements/Icon';


export default function StandardView({ entity, title = null }) {

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [totalPages, setTotalPages] = useState('');
    const [total, setTotal] = useState(0);
    const [props, setProps] = useState(null);
    const [errors, setErrors] = useState('');
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    /* URL leggibile: ?query=rossi&page=2&sort=id desc, date asc&f=status:value:active
       Ogni constraint è un parametro `f` ripetuto nel formato campo:condizione:valore
       (range: campo:range:min..max — isnull: campo:isnull). La query string viene
       costruita a mano: URLSearchParams percent-encoderebbe anche caratteri legali
       come i due punti, le virgole e gli spazi. Nei valori vengono escapati solo
       i caratteri strutturali (% & # +), che sopravvivono al decode in lettura
       perché lo split sui parametri avviene prima del percent-decoding.
       I parametri uguali ai default vengono omessi. */
    function escValue(v) {
        return String(v).replace(/%/g, '%25').replace(/&/g, '%26').replace(/#/g, '%23').replace(/\+/g, '%2B');
    }

    function parseSortParam(str) {
        if (!str) return null;
        var parts = String(str).split(',').map(s => s.trim()).filter(Boolean);
        var sorting = [];
        for (var i = 0; i < parts.length; i++) {
            var m = parts[i].split(/\s+/);
            if (!m[0]) continue;
            sorting.push({ field: m[0], order: (m[1] || 'asc').toLowerCase() });
        }
        return sorting.length > 0 ? sorting : null;
    }

    function serializeConstraint(c) {
        if (c.type === 'isnull') return c.fieldName + ':isnull';
        if (c.type === 'range') return c.fieldName + ':range:' + escValue(c.min ?? '') + '..' + escValue(c.max ?? '');
        return c.fieldName + ':' + c.type + ':' + escValue(c.value ?? '');
    }

    function parseConstraintParam(str) {
        var parts = String(str).split(':');
        var fieldName = parts[0];
        var type = parts[1] || '';
        var value = parts.slice(2).join(':');
        if (!fieldName || !type) return null;
        if (type === 'isnull') return { fieldName: fieldName, type: 'isnull', value: null };
        if (type === 'range') {
            var sep = value.indexOf('..');
            if (sep === -1) return null;
            return { fieldName: fieldName, type: 'range', min: value.slice(0, sep), max: value.slice(sep + 2) };
        }
        return { fieldName: fieldName, type: type, value: value };
    }

    function buildQueryString(p) {
        var parts = [];
        if (p.query) parts.push('query=' + escValue(p.query));
        if (p.page && p.page !== 1) parts.push('page=' + p.page);
        if (p.limit && p.limit !== defaultLimit) parts.push('limit=' + p.limit);
        var sortStr = (p.sorting || []).map(s => s.field + ' ' + s.order).join(', ');
        if (sortStr && sortStr !== defaultSortingField + ' ' + defaultSortingOrder) parts.push('sort=' + sortStr);
        (p.constraints || []).forEach(c => parts.push('f=' + serializeConstraint(c)));
        return parts.join('&');
    }
    const searchableFields = Utils.cloneObject(ViewManager.getSearchableColumns(entity));
    const [searchObj, setSearchObj] = useState({
        'query': '',
        'fields': searchableFields,
        'constraints': []
    });
    const [params, setParams] = useState(null);
    /* defaults */
    const defaultLimit = (settings.configEntity && settings.configEntity[entity]) ? settings.configEntity[entity].limit : settings.config.limit;
    const defaultSortingField = (settings.configEntity && settings.configEntity[entity]) ? settings.configEntity[entity].sortingField : settings.config.sortingField;
    const defaultSortingOrder = (settings.configEntity && settings.configEntity[entity]) ? settings.configEntity[entity].sortingOrder : settings.config.sortingOrder;



    useEffect(() => {
        initParams()

        return () => {
            console.log("--- ENTITY UNMOUNTED " + entity + " ---")
            setProps(null)
        }
    }, [entity]);

    useEffect(() => {
        if (params !== null) {
            document.documentElement.scrollTo(0, 0);
            var qs = buildQueryString(params)
            var current = location.search.startsWith('?') ? location.search.slice(1) : location.search
            if (current !== qs) {
                // navigate con search già costruita: react-router la usa verbatim,
                // setSearchParams invece percent-encoderebbe : , e gli spazi
                navigate({ pathname: location.pathname, search: qs ? '?' + qs : '' })
            }
            getData()
        }
    }, [params]);

    useEffect(() => {
        if (params !== null) {
            /*
            setParams({
                ...params, 
                page: 1,
                constraints: searchObj.constraints,
                query: searchObj.query
            });
            */
        }
    }, [searchObj]);


    function initParams() {
        var sorting = parseSortParam(searchParams.get('sort'))
            || [{ field: defaultSortingField, order: defaultSortingOrder }]
        var constraints = searchParams.getAll('f')
            .map(parseConstraintParam)
            .filter(Boolean)
        var query = searchParams.get('query') || ''

        var p = {
            'page': parseInt(searchParams.get('page')) || 1,
            'limit': parseInt(searchParams.get('limit')) || defaultLimit,
            'sortingField': sorting[0].field,
            'sortingOrder': sorting[0].order,
            'sorting': sorting,
            'constraints': constraints,
            'query': query
        }

        setSearchObj({
            'query': query,
            'fields': searchableFields,
            'constraints': constraints
        })
        setParams(p)
    }

    async function getData() {
        console.warn('getting data', params)
        setLoading(true)

        // array [{field, order}, ...]: DataManager lo trasforma nella stringa
        // "field order, field order" (retrocompatibile con l'oggetto singolo)
        var sorting = (params.sorting && params.sorting.length > 0)
            ? params.sorting
            : [{ 'field': params.sortingField, 'order': params.sortingOrder }]
        if (params.query === '' && (params.constraints.length === 0)) {
            var response = await DataManager.getItemsSimple(entity, params.page, params.limit, sorting)
        }
        else {
            let query = params.query || ''
            let fields = searchObj.fields || []
            let constraints = params.constraints || []
            var response = await DataManager.searchItemsSimple(entity, params.page, params.limit, sorting, query, fields, constraints)
        }
        if (response.success === 1) {
            console.warn('StandardView -- response', response)
            setData(response.body)
            setProps(response.table)
            setTotalPages(response.pages)
            setTotal(response.total)
        }
        else {
            setErrors(response.message)
        }
        setLoading(false)
    }

    function changeSorting(field, order) {
        setParams({
            ...params,
            sortingField: field,
            sortingOrder: order,
            sorting: [{ field: field, order: order }],
            page: 1
        });
    }

    /**
     * Click sulla freccetta: inverte solo il verso (asc ↔ desc) della
     * colonna, senza mai toglierla dall'ordinamento.
     */
    function invertSorting(field) {
        var sorting = (params.sorting && params.sorting.length > 0)
            ? [...params.sorting]
            : [{ field: params.sortingField, order: params.sortingOrder }];
        var index = sorting.findIndex(s => s.field === field);
        if (index === -1) return;
        var inverted = String(sorting[index].order).toLowerCase() === 'asc' ? 'desc' : 'asc';
        sorting[index] = { field: field, order: inverted };
        setParams({
            ...params,
            sortingField: sorting[0].field,
            sortingOrder: sorting[0].order,
            sorting: sorting,
            page: 1
        });
    }

    /**
     * Multi-sort (shift+click sull'intestazione di colonna): cicla
     * aggiungi asc → inverti in desc → togli dall'ordinamento.
     * Il primo elemento resta specchiato in sortingField/sortingOrder.
     */
    function toggleMultiSorting(field) {
        var sorting = (params.sorting && params.sorting.length > 0)
            ? [...params.sorting]
            : [{ field: params.sortingField, order: params.sortingOrder }];
        var index = sorting.findIndex(s => s.field === field);
        if (index === -1) {
            sorting.push({ field: field, order: 'asc' });
        }
        else if (String(sorting[index].order).toLowerCase() === 'asc') {
            sorting[index] = { field: field, order: 'desc' };
        }
        else {
            sorting.splice(index, 1);
        }
        if (sorting.length === 0) {
            sorting = [{ field: defaultSortingField, order: defaultSortingOrder }];
        }
        setParams({
            ...params,
            sortingField: sorting[0].field,
            sortingOrder: sorting[0].order,
            sorting: sorting,
            page: 1
        });
    }

    /**
     * Toglie il campo dal multi-sort; se non resta nulla si torna
     * all'ordinamento di default dell'entità.
     */
    function removeSorting(field) {
        var sorting = (params.sorting && params.sorting.length > 0)
            ? [...params.sorting]
            : [{ field: params.sortingField, order: params.sortingOrder }];
        var index = sorting.findIndex(s => s.field === field);
        if (index === -1) return;
        sorting.splice(index, 1);
        if (sorting.length === 0) {
            sorting = [{ field: defaultSortingField, order: defaultSortingOrder }];
        }
        setParams({
            ...params,
            sortingField: sorting[0].field,
            sortingOrder: sorting[0].order,
            sorting: sorting,
            page: 1
        });
    }

    function changeLimit(l) {
        setParams({
            ...params,
            limit: l,
            page: 1
        });
    }

    function changePage(p) {
        setParams({
            ...params,
            page: p
        });
    }

    function search(obj) {
        if (_.isEqual(obj, searchObj)) {
            // oggetti uguali non triggero la ricerca
        }
        else {
            setSearchObj(obj)
            setParams({
                ...params,
                page: 1,
                constraints: obj.constraints,
                query: obj.query
            });
        }
    }

    function create() {
        if (props.reference_entity) {
            navigate('/entity/' + props.reference_entity + '/add')
        }
        else {
            navigate('/entity/' + entity + '/add')
        }
    }




    if (entity !== null && props !== null && data !== null) {
        return (
            <>
                <div className='mb-4 mt-4 w-full'>
                    {/* Titolo pagina a sinistra; a destra il hook top e poi
                        Crea nuovo (in base ai permessi); SearchPro sotto, in
                        una card larga come quella del datagrid. Il blocco è
                        sempre visibile: è la sede del hook top */}
                    <div className='mb-4 flex items-center justify-between gap-2'>
                        <h3 style={{marginBottom:0}}>{title || '-'}</h3>
                        <div className='flex items-center gap-2'>
                            {/* hook */}
                            <StandardViewHookTop entity={entity} data={data} searchObj={searchObj} setSearchObj={search} total={total} />
                            {AuthorizationManager.checkEntityActionAuth(entity, 'create') !== false ? (
                                <Button id={"btn-create-new-"+entity} variant="outline-success" onClick={() => create()}><Icon name="plus" /> {LanguageProvider.get('defaults.create', 'Create')}</Button>
                            ) : null}
                        </div>
                    </div>
                    <Card>
                        <CardBody className='p-3'>
                            <SearchPro entity={entity} setSearchObj={search} searchObj={searchObj} loading={loading} autoFocus={true} />
                        </CardBody>
                    </Card>
                </div>

                <DataGrid entity={entity} props={props} data={data} setData={setData} params={params} searchObj={searchObj} setSearchObj={search} changeSorting={changeSorting} toggleMultiSorting={toggleMultiSorting} invertSorting={invertSorting} removeSorting={removeSorting} refreshData={getData} loading={loading} total={total} />
 
                <PaginationBlock page={params.page} totalPages={totalPages} limit={params.limit} setLimit={changeLimit} changePage={changePage} />


                {/* hook */}
                <StandardViewHookBottom entity={entity} data={data} searchObj={searchObj} setSearchObj={search} total={total} />
            </>
        );
    }
    else {
        return (
            <div className='mx-auto mb-12 mt-12 w-full max-w-3xl px-3'>
                <div className='p-12 text-center'>
                    {errors && errors.length > 0 ? (
                        <Alert variant='danger'>
                            {errors}
                        </Alert>
                    ) : (
                        <>
                            <Spinner variant="primary" />
                            <p className='text-primary'>{LanguageProvider.get('defaults.loading')}</p>
                        </>
                    )}
                </div>
            </div>
        )
    }

};