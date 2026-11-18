import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Table } from '../../../components/ui/table';
import { Input } from '../../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../../components/ui/select-dropdown';
import { Spinner } from '../../../components/ui/spinner';
import { Checkbox } from '../../../components/ui/checkbox';
import { Card, CardBody, CardFooter } from '../../../components/ui/card';
import { SimpleTooltip } from '../../../components/ui/tooltip';
import { InputGroup, InputGroupText } from '../../../components/ui/input-group';
import { Pagination, PaginationItem, PaginationFirst, PaginationPrev, PaginationNext, PaginationLast } from '../../../components/ui/pagination';
import { DataManager } from '../../../core/data-manager';
import { ResourceManager } from '../../../core/resource-manager';
import { entity_language } from '../../../config/entity_language';
import JSZip from 'jszip';
import ResourceDetail from './components/ResourceDetail';
import Icon from '../../../components/BodyElements/Icon';

const SORTABLE = 'cursor-pointer select-none hover:bg-accent';

function getEntityLabel(entityName) {
    if (!entityName) return '-';
    return entity_language.entity[entityName] || entityName;
}

function getAllKnownEntities(availableFromDb) {
    const allEntities = new Set(availableFromDb);
    Object.keys(entity_language.entity).forEach(e => allEntities.add(e));
    return [...allEntities].sort();
}

function base64ToBlob(raw) {
    var byteString, mime;
    if (raw.indexOf(',') !== -1) {
        var parts = raw.split(',');
        var mimeMatch = parts[0].match(/:(.*?);/);
        mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        byteString = atob(parts[1]);
    } else {
        mime = 'application/octet-stream';
        byteString = atob(raw);
    }
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
}

async function downloadResourceAsBlob(resource) {
    const response = await ResourceManager.getFile(resource.hash, resource.entity);
    if (response.success === 1 && response.base64) {
        return base64ToBlob(response.base64);
    }
    return null;
}

async function triggerDownload(resource) {
    const blob = await downloadResourceAsBlob(resource);
    if (!blob) return;
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = resource.filename || (resource.hash + '.' + resource.extension);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
}

const ITEMS_PER_PAGE = 25;

const EXTENSION_ICONS = {
    'pdf': { icon: 'file-pdf', color: '#dc3545' },
    'doc': { icon: 'file-word', color: '#2b579a' },
    'docx': { icon: 'file-word', color: '#2b579a' },
    'xls': { icon: 'file-excel', color: '#217346' },
    'xlsx': { icon: 'file-excel', color: '#217346' },
    'csv': { icon: 'file-csv', color: '#217346' },
    'ppt': { icon: 'file-powerpoint', color: '#d24726' },
    'pptx': { icon: 'file-powerpoint', color: '#d24726' },
    'zip': { icon: 'file-zipper', color: '#f0ad4e' },
    'rar': { icon: 'file-zipper', color: '#f0ad4e' },
    '7z': { icon: 'file-zipper', color: '#f0ad4e' },
    'txt': { icon: 'file-lines', color: '#6c757d' },
    'json': { icon: 'file-code', color: '#6c757d' },
    'xml': { icon: 'file-code', color: '#6c757d' },
    'html': { icon: 'file-code', color: '#e44d26' },
    'css': { icon: 'file-code', color: '#264de4' },
    'js': { icon: 'file-code', color: '#f7df1e' },
    'mp4': { icon: 'file-video', color: '#6f42c1' },
    'avi': { icon: 'file-video', color: '#6f42c1' },
    'mov': { icon: 'file-video', color: '#6f42c1' },
    'mp3': { icon: 'file-audio', color: '#fd7e14' },
    'wav': { icon: 'file-audio', color: '#fd7e14' },
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

function getFileIcon(extension) {
    const ext = (extension || '').toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) {
        return { icon: 'file-image', color: '#0d6efd' };
    }
    return EXTENSION_ICONS[ext] || { icon: 'file', color: '#6c757d' };
}

