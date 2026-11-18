import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { InputGroup } from '../../ui/input-group';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../ui/dropdown-menu';
import { countryPhonePrefixes } from './prefix';
import Icon from '../../BodyElements/Icon';
import './style.css';
import './flags.css';


export default function PhoneInput({ entity, update, value, fieldKey }) {

    const [country, setCountry] = useState('IT');
    const [prefix, setPrefix] = useState('39');
    const [displayValue, setDisplayValue] = useState('');


    useEffect(() => {
        if(value && value.length) {
            var detectedPrefix = detectCountryCode(value);
            if(detectedPrefix && value.startsWith(detectedPrefix)) {
                setDisplayValue(value.slice(detectedPrefix.length));
            } else {
                setDisplayValue(value);
            }
        } else {
            setDisplayValue('');
        }
    }, []);


    function changeCountry(item) {
        setCountry(item.iso)
        setPrefix(item.code)
        if(displayValue.length > 0) {
            update(fieldKey, item.code + displayValue)
        } else {
            update(fieldKey, null)
        }
    }

    function handleChange(newValue) {
        var numericValue = newValue.replace(/[^0-9]/g, '');
        setDisplayValue(numericValue)
        if(numericValue.length > 0) {
            update(fieldKey, prefix + numericValue)
        } else {
            update(fieldKey, null)
        }
    }


    function detectCountryCode(num) {
        var matchedPrefix = '';
        for(var i = 1; i <= num.length; i++) {
            var candidate = num.slice(0, i);
            for(var j = 0; j < countryPhonePrefixes.length; j++) {
                if(countryPhonePrefixes[j].code === candidate) {
                    matchedPrefix = candidate;
                    setCountry(countryPhonePrefixes[j].iso);
                    setPrefix(countryPhonePrefixes[j].code);
                }
            }
        }
        return matchedPrefix;
    }


    return (
        <>
            <InputGroup className="mb-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline-secondary" size='sm'>
                            <span style={{width: 16, display: 'inline-block'}} className={'me-1 flag flag-' + country.toLowerCase()}></span>
                            <Icon name="chevron-down" style={{ fontSize: 10 }} />
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent id="select-phone-input">
                        {countryPhonePrefixes.map((item, i) => {
                            var countryCode = item.iso.toLowerCase()
                            return (
                                <DropdownMenuItem className='text-sm' key={i} onClick={() => changeCountry(item)}>
                                    <span style={{width: 16, display: 'inline-block'}} className={'me-1 flag flag-' + countryCode}></span> {item.country}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Input
                    type="text"
                    value={displayValue}
                    onChange={(event) => handleChange(event.target.value)}
                />
            </InputGroup>
        </>
    );
};
