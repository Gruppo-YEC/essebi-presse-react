import React, { useState, useRef } from 'react';
import { Card, CardBody } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { InputGroup, InputGroupText } from '../../../components/ui/input-group';
import { Link } from 'react-router-dom';
import { ViewManager } from '../../../core/view-manager';
import { LanguageProvider } from '../../../core/language-provider';
import Icon from '../../../components/BodyElements/Icon';
import './style.css';


/* tipo di collegamento -> variante del badge */
const LINK_TYPES = {
    externalEntity: { label: 'external', variant: 'primary' },
    multipleExternalEntity: { label: 'multiple', variant: 'info' },
    deepExternalEntity: { label: 'deep', variant: 'warning' }
};


/**
 * Schema dei collegamenti tra entità, costruito client-side dalle properties
 * che il backend deriva da tables.json e manda al login: ogni colonna
 * externalEntity/multipleExternalEntity/deepExternalEntity è un arco verso
 * l'entità in options.entity. Si vedono le entità esposte al proprio utente.
 */
export default function Schema() {

    const [search, setSearch] = useState('');
    const [highlighted, setHighlighted] = useState(null);
    const highlightTimer = useRef(null);

    const properties = ViewManager.getProperties();
    const entities = Object.keys(properties || {}).sort();

    /* archi in uscita per entità + indice inverso (chi mi referenzia) */
    const outgoing = {};
    const incoming = {};
    entities.forEach((entity) => {
        outgoing[entity] = [];
        const columns = properties[entity].columns || {};
        Object.keys(columns).forEach((field) => {
            const col = columns[field];
            if (LINK_TYPES[col.input_type] && col.options && col.options.entity) {
                const link = { field: field, type: col.input_type, target: col.options.entity };
                outgoing[entity].push(link);
                if (!incoming[link.target]) incoming[link.target] = [];
                incoming[link.target].push({ from: entity, field: field, type: col.input_type });
            }
        });
    });

    function entityLabel(entity) {
        return LanguageProvider.get('entity.' + entity, entity);
    }

    /* click su un'entità collegata: scrolla alla sua card e la evidenzia */
    function goTo(entity) {
        const el = document.getElementById('schema-card-' + entity);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlighted(entity);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setHighlighted(null), 1600);
    }

    const normalized = search.trim().toLowerCase();
    const visibleEntities = entities.filter((entity) => {
        if (normalized === '') return true;
        return entity.toLowerCase().includes(normalized)
            || String(entityLabel(entity)).toLowerCase().includes(normalized);
    });

    const totalLinks = entities.reduce((n, e) => n + outgoing[e].length, 0);

    function linkBadge(type) {
        return <Badge variant={LINK_TYPES[type].variant} className='schema-type-badge'>{LINK_TYPES[type].label}</Badge>;
    }

    function entityButton(entity) {
        /* target fuori dalle properties (non esposto all'utente): solo testo */
        if (!properties[entity]) {
            return <span className='font-medium'>{entity}</span>;
        }
        return (
            <span role='button' className='schema-entity-link font-medium' onClick={() => goTo(entity)}>
                {entityLabel(entity)}
            </span>
        );
    }

    return (
        <div className='schema-page mb-4 mt-4 w-full px-3'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <h3 className='mb-0'>{LanguageProvider.get('header.schema', 'Schema entità')}</h3>
                <div className='flex items-center gap-3'>
                    <span className='text-sm text-muted-foreground'>
                        {entities.length} {LanguageProvider.get('entity_page.entities', 'entità')} · {totalLinks} {LanguageProvider.get('schema.links', 'collegamenti')}
                    </span>
                    <InputGroup style={{ width: 220 }}>
                        <Input
                            size='sm'
                            type='search'
                            placeholder={LanguageProvider.get('defaults.search')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <InputGroupText className='px-2 py-1'>
                            <Icon name='magnifying-glass' />
                        </InputGroupText>
                    </InputGroup>
                </div>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
                {visibleEntities.map((entity) => {
                    const out = outgoing[entity];
                    const inc = incoming[entity] || [];
                    return (
                        <Card
                            key={entity}
                            id={'schema-card-' + entity}
                            className={highlighted === entity ? 'schema-card-highlight' : ''}
                        >
                            <CardBody className='p-4'>
                                <div className='mb-1 flex items-center justify-between gap-2'>
                                    <div className='min-w-0'>
                                        <div className='truncate font-semibold'>{entityLabel(entity)}</div>
                                        <div className='truncate text-xs text-muted-foreground'>
                                            {entity} · {Object.keys(properties[entity].columns || {}).length} {LanguageProvider.get('defaults.columns', 'Colonne').toLowerCase()}
                                        </div>
                                    </div>
                                    <Link to={'/entity/' + entity} title={LanguageProvider.get('defaults.open')} className='text-muted-foreground hover:text-foreground'>
                                        <Icon name='up-right-from-square' size='sm' />
                                    </Link>
                                </div>

                                {out.length === 0 && inc.length === 0 ? (
                                    <div className='mt-3 text-sm text-muted-foreground'>
                                        {LanguageProvider.get('schema.no_links', 'Nessun collegamento')}
                                    </div>
                                ) : (
                                    <>
                                        {out.length > 0 && (
                                            <div className='mt-3'>
                                                <div className='schema-section-title'>{LanguageProvider.get('schema.outgoing', 'Collegamenti')}</div>
                                                {out.map((link, i) => (
                                                    <div key={i} className='schema-link-row'>
                                                        <Icon name='arrow-right' size='sm' className='schema-arrow' />
                                                        <code className='schema-field'>{link.field}</code>
                                                        {linkBadge(link.type)}
                                                        {entityButton(link.target)}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {inc.length > 0 && (
                                            <div className='mt-3'>
                                                <div className='schema-section-title'>{LanguageProvider.get('schema.incoming', 'Referenziata da')}</div>
                                                {inc.map((link, i) => (
                                                    <div key={i} className='schema-link-row'>
                                                        <Icon name='arrow-left' size='sm' className='schema-arrow' />
                                                        {entityButton(link.from)}
                                                        <code className='schema-field'>{link.field}</code>
                                                        {linkBadge(link.type)}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardBody>
                        </Card>
                    );
                })}
            </div>

            {visibleEntities.length === 0 && (
                <div className='p-12 text-center text-muted-foreground'>
                    {LanguageProvider.get('defaults.no_results')}
                </div>
            )}
        </div>
    );
};