function isImage(extension) {
    return IMAGE_EXTENSIONS.includes((extension || '').toLowerCase());
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function formatFileSize(extension) {
    const ext = (extension || '').toUpperCase();
    return ext || '-';
}

export default function Resources() {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [extensionFilter, setExtensionFilter] = useState('');
    const [availableEntities, setAvailableEntities] = useState([]);
    const [availableExtensions, setAvailableExtensions] = useState([]);
    const [sorting, setSorting] = useState({ field: 'id', order: 'DESC' });
    const [selectedResource, setSelectedResource] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [downloading, setDownloading] = useState(false);
    const allEntities = getAllKnownEntities(availableEntities);

    const loadResources = useCallback(async () => {
        setLoading(true);
        try {
            const constraints = [];
            if (entityFilter) {
                constraints.push({ fieldName: 'entity', type: 'value', value: entityFilter });
            }
            if (extensionFilter) {
                constraints.push({ fieldName: 'extension', type: 'value', value: extensionFilter });
            }

            let response;
            if (searchQuery || constraints.length > 0) {
                response = await DataManager.searchItems(
                    'resource', page, ITEMS_PER_PAGE, sorting,
                    searchQuery, ['filename', 'entity', 'hash'], constraints
                );
            } else {
                response = await DataManager.getItems('resource', page, ITEMS_PER_PAGE, sorting);
            }

            if (response.success === 1) {
                setResources(response.body || []);
                const total = response.total || response.body?.length || 0;
                setTotalItems(total);
                setTotalPages(Math.ceil(total / ITEMS_PER_PAGE) || 1);
            }
        } catch (error) {
            console.error('Error loading resources:', error);
        } finally {
            setLoading(false);
        }
    }, [page, sorting, searchQuery, entityFilter, extensionFilter]);

    const loadFilters = useCallback(async () => {
        try {
            const allRes = await DataManager.getItems('resource', 1, 9999, { field: 'entity', order: 'ASC' });
            if (allRes.success === 1 && allRes.body) {
                const entities = [...new Set(allRes.body.map(r => r.entity).filter(Boolean))].sort();
                const extensions = [...new Set(allRes.body.map(r => r.extension).filter(Boolean))].sort();
                setAvailableEntities(entities);
                setAvailableExtensions(extensions);
            }
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    }, []);

    useEffect(() => {
        loadResources();
    }, [loadResources]);

    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setPage(1);
    };

    const handleSort = (field) => {
        setSorting(prev => ({
            field,
            order: prev.field === field && prev.order === 'ASC' ? 'DESC' : 'ASC'
        }));
        setPage(1);
    };

    const handleRowClick = (resource) => {
        setSelectedResource(resource);
        setShowDetail(true);
    };

    const handleCloseDetail = () => {
        setShowDetail(false);
        setSelectedResource(null);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setEntityFilter('');
        setExtensionFilter('');
        setPage(1);
    };

    const handleSelectToggle = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === resources.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(resources.map(r => r.id)));
        }
    };

    const handleDownloadSelected = async () => {
        const selected = resources.filter(r => selectedIds.has(r.id));
        if (selected.length === 0) return;

        if (selected.length === 1) {
            await triggerDownload(selected[0]);
            return;
        }

        setDownloading(true);
        try {
            const zip = new JSZip();
            const filenameCount = {};
            for (const res of selected) {
                const blob = await downloadResourceAsBlob(res);
                if (!blob) continue;
                let name = res.filename || (res.hash + '.' + res.extension);
                if (filenameCount[name]) {
                    filenameCount[name]++;
                    const parts = name.split('.');
                    const ext = parts.length > 1 ? '.' + parts.pop() : '';
                    name = parts.join('.') + '_' + filenameCount[name] + ext;
                } else {
                    filenameCount[name] = 1;
                }
                zip.file(name, blob);
            }
            const content = await zip.generateAsync({ type: 'blob' });
            const blobUrl = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'risorse_' + new Date().toISOString().slice(0, 10) + '.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Error creating ZIP:', error);
        } finally {
            setDownloading(false);
        }
    };

    const getFileUrl = (resource) => {
        return ResourceManager.getFileUrl(
            { hash: resource.hash, extension: resource.extension },
            resource.entity
        );
    };

    const renderSortIcon = (field) => {
        if (sorting.field !== field) return <Icon name="sort" className="ms-1 text-muted-foreground" size="xs" />;
        return <Icon name={sorting.order === 'ASC' ? 'sort-up' : 'sort-down'} className="ms-1" size="xs" />;
    };

    const renderThumbnail = (resource) => {
        if (isImage(resource.extension)) {
            return (
                <img
                    src={getFileUrl(resource)}
                    alt={resource.filename}
                    className="h-9 w-9 rounded border border-border object-cover"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
            );
        }
        const { icon, color } = getFileIcon(resource.extension);
        return <Icon name={icon} style={{ color }} size="lg" />;
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;
        const items = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        items.push(
            <PaginationFirst key="first" onClick={() => setPage(1)} disabled={page === 1} />,
            <PaginationPrev key="prev" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
        );
        if (start > 1) items.push(<PaginationItem key="start-ellipsis" disabled>…</PaginationItem>);
        for (let i = start; i <= end; i++) {
            items.push(
                <PaginationItem key={i} active={i === page} onClick={() => setPage(i)}>{i}</PaginationItem>
            );
        }
        if (end < totalPages) items.push(<PaginationItem key="end-ellipsis" disabled>…</PaginationItem>);
        items.push(
            <PaginationNext key="next" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />,
            <PaginationLast key="last" onClick={() => setPage(totalPages)} disabled={page === totalPages} />
        );
        return <Pagination className="mb-0 text-sm">{items}</Pagination>;
    };

    const hasFilters = searchQuery || entityFilter || extensionFilter;

    return (
        <div className="mb-4 mt-4 w-full px-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-3">
                    <h3 className="mb-0">Risorse di sistema</h3>
                    <span className="text-sm text-muted-foreground">{totalItems} file</span>
                </div>
                <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
                    <InputGroup className="w-60">
                        <InputGroupText className="px-2 py-1">
                            <Icon name="magnifying-glass" />
                        </InputGroupText>
                        <Input
                            size="sm"
                            type="search"
                            placeholder="Cerca per nome file..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </InputGroup>
                    {/* Radix non ammette item con value '': sentinella __all__ */}
                    <Select
                        value={entityFilter === '' ? '__all__' : entityFilter}
                        onValueChange={(v) => { setEntityFilter(v === '__all__' ? '' : v); setPage(1); }}
                    >
                        <SelectTrigger size="sm" className="w-48">
                            <SelectValue placeholder="Tutte le entità" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tutte le entit&agrave;</SelectItem>
                            {allEntities.map(e => (
                                <SelectItem key={e} value={e}>{getEntityLabel(e)} ({e})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={extensionFilter === '' ? '__all__' : extensionFilter}
                        onValueChange={(v) => { setExtensionFilter(v === '__all__' ? '' : v); setPage(1); }}
                    >
                        <SelectTrigger size="sm" className="w-40">
                            <SelectValue placeholder="Tutte le estensioni" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Tutte le estensioni</SelectItem>
                            {availableExtensions.map(ext => (
                                <SelectItem key={ext} value={ext}>.{ext}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                            <Icon name="xmark" />Reset
                        </Button>
                    )}
                </form>
            </div>

            {selectedIds.size > 0 && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-sm">
                    <span>
                        <Icon name="square-check" className="me-2 text-primary" />
                        <strong>{selectedIds.size}</strong> file selezionati
                    </span>
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDownloadSelected}
                                disabled={downloading}
                            >
                                {downloading ? (
                                    <>
                                        <Spinner size="sm" className="me-1" />
                                        Creazione ZIP...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="download" className="me-1" />
                                        {selectedIds.size === 1 ? 'Scarica file' : 'Scarica ZIP'}
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                <Icon name="xmark" className="me-1" />
                                Deseleziona
                            </Button>
                        </div>
                </div>
            )}

            <Card>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                            <Spinner size="sm" />Caricamento...
                        </div>
                    ) : resources.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Icon name="folder-open" />
                            </div>
                            <p className="mb-0 text-sm text-muted-foreground">
                                {hasFilters ? 'Nessun risultato trovato' : 'Nessuna risorsa presente'}
                            </p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <Table hover className="mb-0 text-sm [&>thead>tr>th]:bg-muted [&>thead>tr>th]:text-[11px] [&>thead>tr>th]:font-medium [&>thead>tr>th]:text-muted-foreground [&>thead>tr>th]:whitespace-nowrap [&>thead>tr>th]:align-middle [&>tbody>tr>td]:align-middle">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }} className="text-center">
                                            <Checkbox
                                                checked={resources.length > 0 && selectedIds.size === resources.length}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </th>
                                        <th style={{ width: '50px' }}></th>
                                        <th className={SORTABLE} onClick={() => handleSort('filename')}>
                                            Nome file {renderSortIcon('filename')}
                                        </th>
                                        <th className={SORTABLE} onClick={() => handleSort('entity')} style={{ width: '160px' }}>
                                            Entit&agrave; {renderSortIcon('entity')}
                                        </th>
                                        <th style={{ width: '100px' }}>Tipo</th>
                                        <th className={SORTABLE} onClick={() => handleSort('date')} style={{ width: '170px' }}>
                                            Data caricamento {renderSortIcon('date')}
                                        </th>
                                        <th style={{ width: '90px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resources.map((resource) => (
                                        <tr key={resource.id} onClick={() => handleRowClick(resource)} className={'cursor-pointer ' + (selectedIds.has(resource.id) ? '[&>td]:bg-primary/5' : '')}>
                                            <td className="text-center align-middle" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={selectedIds.has(resource.id)}
                                                    onCheckedChange={() => handleSelectToggle(resource.id)}
                                                />
                                            </td>
                                            <td className="w-[50px] min-w-[50px] text-center align-middle">
                                                {renderThumbnail(resource)}
                                                <span className="hidden items-center justify-center" style={{ display: 'none' }}>
                                                    <Icon name={getFileIcon(resource.extension).icon} style={{ color: getFileIcon(resource.extension).color }} size="lg" />
                                                </span>
                                            </td>
                                            <td className="align-middle">
                                                <div className="max-w-[400px] break-words font-medium">{resource.filename}</div>
                                                <div className="text-xs text-muted-foreground">{resource.hash}</div>
                                            </td>
                                            <td className="align-middle">
                                                <Badge variant="secondary">{getEntityLabel(resource.entity)}</Badge>
                                            </td>
                                            <td className="align-middle">
                                                <code className="text-xs">.{resource.extension}</code>
                                            </td>
                                            <td className="whitespace-nowrap align-middle text-xs text-muted-foreground">
                                                {formatDate(resource.date)}
                                            </td>
                                            <td className="whitespace-nowrap align-middle">
                                                <div className="flex justify-end gap-0.5">
                                                    <SimpleTooltip content="Visualizza">
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 px-0" onClick={(e) => { e.stopPropagation(); handleRowClick(resource); }}>
                                                            <Icon name="eye" />
                                                        </Button>
                                                    </SimpleTooltip>
                                                    <SimpleTooltip content="Scarica file">
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 px-0" onClick={(e) => { e.stopPropagation(); triggerDownload(resource); }}>
                                                            <Icon name="download" />
                                                        </Button>
                                                    </SimpleTooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
                {totalPages > 1 && (
                    <CardFooter className="flex items-center justify-between gap-3 bg-muted/30 py-2">
                        <span className="text-xs text-muted-foreground">
                            Pagina {page} di {totalPages} · {totalItems} risultati
                        </span>
                        {renderPagination()}
                    </CardFooter>
                )}
            </Card>

            {showDetail && selectedResource && (
                <ResourceDetail
                    resource={selectedResource}
                    onClose={handleCloseDetail}
                    getFileUrl={getFileUrl}
                />
            )}
        </div>
    );
}
