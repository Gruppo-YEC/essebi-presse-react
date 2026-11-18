import React, { useState, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '../../ui/popover';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { DatePicker } from '../../ui/date-picker';
import { Select as NativeSelect } from '../../ui/select';
import { MultiCombobox } from '../../ui/combobox';
import { LanguageProvider } from '../../../core/language-provider';
import { DataManager } from '../../../core/data-manager';
import './ColumnFilter.css';
import _ from "lodash";
import Icon from '../../BodyElements/Icon';
import AppliedFilters from '../AppliedFilters';

export default function ColumnFilter({
    fieldName,
    fieldConfig,
    entity,
    params,
    changeSorting,
    toggleMultiSorting,
    invertSorting,
    removeSorting,
    searchObj,
    setSearchObj
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [filterValue, setFilterValue] = useState('');
    const [filterValueMin, setFilterValueMin] = useState('');
    const [filterValueMax, setFilterValueMax] = useState('');
    const [filterType, setFilterType] = useState(
        (fieldConfig.input_type === 'option' || fieldConfig.input_type === 'externalEntity') ? 'in' : 'value'
    );

    // filtri attivi su questa colonna (possono essere più di uno: applicare
    // un filtro non cancella i precedenti, si tolgono con la X sul badge)
    const fieldConstraints = (searchObj && searchObj.constraints ? searchObj.constraints : []).filter(c => c.fieldName === fieldName);

    // External entity states
    const [externalOptions, setExternalOptions] = useState([]);
    const [isLoadingExternal, setIsLoadingExternal] = useState(false);

    // Check if field is sortable
    const isSortable = () => {
        const nonSortable = ['richText', 'markdown', 'file', 'externalEntity', 'multipleExternalEntity', 'deepExternalEntity'];
        return !nonSortable.includes(fieldConfig.input_type);
    };

    // Check if field is filterable
    const isFilterable = () => {
        const nonFilterable = ['richText', 'markdown', 'file', 'multipleExternalEntity', 'deepExternalEntity'];
        return !nonFilterable.includes(fieldConfig.input_type);
    };

    // Sort functions (le voci del popover impostano l'ordinamento PRIMARIO,
    // sostituendo l'eventuale multi-sort; il multi-sort si compone con
    // shift+click sull'intestazione)
    const handleSortAsc = () => {
        if (isActiveSorting && activeSortingOrder === 'asc') {
            // If clicking on already active ASC sort, reset to default (id DESC)
            changeSorting('id', 'desc');
        } else {
            changeSorting(fieldName, 'asc');
        }
        setIsOpen(false);
    };

    const handleSortRemove = () => {
        if (removeSorting) removeSorting(fieldName);
        setIsOpen(false);
    };

    const handleSortDesc = () => {
        if (isActiveSorting && activeSortingOrder === 'desc') {
            // If clicking on already active DESC sort, reset to default (id DESC)
            changeSorting('id', 'desc');
        } else {
            changeSorting(fieldName, 'desc');
        }
        setIsOpen(false);
    };

    // Filter functions
    const applyFilter = () => {
        if (filterType === 'range') {
            if (!filterValueMin || !filterValueMax) return;
        } else if (filterType === 'isnull') {
            // isnull doesn't need a value
        } else {
            if (!filterValue || filterValue === '') return;
        }

        let newConstraint;
        if (filterType === 'range') {
            newConstraint = {
                fieldName: fieldName,
                type: filterType,
                min: filterValueMin,
                max: filterValueMax,
                range_type: 'STR'
            };
        } else if (filterType === 'isnull') {
            newConstraint = {
                fieldName: fieldName,
                type: filterType,
                value: null
            };
        } else {
            newConstraint = {
                fieldName: fieldName,
                type: filterType,
                value: filterValue
            };
        }

        // i filtri si accumulano: quelli esistenti (anche sullo stesso campo)
        // restano e si tolgono uno a uno con la X sul badge
        let newConstraints = searchObj?.constraints ? [...searchObj.constraints] : [];
        newConstraints.push(newConstraint);

        const newSearchObj = {
            ...searchObj,
            constraints: newConstraints
        };

        setSearchObj(newSearchObj);
        setFilterValue('');
        setFilterValueMin('');
        setFilterValueMax('');
        setIsOpen(false);
    };

    const removeFieldConstraint = (item) => {
        if (!searchObj?.constraints) return;

        const newConstraints = searchObj.constraints.filter(c => c !== item);

        const newSearchObj = {
            ...searchObj,
            constraints: newConstraints
        };

        setSearchObj(newSearchObj);
    };

    // External entity functions
    useEffect(() => {
        if (fieldConfig.input_type === 'externalEntity' && isOpen) {
            loadExternalOptions();
        }
    }, [isOpen, fieldConfig]);

    const loadExternalOptions = async () => {
        if (fieldConfig.input_type !== 'externalEntity') return;

        setIsLoadingExternal(true);
        const extEntity = fieldConfig.options.entity;
        const labelField = fieldConfig.options.labelField || 'name';

        try {
            const response = await DataManager.searchItemsSimple(extEntity, 1, 100, {
                'field': labelField,
                'order': 'asc'
            }, '', [labelField], []);

            if (response.success === 1) {
                const options = response.body.map(item => ({
                    value: item.id,
                    label: item[labelField] || `ID: ${item.id}`
                }));
                setExternalOptions(options);
            }
        } catch (error) {
            console.error('Error loading external options:', error);
        }
        setIsLoadingExternal(false);
    };

    const searchExternalOptions = async (searchTerm) => {
        if (!searchTerm || fieldConfig.input_type !== 'externalEntity') return;

        setIsLoadingExternal(true);
        const extEntity = fieldConfig.options.entity;
        const labelField = fieldConfig.options.labelField || 'name';

        try {
            const response = await DataManager.searchItemsSimple(extEntity, 1, 100, {
                'field': labelField,
                'order': 'asc'
            }, searchTerm, [labelField], []);

            if (response.success === 1) {
                const options = response.body.map(item => ({
                    value: item.id,
                    label: item[labelField] || `ID: ${item.id}`
                }));
                setExternalOptions(options);
            }
        } catch (error) {
            console.error('Error searching external options:', error);
        }
        setIsLoadingExternal(false);
    };

    const debouncedExternalSearch = React.useCallback(
        _.debounce((searchTerm) => {
            searchExternalOptions(searchTerm);
        }, 300),
        [fieldConfig]
    );

    // Get filter type options based on field type
    const getFilterTypes = () => {
        switch (fieldConfig.input_type) {
            case 'string':
            case 'text':
                return [
                    { value: 'value', label: LanguageProvider.get('search.equal') },
                    { value: 'like', label: LanguageProvider.get('search.contains') },
                    { value: 'start', label: LanguageProvider.get('search.begin_by') },
                    { value: 'end', label: LanguageProvider.get('search.end_by') },
                    { value: 'different_from_value', label: LanguageProvider.get('search.different') },
                    { value: 'isnull', label: LanguageProvider.get('search.isnull') }
                ];
            case 'number':
            case 'float':
                return [
                    { value: 'value', label: LanguageProvider.get('search.equal') },
                    { value: 'different_from_value', label: LanguageProvider.get('search.different') },
                    { value: 'minor', label: LanguageProvider.get('search.minor') },
                    { value: 'greater', label: LanguageProvider.get('search.greater') },
                    { value: 'isnull', label: LanguageProvider.get('search.isnull') }
                ];
            case 'date':
            case 'time':
            case 'datetime':
                return [
                    { value: 'value', label: LanguageProvider.get('search.equal') },
                    { value: 'different_from_value', label: LanguageProvider.get('search.different') },
                    { value: 'minor', label: LanguageProvider.get('search.minor') },
                    { value: 'greater', label: LanguageProvider.get('search.greater') },
                    { value: 'range', label: LanguageProvider.get('search.between') },
                    { value: 'isnull', label: LanguageProvider.get('search.isnull') }
                ];
            case 'boolean':
                return [
                    { value: 'value', label: LanguageProvider.get('search.equal') },
                    { value: 'different_from_value', label: LanguageProvider.get('search.different') },
                    { value: 'isnull', label: LanguageProvider.get('search.isnull') }
                ];
            case 'externalEntity':
                return [
                    { value: 'in', label: LanguageProvider.get('search.in') },
                    { value: 'not_in', label: LanguageProvider.get('search.not_in') },
                    { value: 'isnull', label: LanguageProvider.get('search.isnull') }
                ];
            case 'option':
                return [
                    { value: 'in', label: LanguageProvider.get('search.in') },
                    { value: 'isnull', label: LanguageProvider.get('search.isnull') }
                ];
            default:
                return [
                    { value: 'value', label: LanguageProvider.get('search.equal') },
                    { value: 'isnull', label: LanguageProvider.get('search.isnull') }
                ];
        }
    };

    // Render filter input based on field type
    const renderFilterInput = () => {
        // Don't render input for isnull filter type
        if (filterType === 'isnull') {
            return null;
        }

        switch (fieldConfig.input_type) {
            case 'string':
            case 'text':
                return (
                    <Input
                        size="sm"
                        type="text"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applyFilter();
                        }}
                        placeholder={LanguageProvider.get('filterColumns.filter_placeholder')}
                    />
                );

            case 'number':
            case 'float':
                return (
                    <Input
                        size="sm"
                        type="number"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applyFilter();
                        }}
                        placeholder={LanguageProvider.get('filterColumns.filter_placeholder')}
                    />
                );

            case 'date':
                if (filterType === 'range') {
                    return (
                        <>
                            <DatePicker
                                size="sm"
                                value={filterValueMin}
                                onChange={(v) => setFilterValueMin(v)}
                                placeholder={LanguageProvider.get('search.from')}
                            />
                            <DatePicker
                                size="sm"
                                className='mt-1'
                                value={filterValueMax}
                                onChange={(v) => setFilterValueMax(v)}
                                placeholder={LanguageProvider.get('search.to')}
                            />
                        </>
                    );
                } else {
                    return (
                        <DatePicker
                            size="sm"
                            value={filterValue}
                            onChange={(v) => setFilterValue(v)}
                        />
                    );
                }

            case 'time':
                if (filterType === 'range') {
                    return (
                        <>
                            <Input
                                size="sm"
                                type="time"
                                value={filterValueMin}
                                onChange={(e) => setFilterValueMin(e.target.value)}
                                placeholder={LanguageProvider.get('search.from')}
                            />
                            <Input
                                size="sm"
                                className='mt-1'
                                type="time"
                                value={filterValueMax}
                                onChange={(e) => setFilterValueMax(e.target.value)}
                                placeholder={LanguageProvider.get('search.to')}
                            />
                        </>
                    );
                } else {
                    return (
                        <Input
                            size="sm"
                            type="time"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                        />
                    );
                }

            case 'datetime':
                if (filterType === 'range') {
                    return (
                        <>
                            <Input
                                size="sm"
                                type="datetime-local"
                                value={filterValueMin}
                                onChange={(e) => setFilterValueMin(e.target.value)}
                                placeholder={LanguageProvider.get('search.from')}
                            />
                            <Input
                                size="sm"
                                className='mt-1'
                                type="datetime-local"
                                value={filterValueMax}
                                onChange={(e) => setFilterValueMax(e.target.value)}
                                placeholder={LanguageProvider.get('search.to')}
                            />
                        </>
                    );
                } else {
                    return (
                        <Input
                            size="sm"
                            type="datetime-local"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                        />
                    );
                }

            case 'boolean':
                return (
                    <NativeSelect
                        size="sm"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                    >
                        <option value="">{LanguageProvider.get('filterColumns.select_value')}</option>
                        <option value="1">{LanguageProvider.get('defaults.true')}</option>
                        <option value="0">{LanguageProvider.get('defaults.false')}</option>
                    </NativeSelect>
                );

            case 'externalEntity':
                // Always use multi-select for externalEntity (only 'in' filter)
                // Parse filterValue as comma-separated string for multi-select
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
                    <MultiCombobox
                        size="sm"
                        options={allOptions}
                        values={selectedIds}
                        loading={isLoadingExternal}
                        onChange={(vals) => setFilterValue(vals.join(','))}
                        onSearchChange={(term) => debouncedExternalSearch(term)}
                        closeOnSelect
                        placeholder={LanguageProvider.get('filterColumns.type_to_search')}
                        searchPlaceholder={LanguageProvider.get('filterColumns.type_to_search')}
                        emptyText={LanguageProvider.get('filterColumns.start_typing')}
                    />
                );

            case 'option':
                if (fieldConfig.options?.options) {
                    const options = fieldConfig.options.options.map(opt => ({
                        value: opt.value,
                        label: LanguageProvider.getLabel(entity, `${fieldName}.options.${opt.value}`)
                    }));

                    // Parse filterValue as comma-separated string for multi-select
                    const selectedValues = filterValue ? filterValue.split(',').map(v => v.trim()) : [];

                    return (
                        <MultiCombobox
                            size="sm"
                            options={options}
                            values={selectedValues}
                            onChange={(vals) => setFilterValue(vals.join(','))}
                            closeOnSelect
                            placeholder={LanguageProvider.get('filterColumns.select_option')}
                        />
                    );
                }
                return null;

            default:
                return (
                    <Input
                        size="sm"
                        type="text"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') applyFilter();
                        }}
                        placeholder={LanguageProvider.get('filterColumns.filter_placeholder')}
                    />
                );
        }
    };

    // Ordinamento attivo: params.sorting è l'array del multi-sort (il vecchio
    // sortingField/sortingOrder resta specchiato sul primo elemento)
    const sortingList = (params.sorting && params.sorting.length > 0)
        ? params.sorting
        : [{ field: params.sortingField, order: params.sortingOrder }];
    const sortingIndex = sortingList.findIndex(s => s.field === fieldName);
    const isActiveSorting = sortingIndex !== -1;
    const activeSortingOrder = isActiveSorting ? String(sortingList[sortingIndex].order).toLowerCase() : null;

    // shift+click sull'intestazione: aggiunge/inverte/toglie la colonna dal
    // multi-sort (ciclo asc → desc → via)
    const handleHeaderClick = (e) => {
        if (e.shiftKey && isSortable() && toggleMultiSorting) {
            e.preventDefault();
            e.stopPropagation();
            toggleMultiSorting(fieldName);
        }
    };

    // il popover delle external/option ospita una multi-select con label
    // anche lunghe (contratti, ragioni sociali): più largo, così chip e voci
    // stanno su una riga o al massimo due
    const popoverWidth = (fieldConfig.input_type === 'externalEntity' || fieldConfig.input_type === 'option') ? 'w-[380px]' : 'w-[270px]';

    return (
        <div className="column-filter-header select-none" onClick={handleHeaderClick}>
            <span className="me-1">{LanguageProvider.getLabel(entity, fieldName)}</span>

            {/* freccia e imbuto in un unico gruppo a destra: l'header è in
                space-between e senza wrapper la freccia finirebbe al centro */}
            <span className="flex items-center">

            {/* freccetta di ordinamento (+ priorità se multi-sort), attaccata
                all'imbuto; click = inverte solo il verso, non toglie mai la colonna */}
            {isActiveSorting && (
                <span
                    role="button"
                    className="cursor-pointer"
                    style={{ marginRight: '3px' }}
                    title={LanguageProvider.get('filterColumns.sort')}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (invertSorting) invertSorting(fieldName);
                    }}
                >
                    <Icon name={activeSortingOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size="sm" color="#0d6efd" />
                    {sortingList.length > 1 && (
                        <sup className="ms-0.5 font-bold" style={{ color: '#0d6efd' }}>{sortingIndex + 1}</sup>
                    )}
                </span>
            )}

            {(isSortable() || isFilterable()) && (
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <span
                            role="button"
                            className={`column-filter-toggle inline-flex items-center justify-center ${(fieldConstraints.length > 0 || isActiveSorting) ? 'active-filter' : ''}`}
                            style={{ cursor: 'pointer', padding: '4px 5px' }}
                            onPointerDown={(e) => {
                                // shift+click qui compone il multi-sort, non apre il popover
                                if (e.shiftKey) { e.preventDefault(); e.stopPropagation(); }
                            }}
                        >
                            <Icon
                                name="filter"
                                size="sm"
                                color={(fieldConstraints.length > 0 || isActiveSorting) ? "#0d6efd" : "#999999"}
                            />
                        </span>
                    </PopoverTrigger>

                    <PopoverContent align="end" className={`${popoverWidth} p-0 py-3 font-normal normal-case`}>
                        {isSortable() && (
                            <>
                                <div className='px-4 py-1 text-sm text-muted-foreground'>{LanguageProvider.get('filterColumns.sort')}</div>
                                <div role="button" onClick={handleSortAsc} className='flex cursor-pointer items-center px-4 py-1 text-sm hover:bg-accent'>
                                    <Icon name="arrow-down-a-z" className="me-2" />
                                    {LanguageProvider.get('filterColumns.sort_asc')}
                                    {isActiveSorting && activeSortingOrder === 'asc' && (
                                        <Icon name="check" className="ms-2 text-success" />
                                    )}
                                </div>
                                <div role="button" onClick={handleSortDesc} className='flex cursor-pointer items-center px-4 py-1 text-sm hover:bg-accent'>
                                    <Icon name="arrow-up-a-z" className="me-2" />
                                    {LanguageProvider.get('filterColumns.sort_desc')}
                                    {isActiveSorting && activeSortingOrder === 'desc' && (
                                        <Icon name="check" className="ms-2 text-success" />
                                    )}
                                </div>
                                {isActiveSorting && (
                                    <div role="button" onClick={handleSortRemove} className='flex cursor-pointer items-center px-4 py-1 text-sm hover:bg-accent'>
                                        <Icon name="xmark" className="me-2" />
                                        {LanguageProvider.get('filterColumns.sort_remove', 'Rimuovi ordinamento')}
                                    </div>
                                )}
                                {isFilterable() && <div className='my-2 h-px bg-border' />}
                            </>
                        )}

                        {isFilterable() && (
                            <>
                                <div className='px-4 py-1 text-sm text-muted-foreground'>{LanguageProvider.get('filterColumns.filter')}</div>

                                {fieldConstraints.length > 0 && (
                                    <div className="mb-2 px-4">
                                        <AppliedFilters entity={entity} constraints={fieldConstraints} onRemove={removeFieldConstraint} />
                                    </div>
                                )}

                                <div className="mb-2 px-4">
                                    <NativeSelect
                                        size="sm"
                                        className="mb-2"
                                        value={filterType}
                                        onChange={(e) => {
                                            setFilterType(e.target.value);
                                            // Reset values when changing filter type
                                            setFilterValue('');
                                            setFilterValueMin('');
                                            setFilterValueMax('');
                                        }}
                                    >
                                        {getFilterTypes().map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </NativeSelect>

                                    <div className="mb-2">
                                        {renderFilterInput()}
                                    </div>

                                    <div className="grid gap-2">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={applyFilter}
                                            disabled={
                                                filterType === 'range'
                                                    ? (!filterValueMin || !filterValueMax)
                                                    : (filterType === 'isnull'
                                                        ? false
                                                        : (!filterValue || filterValue === ''))
                                            }
                                        >
                                            {LanguageProvider.get('filterColumns.apply_filter')}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </PopoverContent>
                </Popover>
            )}

            </span>
        </div>
    );
}
