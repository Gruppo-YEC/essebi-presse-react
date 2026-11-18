import React, { useEffect, useState, useRef } from 'react';
import { Input } from '../../ui/input';
import { InputGroup, InputGroupText } from '../../ui/input-group';
import { settings } from '../../../config/settings';

export default function CurrencyInput({ entity, update, value, fieldKey, view }) {
    const [displayValue, setDisplayValue] = useState('');
    const inputRef = useRef(null);
    const cursorRef = useRef(null);

    const localeCurrency = settings.locale && settings.locale.currency ? settings.locale.currency : 'EUR';
    const localeCountry = settings.locale && settings.locale.country ? settings.locale.country : 'it-IT';

    // Formatta un numero float in stringa con separatori italiani (punto migliaia, virgola decimali)
    const formatNumber = (num) => {
        if (num === null || num === undefined || num === '' || isNaN(num)) {
            return '';
        }

        const floatNum = parseFloat(num);
        if (isNaN(floatNum)) return '';

        // Gestisci numeri negativi
        const neg = floatNum < 0;
        const absNum = Math.abs(floatNum);

        // Separa parte intera e decimale
        const parts = absNum.toString().split('.');
        const integerPart = parts[0];
        const decimalPart = parts[1] || '';

        // Formatta la parte intera con punti per le migliaia
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        const prefix = neg ? '-' : '';

        // Ricostruisci con virgola per i decimali
        if (decimalPart) {
            return `${prefix}${formattedInteger},${decimalPart}`;
        }
        return `${prefix}${formattedInteger}`;
    };

    // Converte stringa formattata in float
    const parseFormattedNumber = (str) => {
        if (!str || str === '' || str === '-') return '';

        // Rimuovi i punti delle migliaia e sostituisci virgola con punto
        const cleaned = str
            .replace(/\./g, '')  // Rimuovi punti (separatori migliaia)
            .replace(',', '.');   // Virgola diventa punto decimale

        const num = parseFloat(cleaned);
        return isNaN(num) ? '' : num;
    };

    // Inizializza il display value dal valore prop
    useEffect(() => {
        if (value !== null && value !== undefined && value !== '') {
            setDisplayValue(formatNumber(value));
        } else {
            setDisplayValue('');
        }
    }, [value]);

    // Gestisce la posizione del cursore dopo la formattazione
    useEffect(() => {
        if (cursorRef.current !== null && inputRef.current) {
            inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
            cursorRef.current = null;
        }
    }, [displayValue]);

    const handleChange = (event) => {
        const input = event.target.value;
        const cursorPosition = event.target.selectionStart;

        // Permetti solo numeri, virgola e segno negativo
        // La virgola è usata come separatore decimale
        // Il punto viene ignorato in input (lo aggiungiamo noi per le migliaia)
        let cleaned = input.replace(/[^\d,\-]/g, '');

        // Il segno negativo è ammesso solo all'inizio
        const isNegative = cleaned.startsWith('-');
        cleaned = cleaned.replace(/-/g, '');
        if (isNegative) cleaned = '-' + cleaned;

        // Assicurati che ci sia al massimo una virgola
        const commaCount = (cleaned.match(/,/g) || []).length;
        if (commaCount > 1) {
            const firstCommaIndex = cleaned.indexOf(',');
            cleaned = cleaned.substring(0, firstCommaIndex + 1) +
                     cleaned.substring(firstCommaIndex + 1).replace(/,/g, '');
        }

        // Limita i decimali a 2 cifre
        const commaParts = cleaned.split(',');
        if (commaParts[1] && commaParts[1].length > 2) {
            commaParts[1] = commaParts[1].substring(0, 2);
            cleaned = commaParts.join(',');
        }

        // Converti in numero per salvare
        const numericValue = parseFormattedNumber(cleaned);

        // Formatta per display (solo se c'è una parte intera)
        let formatted = '';
        if (cleaned !== '' && cleaned !== '-') {
            const neg = cleaned.startsWith('-');
            const abs = neg ? cleaned.substring(1) : cleaned;
            const parts = abs.split(',');
            const integerPart = parts[0].replace(/^0+(?=\d)/, ''); // Rimuovi zeri iniziali
            const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            const prefix = neg ? '-' : '';

            if (parts.length > 1) {
                formatted = `${prefix}${formattedInteger || '0'},${parts[1]}`;
            } else {
                formatted = formattedInteger ? `${prefix}${formattedInteger}` : (abs === '0' ? `${prefix}0` : '');
            }
        } else if (cleaned === '-') {
            formatted = '-';
        }

        // Calcola la nuova posizione del cursore
        const oldDotsBeforeCursor = (displayValue.substring(0, cursorPosition).match(/\./g) || []).length;
        const newDotsBeforeCursor = (formatted.substring(0, cursorPosition).match(/\./g) || []).length;
        const dotsDiff = newDotsBeforeCursor - oldDotsBeforeCursor;

        cursorRef.current = cursorPosition + dotsDiff;

        setDisplayValue(formatted);
        update(fieldKey, numericValue);
    };


    const validation = view.properties.columns[fieldKey].validation || {};
    const options = view.properties.columns[fieldKey].options || {};

    return (
        <InputGroup className="mb-4">
            <InputGroupText>
                <span className='text-sm'>{localeCurrency}</span>
            </InputGroupText>
            <Input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                placeholder="0,00"
                required={validation.required === true}
                disabled={options.disabled === true}
            />
        </InputGroup>
    );
}
