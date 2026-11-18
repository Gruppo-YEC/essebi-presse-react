import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Alert } from '../../ui/alert';
import { Spinner } from '../../ui/spinner';
import { Card, CardBody } from '../../ui/card';
import { InputGroup } from '../../ui/input-group';
import { PickerBox } from '../../ui/picker-box';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';
import { LanguageProvider } from '../../../core/language-provider';
import './style.css';
import { ApiManager } from '../../../core/api-manager';
import Icon from '../../BodyElements/Icon';

export default function AddressInput({ entity, update, value, fieldKey, view }) {
    const [formattedAddress, setFormattedAddress] = useState('');
    const [addressComponents, setAddressComponents] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [errors, setErrors] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [searchQuery, setSearchQuery] = useState(value || '');
    const [lat, setLat] = useState(45.0);
    const [lng, setLng] = useState(10.5);

    // Autocomplete state
    const [sessionToken, setSessionToken] = useState(() => (crypto?.randomUUID?.() ?? String(Date.now())));
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const debounceRef = useRef(null);
    const inputWrapperRef = useRef(null);

    function resetAutocomplete() {
        setSuggestions([]);
        setShowSuggestions(false);
        setHighlightIndex(-1);
        setIsLoadingSuggestions(false);
        setSessionToken(crypto?.randomUUID?.() ?? String(Date.now()));
    }

    function closeModal() {
        setShowModal(false);
        setErrors('');
        setAddressComponents(null);
        setFormattedAddress('');
        setIsLoading(false);
        resetAutocomplete();
    }

    function openModal() {
        setShowModal(true);
        resetAutocomplete();
    }

    function save() {
        const inputAddress = document.querySelector('#' + entity + '_address_input_value')?.value || '';
        update(fieldKey, inputAddress);

        const options = view?.properties?.columns?.[fieldKey]?.options || {};
        if (options.autocompile && addressComponents) {
            if (options.autocompile.country) update(options.autocompile.country, addressComponents.country);
            if (options.autocompile.countryCode) update(options.autocompile.countryCode, addressComponents.countryCode);
            if (options.autocompile.region) update(options.autocompile.region, addressComponents.region);
            if (options.autocompile.province) update(options.autocompile.province, addressComponents.province);
            if (options.autocompile.latitude) update(options.autocompile.latitude, lat);
            if (options.autocompile.locality) update(options.autocompile.locality, addressComponents.locality);
            if (options.autocompile.longitude) update(options.autocompile.longitude, lng);
            if (options.autocompile.postalCode) update(options.autocompile.postalCode, addressComponents.postalCode);
            if (options.autocompile.route) update(options.autocompile.route, addressComponents.route);
            if (options.autocompile.streetNumber) update(options.autocompile.streetNumber, addressComponents.streetNumber);
        }

        closeModal();
    }

    // ---- SEARCH (resolve to full address) ----
    const searchAddress = useCallback(async (forceQuery) => {
        const query = (forceQuery ?? document.querySelector('#' + entity + '_address_input_value')?.value ?? searchQuery).trim();
        if (!query) {
            setErrors(LanguageProvider.get('defaults.insert_address') || 'Inserisci un indirizzo');
            return;
        }

        setIsLoading(true);
        setErrors('');
        try {
            const response = await ApiManager.sendAuthenticatedRequest('/external_api/get_google_maps_address', {
                address: query
            });
            const payload = response;
            if (!payload || payload.success !== 1 || !payload.data) {
                const message = payload?.message || 'Errore nella geocodifica.';
                throw new Error(message);
            }

            const d = payload.data;
            setFormattedAddress(d.formattedAddress || query);
            const parsedLat = typeof d.latitude === 'number' ? d.latitude : parseFloat(d.latitude);
            const parsedLng = typeof d.longitude === 'number' ? d.longitude : parseFloat(d.longitude);
            setLat(parsedLat);
            setLng(parsedLng);

            setAddressComponents({
                route: d.route || '',
                locality: d.locality || '',
                province: d.province || '',
                region: d.region || '',
                country: d.country || '',
                countryCode: d.countryCode || '',
                postalCode: d.postalCode || '',
                streetNumber: d.streetNumber || '',
                latitude: d.latitude,
                longitude: d.longitude,
                placeId: d.placeId || null
            });

            setSearchQuery(d.formattedAddress || query);
        } catch (err) {
            setAddressComponents(null);
            setFormattedAddress('');
            setErrors(err?.message || 'Si è verificato un errore.');
        } finally {
            setIsLoading(false);
        }
    }, [entity, searchQuery]);

    // ---- AUTOCOMPLETE (suggestions) ----
    const fetchSuggestions = useCallback(async (text) => {
        const q = text.trim();
        if (q.length < 5) {
            setSuggestions([]);
            setShowSuggestions(false);
            setIsLoadingSuggestions(false);
            return;
        }
        try {
            setIsLoadingSuggestions(true);
            const response = await ApiManager.sendAuthenticatedRequest('/external_api/get_google_maps_suggestions', {
                input: q,
                sessionToken // facoltativo: migliora billing/qualità lato Google
            });
            const payload = response?.data ?? response;
            const preds = payload?.data?.predictions ?? payload?.predictions ?? [];
            setSuggestions(Array.isArray(preds) ? preds.slice(0, 8) : []);
            setShowSuggestions(true);
            setHighlightIndex(preds.length ? 0 : -1);
        } catch (e) {
            // Silenziosa: niente suggerimenti in caso d'errore
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, [sessionToken]);

    // debounce per input
    useEffect(() => {
        if (!showModal) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(searchQuery);
        }, 250);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery, fetchSuggestions, showModal]);

    // click fuori per chiudere la tendina
    useEffect(() => {
        function handleClickOutside(e) {
            if (inputWrapperRef.current && !inputWrapperRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
        if (showSuggestions) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSuggestions]);

    const selectSuggestion = useCallback((sugg) => {
        const desc = sugg?.description || '';
        if (!desc) return;
        setSearchQuery(desc);
        setShowSuggestions(false);
        // risolvi subito l'indirizzo completo
        searchAddress(desc);
    }, [searchAddress]);

    const onKeyDown = (e) => {
        if (!showSuggestions || !suggestions.length) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchAddress();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((i) => (i + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
                selectSuggestion(suggestions[highlightIndex]);
            } else {
                searchAddress();
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    return (
        <>
            <PickerBox
                icon="location-dot"
                onAction={openModal}
                onClick={openModal}
            >
                {typeof value !== 'undefined' && value ? (
                    <span className='truncate' title={value}>{value}</span>
                ) : null}
            </PickerBox>

            <Dialog open={showModal} onOpenChange={(open) => { if (!open) closeModal() }}>
                <DialogContent size="xl" onPointerDownOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle>{LanguageProvider.get('defaults.address')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody style={{ minHeight: 500 }}>
                        <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2'>
                            <div>
                                {value ? <p className='text-muted-foreground'>{value}</p> : null}

                                {errors?.length > 0 && (
                                    <Alert variant='danger' className='mb-4'>
                                        {errors}
                                    </Alert>
                                )}

                                <div ref={inputWrapperRef} style={{ position: 'relative' }}>
                                    <InputGroup className="mb-2">
                                        <Input
                                            id={entity + '_address_input_value'}
                                            type="text"
                                            placeholder={LanguageProvider.get('defaults.insert_address')}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={onKeyDown}
                                            aria-autocomplete="list"
                                            aria-expanded={showSuggestions}
                                            aria-controls={entity + '_address_suggestions_list'}
                                            autoComplete="off"
                                        />
                                        <Button variant="primary" onClick={() => searchAddress()} disabled={isLoading}>
                                            {isLoading ? <Spinner size="sm" /> : (LanguageProvider.get('defaults.search') || 'Cerca')}
                                        </Button>
                                    </InputGroup>

                                    {isLoadingSuggestions && (
                                        <div style={{ position: 'absolute', right: 10, top: 10 }}>
                                            <Spinner size="sm" />
                                        </div>
                                    )}

                                    {showSuggestions && suggestions.length > 0 && (
                                        <Card
                                            style={{
                                                position: 'absolute',
                                                zIndex: 1050,
                                                width: '100%',
                                                top: '100%',
                                                left: 0,
                                                marginTop: 2
                                            }}
                                        >
                                            <div id={entity + '_address_suggestions_list'} role="listbox" className='text-sm'>
                                                {suggestions.map((s, idx) => {
                                                    const main = s?.structured_formatting?.main_text ?? s?.description ?? '';
                                                    const secondary = s?.structured_formatting?.secondary_text ?? '';
                                                    const active = idx === highlightIndex;
                                                    return (
                                                        <div
                                                            key={s.place_id ?? s.description ?? idx}
                                                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                                                            role="option"
                                                            aria-selected={active}
                                                            className={'cursor-pointer border-b border-border px-3 py-2 last:border-b-0 hover:bg-accent' + (active ? ' bg-light' : '')}
                                                        >
                                                            <div style={{ fontWeight: 600 }}>{main}</div>
                                                            {secondary ? <div className="text-sm text-muted-foreground">{secondary}</div> : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </Card>
                                    )}
                                </div>

                                {formattedAddress && (
                                    <small className="text-muted-foreground">
                                        {LanguageProvider.get('defaults.selected_address') || 'Indirizzo rilevato'}: {formattedAddress}
                                    </small>
                                )}
                            </div>

                            <div>
                                {addressComponents && typeof lat === 'number' && typeof lng === 'number' && (
                                    <Card>
                                        <CardBody>
                                            <div className="map-container" style={{ height: 300 }}>
                                                <iframe
                                                    title="map"
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 0 }}
                                                    loading="lazy"
                                                    allowFullScreen
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                    src={`https://www.google.com/maps?q=${encodeURIComponent(lat + ',' + lng)}&z=17&output=embed`}
                                                />
                                            </div>
                                            <div className="mt-4">
                                                <div><strong>Route:</strong> {addressComponents.route} {addressComponents.streetNumber}</div>
                                                <div><strong>Località:</strong> {addressComponents.locality}</div>
                                                <div><strong>Provincia:</strong> {addressComponents.province}</div>
                                                <div><strong>Regione:</strong> {addressComponents.region}</div>
                                                <div><strong>CAP:</strong> {addressComponents.postalCode}</div>
                                                <div><strong>Nazione:</strong> {addressComponents.country} ({addressComponents.countryCode})</div>
                                            </div>
                                        </CardBody>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="primary" onClick={save} disabled={isLoading}>
                            {LanguageProvider.get('defaults.save')}
                        </Button>
                        <Button variant="secondary" onClick={closeModal} disabled={isLoading}>
                            {LanguageProvider.get('defaults.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
