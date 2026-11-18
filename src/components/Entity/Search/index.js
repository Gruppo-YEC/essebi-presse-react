import React, { useState, useEffect } from 'react';
import { Input } from '../../ui/input';
import { InputGroup } from '../../ui/input-group';
import { LanguageProvider } from '../../../core/language-provider';
import { ViewManager } from '../../../core/view-manager';
import { Utils } from '../../../core/utils';


export default function SearchStandard({ entity, setSearchObj }) {

    const [search, setSearch] = useState('')
    const searchableFields = Utils.cloneObject(ViewManager.getSearchableColumns(entity))

    async function searchData() {
        let obj = {
            'query': search,
            'fields': searchableFields,
            'constraints': []
        }
        setSearchObj(obj)
    }


    useEffect(() => {

        const timeOutId = setTimeout(() => searchData(), 800);
        return () => clearTimeout(timeOutId);

    }, [search]);


    return (
        <>
            <div className="flex justify-end">
                <InputGroup>
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} type="text" placeholder={LanguageProvider.get('defaults.search')} />
                </InputGroup>
            </div>
        </>
    );
};
