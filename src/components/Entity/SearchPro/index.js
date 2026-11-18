import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { DatePicker } from '../../ui/date-picker';
import { Select as NativeSelect } from '../../ui/select';
import { InputGroup, InputGroupText } from '../../ui/input-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { Combobox, MultiCombobox } from '../../ui/combobox';
import { LanguageProvider } from '../../../core/language-provider';
import { ViewManager } from '../../../core/view-manager';
import { DataManager } from '../../../core/data-manager';
import { Utils } from '../../../core/utils';
import { toast } from '../../ui/toast';
import _ from "lodash";
import Icon from '../../BodyElements/Icon';
import AppliedFilters from '../AppliedFilters';


export default function SearchPro({ entity, setSearchObj, searchObj = null, autoFocus = false, loading = false }) {

    const properties = ViewManager.getEntityProperties(entity)
    const availableFields = Utils.cloneObject(ViewManager.getEditableColumns(entity))
    const searchableFields = Utils.cloneObject(ViewManager.getSearchableColumns(entity))
    const [activeFields, setActiveFields] = useState(searchableFields)
    const [constraints, setConstraints] = useState([])
    const [queryString, setQueryString] = useState(searchObj ? searchObj.query : '')
    const listOfUsableFilter = []
    searchableFields.map(key => {
        listOfUsableFilter.push({
            label: LanguageProvider.getLabel(entity, key),
            key: key,
            value: properties.columns[key]
        });
    });
    const usableFiltersConditions = [
        { value: 'value', label: LanguageProvider.get('search.equal') },
        { value: 'different_from_value', label: LanguageProvider.get('search.different') },
        { value: 'isnull', label: LanguageProvider.get('search.isnull') }
    ]
    const usableFiltersConditionsStrings = [
        { value: 'value', label: LanguageProvider.get('search.equal') },
        { value: 'like', label: LanguageProvider.get('search.contains') },
        { value: 'start', label: LanguageProvider.get('search.begin_by') },
        { value: 'end', label: LanguageProvider.get('search.end_by') },
        { value: 'different_from_value', label: LanguageProvider.get('search.different') },
        { value: 'in', label: LanguageProvider.get('search.in') },
        { value: 'isnull', label: LanguageProvider.get('search.isnull') }
    ]
    const usableFiltersConditionsNumbers = [
        { value: 'value', label: LanguageProvider.get('search.equal') },
        { value: 'different_from_value', label: LanguageProvider.get('search.different') },
        { value: 'minor', label: LanguageProvider.get('search.minor') },
        { value: 'greater', label: LanguageProvider.get('search.greater') },
        { value: 'in', label: LanguageProvider.get('search.in') },
        { value: 'isnull', label: LanguageProvider.get('search.isnull') }
    ]
    const usableFiltersConditionsDates = [
        { value: 'value', label: LanguageProvider.get('search.equal') },
        { value: 'different_from_value', label: LanguageProvider.get('search.different') },
        { value: 'minor', label: LanguageProvider.get('search.minor') },
        { value: 'greater', label: LanguageProvider.get('search.greater') },
        { value: 'range', label: LanguageProvider.get('search.between') },
        { value: 'isnull', label: LanguageProvider.get('search.isnull') }
    ]
    const usableFiltersConditionsOptions = [
        { value: 'in', label: LanguageProvider.get('search.in') },
        { value: 'isnull', label: LanguageProvider.get('search.isnull') }
    ]
    const usableFiltersConditionsExternalEntity = [
        { value: 'in', label: LanguageProvider.get('search.in') },
        { value: 'not_in', label: LanguageProvider.get('search.not_in') },
        { value: 'isnull', label: LanguageProvider.get('search.isnull') }
    ]


    const [filtersOpen, setFiltersOpen] = useState(false);
    const [savedViewsOpen, setSavedViewsOpen] = useState(false);
    const [choosenField, setChoosenField] = useState("");
    const [filterType, setFilterType] = useState({});
    const [filterValue, setFilterValue] = useState("");
    const [filterValueMin, setFilterValueMin] = useState("");
    const [filterValueMax, setFilterValueMax] = useState("");
    const [isFieldSelected, setFieldSelected] = useState(false);

    /* autoFocus: l'attributo nativo non basta. Dentro un Dialog Radix il
       FocusScope sposta il focus sul modale DOPO il mount dei figli e lo
       ruba all'input; e durante il loading è montato l'input disabled, che
       non è focusabile. Quindi: effect alla prima render con input abilitato,
       e focus in un timeout 0 così scatta dopo il focus management di Radix. */
    const queryInputRef = useRef(null);
    const didAutoFocusRef = useRef(false);
    useEffect(() => {
        if (autoFocus === true && loading === false && didAutoFocusRef.current === false && window.innerWidth > 900) {
            didAutoFocusRef.current = true;
            const t = setTimeout(() => {
                if (queryInputRef.current) queryInputRef.current.focus();
            }, 0);
            return () => clearTimeout(t);
        }
    }, [autoFocus, loading]);


    function changeChoosenField(option) {
        if (option === null) {
            setFieldSelected(false);
        }
        else {
            setChoosenField(option.value);
            setFilterValue(''); //qua
            setFilterValueMin('');
            setFilterValueMax('');
            setFieldSelected(true);
        }
    }

    function handleFilterValueChange(event) {
        setFilterValue(event.target.value);
    }

    function changeFilterType(option) {
        if (option !== null) {
            setFilterType(option);
            // Reset range values when changing filter type
            setFilterValueMin("");
            setFilterValueMax("");
        }
    }

    function removeConstraint(index) {
        console.log("REMOVE CONSTRAINT ")

        var newConstraints = [...constraints];
        newConstraints.splice(index, 1);
        setConstraints(newConstraints)
    }

    function handleQueryStringChange(event) {
        setQueryString(event.target.value)
    }

    function addFilter() {
        if (filterType.value === 'range') {
            // For range filters, pass min and max separately
            addConstraintRange(choosenField, filterType.value, filterValueMin, filterValueMax);
        } else if (filterType.value === 'isnull') {
            // For isnull filter, no value is needed
            addConstraint(choosenField, filterType.value, null);
        } else {
            addConstraint(choosenField, filterType.value, filterValue);
        }
        //setFieldSelected(false);
        //setFilterType("")
    }

    function addConstraint(fieldName, type, value) {
        var newConstraints = [...constraints];

        newConstraints.push({
            type: type,
            value: value,
            fieldName: fieldName
        })

        console.log("newConstraints", newConstraints)

        setConstraints(newConstraints)
        setFilterValue("");
        setFilterValueMin("");
        setFilterValueMax("");
    }

    function addConstraintRange(fieldName, type, min, max) {
        var newConstraints = [...constraints];

        newConstraints.push({
            type: type,
            min: min,
            max: max,
            fieldName: fieldName
        })

        console.log("newConstraints", newConstraints)

        setConstraints(newConstraints)
        setFilterValue("");
        setFilterValueMin("");
        setFilterValueMax("");
    }


    // begin external entity - OPTIMIZED for large datasets
    const [externalOptions, setExternalOptions] = useState([])
    const [isLoadingExternal, setIsLoadingExternal] = useState(false)

    useEffect(() => {
        if (choosenField) {
            var p = properties.columns[choosenField]
            if (p.input_type === 'externalEntity') {
                var ent = p.options.entity
                var labelField = p.options.labelField
                // Reset and load initial options
                setExternalOptions([])
                loadInitialOptions(labelField, ent)
            }
        }
    }, [choosenField]);

    async function loadInitialOptions(labelField, ent) {
        setIsLoadingExternal(true)
        try {
            const response = await DataManager.searchItemsSimple(ent, 1, 100, {
                'field': labelField,
                'order': 'asc'
            }, '', [labelField], [])

            if (response.success === 1) {
                const options = response.body.map(item => ({
                    value: item.id,
                    label: item[labelField] || `ID: ${item.id}`
                }))
                setExternalOptions(options)
            }
        } catch (error) {
            console.error('Error loading external options:', error)
        }
        setIsLoadingExternal(false)
    }

    async function searchExternalOptions(searchTerm, labelField, ent) {
        if (!searchTerm) {
            // If no search term, reload initial options
            return loadInitialOptions(labelField, ent)
        }

        setIsLoadingExternal(true)
        try {
            const response = await DataManager.searchItemsSimple(ent, 1, 100, {
                'field': labelField,
                'order': 'asc'
            }, searchTerm, [labelField], [])

            if (response.success === 1) {
                const options = response.body.map(item => ({
                    value: item.id,
                    label: item[labelField] || `ID: ${item.id}`
                }))
                setExternalOptions(options)
            }
        } catch (error) {
            console.error('Error searching external options:', error)
        }
        setIsLoadingExternal(false)
    }

    // Debounced search function
    const debouncedExternalSearch = React.useCallback(
        _.debounce((searchTerm, labelField, ent) => {
            searchExternalOptions(searchTerm, labelField, ent)
        }, 300),
        []
    )

    function handleExternalInputChange(inputValue) {
        const p = properties.columns[choosenField]
        const ent = p.options.entity
        const labelField = p.options.labelField
        debouncedExternalSearch(inputValue, labelField, ent)
    }

    function handleExternalValueChange(option) {
        if (option === null) {
            setFilterValue(false);
        }
        else {
            console.log(option)
            setFilterValue(option.value);
        }
    }
    // end external

    function handleOptionValueChange(values) {
        if (!values || values.length === 0) {
            setFilterValue(false);
        }
        else {
            console.log(values)
            setFilterValue(values.join(','));
        }
    }



    function search(obj) {
        if (_.isEqual(obj, searchObj)) {
            console.log('searchObj = : non triggero la ricerca')
            // oggetti uguali non triggero la ricerca
        }
        else {
            console.log('searchObj <> : triggero la ricerca', obj, searchObj)
            setSearchObj(obj)
        }
    }


    useEffect(() => {
        let data = {
            'query': queryString,
            'fields': activeFields,
            'constraints': constraints
        }
        console.log("--- CALLING seachCallback() ---")
        console.log(data)

        const timeOutId = setTimeout(() => search(data), 400);
        return () => clearTimeout(timeOutId);

    }, [constraints]);


    function triggerSearch() {
        let data = {
            'query': queryString,
            'fields': activeFields,
            'constraints': constraints
        }
        console.log("--- CALLING seachCallback() ---")
        console.log(data)

        search(data)
    }

    function resetSearch() {
        setQueryString('')

        let data = {
            'query': '',
            'fields': activeFields,
            'constraints': constraints
        }
        console.log("--- CALLING seachCallback() ---")
        console.log(data)

        search(data)
    }


    useEffect(() => {
        console.log(properties, availableFields, searchableFields)

        //popolo filtri partendo da params
        if (searchObj !== null) {
            if (searchObj.query && searchObj.query.length > 0) {
                setQueryString(searchObj.query)
            }
            if (searchObj.constraints && searchObj.constraints.length > 0) {
                var temp = []
                for (var i = 0; i < searchObj.constraints.length; i++) {
                    var c = searchObj.constraints[i]
                    if (c.type === 'range') {
                        temp.push({ fieldName: c.fieldName, type: c.type, min: c.min, max: c.max, range_type: 'STR' })
                    } else {
                        temp.push({ fieldName: c.fieldName, type: c.type, value: c.value })
                    }
                }
                setConstraints(temp)
            }
            else {
                if(constraints && constraints.length > 0) {
                    setConstraints([])
                }
            }
        }
    }, [searchObj]);



    //salvataggio filtri
    const [filterGroupName, setFilterGroupName] = useState('')
    const [entityUserFilters, setEntityUserFilters] = useState([])
    async function saveFiltersGroup() {
        if (filterGroupName.length && constraints.length) {
            var body = {
                content: JSON.stringify(constraints),
                name: filterGroupName,
                entity: entity
            }
            var response = await DataManager.insertItem('user_entity_saved_filters', body)
            if (response.success === 1) {
                toast.success(LanguageProvider.get('search.success_filters_saved'), { theme: 'colored' });
                getUserFilters()
            }
            else {
                toast.error(LanguageProvider.get('search.fail_filters_saved'), { theme: 'colored' });
            }
        }
        else {
            toast.error(LanguageProvider.get('search.fail_filters_saved'), { theme: 'colored' });
        }
    }
    async function getUserFilters() {
        var c = [
            {
                fieldName: 'entity',
                type: 'value',
                value: entity
            }
        ]
        var response = await DataManager.searchItems('user_entity_saved_filters', 1, 20, { 'field': 'name', 'order': 'ASC' }, '', [], c)
        if (response.success === 1) {
            if (response.body && response.body.length) {
                setEntityUserFilters(response.body)
            }
        }
    }
    function applyFilters(item) {
        setConstraints(JSON.parse(item.content))
    }
    const [filterToDelete, setFilterToDelete] = useState(null);
    function askDeleteUserFilter(e, item) {
        e.stopPropagation();
        setFilterToDelete(item);
    }
    async function confirmDeleteUserFilter() {
        if (!filterToDelete) return;
        var response = await DataManager.deleteItem('user_entity_saved_filters', filterToDelete.id)
        if (response.success === 1) {
            toast.success(LanguageProvider.get('search.success_filters_saved'), { theme: 'colored' });
            getUserFilters()
        }
        setFilterToDelete(null);
    }
    useEffect(() => {
        getUserFilters()
    }, []);

    function resetFilters() {
        setConstraints([])
    }


    /* etichetta + valore di un constraint attivo */
    function renderConstraintBadges(item) {
        switch (item.type.toUpperCase()) {
            case 'IN': {
                const myArray = item.value.split(",")
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.in')}</Badge>
                        <span style={{ whiteSpace: 'break-spaces' }}>
                            {myArray.map((el, index) => {
                                return (
                                    <Badge variant="info" className='me-1' key={index}>{el}</Badge>
                                )
                            })}
                        </span>
                    </>
                )
            };
            case 'NOT_IN': {
                const myArrayNotIn = item.value.split(",")
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.not_in')}</Badge>
                        <span style={{ whiteSpace: 'break-spaces' }}>
                            {myArrayNotIn.map((el, index) => {
                                return (
                                    <Badge variant="warning" className='me-1' key={index}>{el}</Badge>
                                )
                            })}
                        </span>
                    </>
                )
            };
            case 'LIKE': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.contains')}</Badge>
                        <Badge variant="info">{item.value}</Badge>
                    </>
                )
            };
            case 'START': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.begin_by')}</Badge>
                        <Badge variant="info">{item.value}</Badge>
                    </>
                )
            };
            case 'END': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.end_by')}</Badge>
                        <Badge variant="info">{item.value}</Badge>
                    </>
                )
            };
            case 'VALUE': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.equal')}</Badge>
                        <Badge variant="info">{item.value}</Badge>
                    </>
                )
            };
            case 'DIFFERENT_FROM_VALUE': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.different')}</Badge>
                        <Badge variant="info">{item.value}</Badge>
                    </>
                )
            };
            case 'MINOR': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.minor')}</Badge>
                        <Badge variant="info">{item.value}</Badge>
                    </>
                )
            };
            case 'GREATER': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.greater')}</Badge>
                        <Badge variant="info">{item.value}</Badge>
                    </>
                )
            };
            case 'RANGE': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.between')}</Badge>
                        <Badge variant="info">{item.min}</Badge>
                        <Badge className='mx-1' variant={'secondary'}>{LanguageProvider.get('search.and')}</Badge>
                        <Badge variant="info">{item.max}</Badge>
                    </>
                )
            };
            case 'ISNULL': {
                return (
                    <>
                        <Badge className='me-2 ms-2' variant={'secondary'}>{LanguageProvider.get('search.isnull')}</Badge>
                    </>
                )
            };
            default: return (
                <>
                    <Badge className='me-2 ms-2' variant={'secondary'}>{item.type}</Badge>
                    <Badge variant="info">{typeof item.value === 'object' ? JSON.stringify(item.value) : item.value}</Badge>
                </>
            );
        }
    }

    /* select del tipo di condizione in base al tipo di campo */
    function renderFilterTypeSelect() {
        var options = usableFiltersConditions
        if (typeof (properties.columns[choosenField]) !== 'undefined') {
            switch (properties.columns[choosenField].input_type) {
                case 'string':
                case 'text':
                case 'email':
                    options = usableFiltersConditionsStrings
                    break;
                case 'float':
                case 'number':
                    options = usableFiltersConditionsNumbers
                    break;
                case 'date':
                case 'time':
                case 'datetime':
                    options = usableFiltersConditionsDates
                    break;
                case 'externalEntity':
                    options = usableFiltersConditionsExternalEntity
                    break;
                case 'option':
                    options = usableFiltersConditionsOptions
                    break;
                default:
                    options = usableFiltersConditions
            }
        }
        return (
            <Combobox
                options={options}
                value={filterType && filterType.value !== undefined ? filterType.value : null}
                onChange={changeFilterType}
                placeholder={LanguageProvider.get('search.type_label')}
            />
        )
    }


    return (
        <>
            <div className='w-full'>
                <div className='flex w-full items-center'>
                <InputGroup className='search-adv flex-1'>
                    <Button variant="light" className='border border-input' onClick={() => setFiltersOpen(true)} title={LanguageProvider.get('search.filters')}>
                        <Icon name="sliders" />
                    </Button>

                    {loading === true ? (
                                <Input
                                    disabled
                                    className='search-pro-input'
                                    value={queryString}
                                    type="text"
                                    placeholder={LanguageProvider.get('defaults.search')}
                                />
                            ) : (
                                <Input
                                    ref={queryInputRef}
                                    className='search-pro-input'
                                    value={queryString}
                                    onChange={handleQueryStringChange}
                                    type="text"
                                    placeholder={LanguageProvider.get('defaults.search')}
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter') {
                                            triggerSearch()
                                        }
                                    }}
                                />
                            )}

                    {queryString && queryString.length > 0 ? (
                        <InputGroupText className='cursor-pointer bg-card' role="button" onClick={() => resetSearch()}>
                            <Icon name="xmark" color="red" />
                        </InputGroupText>
                    ) : null}

                    <Button variant='success' onClick={() => triggerSearch()}>
                        {LanguageProvider.get('defaults.search')}
                    </Button>
                </InputGroup>

                <Button variant="light" className='ms-2 border border-input' onClick={() => setSavedViewsOpen(true)} title={LanguageProvider.get('search.saved_filters')}>
                    <Icon name="bookmark" />
                </Button>
                </div>

                <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <DialogContent
                        size="xl"
                        className="max-w-5xl"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                        <DialogHeader>
                            <DialogTitle>
                                <Icon name="sliders" className='me-2' />
                                {LanguageProvider.get('search.filters')}
                            </DialogTitle>
                        </DialogHeader>
                        <DialogBody className='min-h-[380px]'>
                        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            <div>
                                <div className='font-medium'>{LanguageProvider.get('search.add_filter')}</div>
                                <p className='small-description-text'>{LanguageProvider.get('search.add_filter_subtitle')}</p>

                                <span className='text-sm'>{LanguageProvider.get('search.field_label')}</span>
                                <div className='mb-3 mt-1'>
                                    <Combobox
                                        options={listOfUsableFilter.map(f => ({ value: f.key, label: f.label }))}
                                        value={isFieldSelected ? choosenField : null}
                                        onChange={changeChoosenField}
                                        placeholder={LanguageProvider.get('search.field_label')}
                                    />
                                </div>

                                <span className='text-sm'>{LanguageProvider.get('search.type_label')}</span>
                                <div className='mb-3 mt-1'>
                                    {renderFilterTypeSelect()}
                                </div>

                                <span className='text-sm'>{LanguageProvider.get('search.field_value')}</span>
                                {isFieldSelected && filterType.value !== 'isnull' ?
                                    <div className="mb-4">

                                        {(() => {
                                            if (typeof (properties.columns[choosenField]) !== 'undefined') {
                                                switch (properties.columns[choosenField].input_type) {
                                                    case 'string': return (
                                                        <Input value={filterValue} onChange={handleFilterValueChange} type="text" />
                                                    );
                                                    case 'text': return (
                                                        <Input value={filterValue} onChange={handleFilterValueChange} type="text" />
                                                    );
                                                    case 'email': return (
                                                        <Input value={filterValue} onChange={handleFilterValueChange} type="text" />
                                                    );
                                                    case 'float': return (
                                                        <Input type="number" value={filterValue} onChange={handleFilterValueChange} />
                                                    );
                                                    case 'number': return (
                                                        <Input type="number" value={filterValue} onChange={handleFilterValueChange} />
                                                    );
                                                    case 'date': return (
                                                        <>
                                                            {filterType.value === 'range' ? (
                                                                <div className='flex w-full gap-2'>
                                                                    <DatePicker
                                                                        value={filterValueMin}
                                                                        onChange={(v) => setFilterValueMin(v)}
                                                                        placeholder={LanguageProvider.get('search.from')}
                                                                    />
                                                                    <DatePicker
                                                                        value={filterValueMax}
                                                                        onChange={(v) => setFilterValueMax(v)}
                                                                        placeholder={LanguageProvider.get('search.to')}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <DatePicker
                                                                    value={filterValue}
                                                                    onChange={(v) => handleFilterValueChange({ target: { value: v } })}
                                                                />
                                                            )}
                                                        </>
                                                    );
                                                    case 'time': return (
                                                        <>
                                                            {filterType.value === 'range' ? (
                                                                <InputGroup>
                                                                    <Input
                                                                        size="sm"
                                                                        type="time"
                                                                        value={filterValueMin}
                                                                        onChange={(e) => setFilterValueMin(e.target.value)}
                                                                        placeholder={LanguageProvider.get('search.from')}
                                                                    />
                                                                    <Input
                                                                        size="sm"
                                                                        type="time"
                                                                        value={filterValueMax}
                                                                        onChange={(e) => setFilterValueMax(e.target.value)}
                                                                        placeholder={LanguageProvider.get('search.to')}
                                                                    />
                                                                </InputGroup>
                                                            ) : (
                                                                <Input
                                                                    type="time"
                                                                    value={filterValue}
                                                                    onChange={handleFilterValueChange}
                                                                />
                                                            )}
                                                        </>
                                                    );
                                                    case 'datetime': return (
                                                        <>
                                                            {filterType.value === 'range' ? (
                                                                <InputGroup>
                                                                    <Input
                                                                        size="sm"
                                                                        type="datetime-local"
                                                                        value={filterValueMin}
                                                                        onChange={(e) => setFilterValueMin(e.target.value)}
                                                                        placeholder={LanguageProvider.get('search.from')}
                                                                    />
                                                                    <Input
                                                                        size="sm"
                                                                        type="datetime-local"
                                                                        value={filterValueMax}
                                                                        onChange={(e) => setFilterValueMax(e.target.value)}
                                                                        placeholder={LanguageProvider.get('search.to')}
                                                                    />
                                                                </InputGroup>
                                                            ) : (
                                                                <Input
                                                                    type="datetime-local"
                                                                    value={filterValue}
                                                                    onChange={handleFilterValueChange}
                                                                />
                                                            )}
                                                        </>
                                                    );
                                                    case 'boolean': return (
                                                        <NativeSelect onChange={handleFilterValueChange}>
                                                            <option value='null'>Seleziona</option>
                                                            <option value="1">{LanguageProvider.get('defaults.true')}</option>
                                                            <option value="0">{LanguageProvider.get('defaults.false')}</option>
                                                        </NativeSelect>
                                                    );
                                                    case 'externalEntity':
                                                        // Always use multi-select for externalEntity (only 'in' filter)
                                                        const selectedIds = filterValue ? filterValue.split(',').map(v => v.trim()) : [];

                                                        // Keep selected options even if not in current search results
                                                        const selectedOptions = selectedIds.map(id => {
                                                            const found = externalOptions.find(opt => String(opt.value) === String(id));
                                                            if (found) return found;
                                                            // Return a basic option for selected items not in current results
                                                            return { value: id, label: `ID: ${id}` };
                                                        }).filter(Boolean);

                                                        // Merge selected options with search results, removing duplicates
                                                        const allOptions = [...selectedOptions];
                                                        externalOptions.forEach(opt => {
                                                            if (!selectedIds.includes(String(opt.value))) {
                                                                allOptions.push(opt);
                                                            }
                                                        });

                                                        return (
                                                            <>
                                                                <MultiCombobox
                                                                    options={allOptions}
                                                                    values={selectedIds}
                                                                    loading={isLoadingExternal}
                                                                    onChange={(vals) => setFilterValue(vals.join(','))}
                                                                    onSearchChange={handleExternalInputChange}
                                                                    placeholder="Type to search..."
                                                                    searchPlaceholder="Type to search..."
                                                                    emptyText="Start typing to search..."
                                                                />
                                                            </>
                                                        );
                                                    case 'option': {
                                                        var optionSelect = []
                                                        for (var j = 0; j < properties.columns[choosenField].options.options.length; j++) {
                                                            var option = properties.columns[choosenField].options.options[j]
                                                            var optionVPkey = choosenField + '.options.' + option.value
                                                            optionSelect.push({
                                                                value: option.value,
                                                                label: LanguageProvider.getLabel(entity, optionVPkey)
                                                            })
                                                        }
                                                        return (
                                                            <MultiCombobox
                                                                options={optionSelect}
                                                                values={filterValue ? String(filterValue).split(',').map(v => v.trim()) : []}
                                                                onChange={handleOptionValueChange}
                                                                placeholder={LanguageProvider.get('search.field_value')}
                                                            />
                                                        )
                                                    };
                                                    default: return (
                                                        <Input value={filterValue} onChange={handleFilterValueChange} type="text" />
                                                    );
                                                }
                                            }
                                        })()}

                                    </div>
                                    :
                                    <p className='medium-select-description-text'>{LanguageProvider.get('search.select_constraint_field')}</p>
                                }

                                <Button size="sm" disabled={
                                    filterType.length == 0 ||
                                    (filterType.value === 'range'
                                        ? (!filterValueMin || filterValueMin.length == 0 || !filterValueMax || filterValueMax.length == 0)
                                        : (filterType.value === 'isnull'
                                            ? false
                                            : (!filterValue || filterValue.length == 0)))
                                } onClick={addFilter} variant="primary">
                                    {LanguageProvider.get('defaults.add')}
                                </Button>
                            </div>

                            <div>
                                <div className='font-medium'>{LanguageProvider.get('search.active_filters')}</div>
                                <p className='small-description-text'>{LanguageProvider.get('search.active_filters_subtitle')}</p>

                                <div>
                                    {constraints.map((item, index) => {
                                        return (
                                            <div key={index} className="mb-4 flex w-full items-center">
                                                <div className='grow' style={{ whiteSpace: 'break-spaces' }}>
                                                    <Badge>{LanguageProvider.getLabel(entity, item.fieldName)}</Badge>
                                                    {renderConstraintBadges(item)}
                                                </div>
                                                <div className='ps-2 text-right'>
                                                    <Badge pill variant="danger" role="button" className='cursor-pointer' onClick={() => { removeConstraint(index) }}>
                                                        <Icon name="xmark" size={'lg'} />
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {constraints && constraints.length > 0 ? (
                                    <>
                                        <div className='mt-2 cursor-pointer text-center text-sm text-danger' role="button" onClick={() => resetFilters()}>
                                            {LanguageProvider.get('search.reset_filters')}
                                        </div>
                                        <InputGroup className="mb-4 mt-12">
                                            <Input size="sm" placeholder="Etichetta gruppo filtri" value={filterGroupName} onChange={(e) => setFilterGroupName(e.target.value)} type="text" />
                                            <Button size="sm" variant="outline-secondary" onClick={() => saveFiltersGroup()}>
                                                {LanguageProvider.get('search.save_filters')}
                                            </Button>
                                        </InputGroup>
                                    </>
                                ) : (
                                    <></>
                                )}

                                {entityUserFilters && entityUserFilters.length > 0 ? (
                                    <div className='mt-12'>
                                        {LanguageProvider.get('search.saved_filters')}<br />
                                        {entityUserFilters.map((item, index) => {
                                            return (
                                                <Badge key={index} onClick={() => applyFilters(item)} className="mb-2 me-2 mt-2 inline-flex cursor-pointer items-center" role='button'>
                                                    {item.name} <Icon name="arrow-right" className="ms-1" />
                                                    <span className="ms-2 inline-flex items-center justify-center" style={{ backgroundColor: '#dc3545', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px' }} onClick={(e) => askDeleteUserFilter(e, item)}><Icon name="xmark" /></span>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <></>
                                )}

                            </div>
                        </div>
                        </DialogBody>
                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setFiltersOpen(false)}>
                                {LanguageProvider.get('defaults.close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Filtri attivi esposti sotto la barra: si vedono e si tolgono
                    senza aprire il modale */}
                {constraints && constraints.length > 0 ? (
                    <div className='mt-2'>
                        <AppliedFilters entity={entity} constraints={constraints} onRemove={(item, index) => removeConstraint(index)}>
                            {constraints.length > 1 ? (
                                <span className='cursor-pointer text-xs text-danger' role='button' onClick={() => resetFilters()}>
                                    {LanguageProvider.get('search.reset_filters')}
                                </span>
                            ) : null}
                        </AppliedFilters>
                    </div>
                ) : null}

            </div>

            {/* Viste salvate: modalino di selezione (icona bookmark nella barra) */}
            <Dialog open={savedViewsOpen} onOpenChange={setSavedViewsOpen}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>
                            <Icon name="bookmark" className='me-2' />
                            {LanguageProvider.get('search.saved_filters')}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {entityUserFilters && entityUserFilters.length > 0 ? (
                            <div className='flex flex-col'>
                                {entityUserFilters.map((item, index) => {
                                    return (
                                        <div
                                            key={index}
                                            role='button'
                                            className='flex cursor-pointer items-center justify-between rounded-md px-2 py-2 hover:bg-accent'
                                            onClick={() => { applyFilters(item); setSavedViewsOpen(false); }}
                                        >
                                            <span className='inline-flex items-center'>
                                                <Icon name="filter" className='me-2 text-muted-foreground' />
                                                {item.name}
                                            </span>
                                            <span
                                                role='button'
                                                title={LanguageProvider.get('defaults.delete')}
                                                className='cursor-pointer px-1 text-muted-foreground hover:text-danger'
                                                onClick={(e) => askDeleteUserFilter(e, item)}
                                            >
                                                <Icon name="trash" />
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className='py-4 text-center text-muted-foreground'>
                                {LanguageProvider.get('search.no_saved_filters')}
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" size="sm" onClick={() => setSavedViewsOpen(false)}>
                            {LanguageProvider.get('defaults.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={filterToDelete !== null} onOpenChange={(open) => { if (!open) setFilterToDelete(null) }}>
                <DialogContent size="sm" className='top-1/2 -translate-y-1/2'>
                    <DialogHeader>
                        <DialogTitle>{LanguageProvider.get('defaults.delete_title')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {LanguageProvider.get('defaults.delete_msg')} <strong>{filterToDelete?.name}</strong>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" size="sm" onClick={() => setFilterToDelete(null)}>
                            {LanguageProvider.get('defaults.cancel')}
                        </Button>
                        <Button variant="danger" size="sm" onClick={confirmDeleteUserFilter}>
                            <Icon name="trash" className="me-1" /> {LanguageProvider.get('defaults.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
