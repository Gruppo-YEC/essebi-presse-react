import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Table } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Spinner } from '../../components/ui/spinner';
import { Card, CardBody } from '../../components/ui/card';
import { InputGroup, InputGroupText } from '../../components/ui/input-group';
import { Pagination, PaginationItem, PaginationFirst, PaginationPrev, PaginationNext, PaginationLast } from '../../components/ui/pagination';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from '../../components/ui/toast';
import { DataManager } from '../../core/data-manager';
import { ApiManager } from '../../core/api-manager';
import { ViewManager } from '../../core/view-manager';
import { AuthorizationManager } from '../../core/authorization-manager';
import { LanguageProvider } from '../../core/language-provider';
import FieldPreview from '../../components/Entity/FieldPreview';
import Field from '../../components/Entity/Field';
import ColumnFilter from '../../components/Entity/DataGrid/ColumnFilter';
import AppliedFilters from '../../components/Entity/AppliedFilters';
import avatars from '../../core/avatar';
import { settings } from '../../config/settings';
import './style.css';
import Icon from '../../components/BodyElements/Icon';

const ENTITY = 'user';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const limit = 10;

    // Tab attiva: 'active' o 'disabled'
    const [activeTab, setActiveTab] = useState('active');

    // Ricerca
    const [searchQuery, setSearchQuery] = useState('');

    // Filtri di colonna (stile datagrid) e ordinamento
    const [filtersObj, setFiltersObj] = useState({ constraints: [] });
    const [sorting, setSorting] = useState({ field: 'id', order: 'DESC' });

    // Entity properties
    const [props, setProps] = useState(null);
    const [visibleColumns, setVisibleColumns] = useState([]);
    const [editableColumns, setEditableColumns] = useState([]);

    // Modal edit
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [saving, setSaving] = useState(false);

    // Modal password
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordUser, setPasswordUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    // occhio sugli input: mostra in chiaro cosa si è digitato
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Modal delete confirmation
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingUser, setDeletingUser] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Modal disable user
    const [showDisableModal, setShowDisableModal] = useState(false);
    const [disablingUser, setDisablingUser] = useState(null);
    const [disabling, setDisabling] = useState(false);

    // Modal enable user
    const [showEnableModal, setShowEnableModal] = useState(false);
    const [enablingUser, setEnablingUser] = useState(null);
    const [enabling, setEnabling] = useState(false);

    // Modal restore user
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoringUser, setRestoringUser] = useState(null);
    const [restoring, setRestoring] = useState(false);


    // Permissions
    const editPermission = AuthorizationManager.checkEntityActionAuth(ENTITY, 'edit');
    const canView = AuthorizationManager.checkEntityActionAuth(ENTITY, 'view') !== false;
    const canEdit = editPermission !== false;
    const canCreate = AuthorizationManager.checkEntityActionAuth(ENTITY, 'create') !== false;
    const canDelete = AuthorizationManager.checkEntityActionAuth(ENTITY, 'delete') !== false;
    const isFullEditAccess = editPermission === true || editPermission === 1;

    useEffect(() => {
        const entityProps = ViewManager.getEntityProperties(ENTITY);
        setProps(entityProps);

        // Colonne visibili + livello utente + eventuali extra da
        // settings.usersPageColumns, senza deepExternalEntity.
        // Colonne inesistenti in tables.json vengono scartate.
        const allVisibleColumns = [...(ViewManager.getVisibleColumns(ENTITY) || [])];
        ['level', ...(settings.usersPageColumns || [])].forEach(col => {
            if (!allVisibleColumns.includes(col)) allVisibleColumns.push(col);
        });
        const filteredColumns = allVisibleColumns.filter(col => {
            const colConfig = entityProps?.columns?.[col];
            return colConfig && colConfig.input_type !== 'deepExternalEntity';
        });
        setVisibleColumns(filteredColumns);

        // Colonne editabili + idUserGroup per utenti con accesso completo
        const baseEditable = ViewManager.getEditableColumns(ENTITY) || [];
        if (isFullEditAccess && !baseEditable.includes('idUserGroup')) {
            setEditableColumns([...baseEditable, 'idUserGroup']);
        } else {
            setEditableColumns(baseEditable);
        }
    }, []);

    useEffect(() => {
        if (props) {
            loadUsers();
        }
    }, [page, props, activeTab, searchQuery, filtersObj, sorting]);

    // Reset pagina quando cambia tab
    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPage(1);
    };

    // Gestione ricerca
    const handleSearch = (value) => {
        setSearchQuery(value);
        setPage(1);
    };

    // Ricerca full-text: tutti i campi testuali dell'entità. Le external non
    // si cercano da qui (il LIKE del backend lavora sulla FK numerica): per
    // quelle ci sono i filtri di colonna, che usano constraints IN sugli id.
    const getSearchFields = () => {
        if (!props) return [];
        const textTypes = ['string', 'text', 'email', 'phone'];
        return Object.keys(props.columns).filter(col => textTypes.includes(props.columns[col].input_type));
    };

    // Filtri di colonna: ColumnFilter lavora su un searchObj { constraints }
    const handleFiltersChange = (obj) => {
        setFiltersObj({ constraints: obj.constraints || [] });
        setPage(1);
    };

    const removeConstraint = (item) => {
        setFiltersObj(prev => ({ constraints: prev.constraints.filter(c => c !== item) }));
        setPage(1);
    };

    // Ordinamento (singola colonna) per ColumnFilter
    const changeSorting = (field, order) => {
        setSorting({ field: field, order: String(order).toUpperCase() });
        setPage(1);
    };
    const invertSorting = (field) => {
        setSorting(prev => ({ field: field, order: prev.order === 'ASC' ? 'DESC' : 'ASC' }));
    };
    const removeSorting = () => {
        setSorting({ field: 'id', order: 'DESC' });
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            let response;

            if (activeTab === 'deleted') {
                // Per utenti eliminati usa API custom (la search standard esclude deleted=1)
                response = await ApiManager.sendAuthenticatedRequest('/users/getDeleted', {
                    page: page,
                    limit: limit
                });
            } else {
                // Filtra per utenti attivi o disabilitati in base alla tab,
                // più i filtri di colonna attivi
                const disabledValue = activeTab === 'disabled' ? 1 : 0;
                const constraints = [
                    { fieldName: 'disabled', type: 'value', value: disabledValue },
                    ...filtersObj.constraints
                ];

                response = await DataManager.searchItems(
                    ENTITY,
                    page,
                    limit,
                    sorting,
                    searchQuery,
                    getSearchFields(),
                    constraints
                );
            }

            if (response.success === 1) {
                setUsers(response.body || []);
                setTotalItems(response.total || 0);
                setTotalPages(Math.ceil((response.total || 0) / limit));
            }
        } catch (error) {
            console.error('Error loading users:', error);
            toast.error('Errore nel caricamento utenti');
        } finally {
            setLoading(false);
        }
    };

    const getAvatarImage = (user) => {
        if (user.avatar === null || user.avatar === undefined) return null;

        // Avatar può essere un numero diretto o un oggetto { value: X }
        const avatarIndex = user.avatar?.value !== undefined ? user.avatar.value : user.avatar;

        if (avatarIndex !== null && avatarIndex !== undefined && avatars[avatarIndex]) {
            return avatars[avatarIndex];
        }
        return null;
    };

    // Controlla se un utente è disabilitato
    const isUserDisabled = (user) => {
        // Controlla il campo disabled (può essere valore diretto o oggetto con value)
        const disabled = user.disabled?.value !== undefined ? user.disabled.value : user.disabled;
        return disabled === 1 || disabled === '1' || disabled === true;
    };

    // Disabilita utente
    const handleDisableClick = (user) => {
        setDisablingUser(user);
        setShowDisableModal(true);
    };

    const handleConfirmDisable = async () => {
        if (!disablingUser) return;

        setDisabling(true);
        try {
            const response = await ApiManager.sendAuthenticatedRequest('/users/disable', {
                id: disablingUser.id
            });

            if (response.success === 1) {
                toast.success('Utente disabilitato');
                setShowDisableModal(false);
                setDisablingUser(null);
                loadUsers();
            } else {
                toast.error(response.message || 'Errore nella disabilitazione');
            }
        } catch (error) {
            console.error('Error disabling user:', error);
            toast.error('Errore nella disabilitazione');
        } finally {
            setDisabling(false);
        }
    };

    // Riabilita utente
    const handleEnableClick = (user) => {
        setEnablingUser(user);
        setShowEnableModal(true);
    };

    const handleConfirmEnable = async () => {
        if (!enablingUser) return;

        setEnabling(true);
        try {
            const response = await ApiManager.sendAuthenticatedRequest('/users/enable', {
                id: enablingUser.id
            });

            if (response.success === 1) {
                toast.success('Utente riabilitato');
                setShowEnableModal(false);
                setEnablingUser(null);
                loadUsers();
            } else {
                toast.error(response.message || 'Errore nella riabilitazione');
            }
        } catch (error) {
            console.error('Error enabling user:', error);
            toast.error('Errore nella riabilitazione');
        } finally {
            setEnabling(false);
        }
    };

    // Ripristina utente eliminato
    const handleRestoreClick = (user) => {
        setRestoringUser(user);
        setShowRestoreModal(true);
    };

    const handleConfirmRestore = async () => {
        if (!restoringUser) return;

        setRestoring(true);
        try {
            const response = await ApiManager.sendAuthenticatedRequest('/users/restore', {
                id: restoringUser.id
            });

            if (response.success === 1) {
                toast.success('Utente ripristinato');
                setShowRestoreModal(false);
                setRestoringUser(null);
                loadUsers();
            } else {
                toast.error(response.message || 'Errore nel ripristino');
            }
        } catch (error) {
            console.error('Error restoring user:', error);
            toast.error('Errore nel ripristino');
        } finally {
            setRestoring(false);
        }
    };

    // Callback per aggiornare un campo nell'editingUser
    const handleFieldChange = (fieldKey, value) => {
        setEditingUser(prev => ({ ...prev, [fieldKey]: value }));
    };

    // Estrae il valore di un campo dalla risposta API per l'editing
    // Mantiene il formato oggetto per option e externalEntity (richiesto da Field component)
    const extractFieldValue = (fieldData, fieldConfig) => {
        if (fieldData === null || fieldData === undefined) {
            if (fieldConfig.input_type === 'boolean') return 0;
            if (fieldConfig.input_type === 'option') return { value: '', label: '' };
            if (fieldConfig.input_type === 'externalEntity') return null;
            if (fieldConfig.input_type === 'deepExternalEntity' || fieldConfig.input_type === 'multipleExternalEntity') return [];
            return '';
        }

        switch (fieldConfig.input_type) {
            case 'option':
                // Field component si aspetta { value: X, label: Y }
                if (typeof fieldData === 'object' && fieldData.value !== undefined) {
                    return fieldData;
                }
                return { value: fieldData, label: fieldData };
            case 'externalEntity':
                // Field component si aspetta l'oggetto completo o { id: X }
                return fieldData;
            case 'deepExternalEntity':
            case 'multipleExternalEntity':
                // Il componente lavora su un array (get_item lo restituisce già così;
                // in caso di conteggio o valore anomalo si riparte da lista vuota)
                return Array.isArray(fieldData) ? fieldData : [];
            case 'boolean':
                return parseInt(fieldData) || 0;
            default:
                return fieldData;
        }
    };

    // Inizializza un campo vuoto per nuovo record
    // Formato compatibile con Field component
    const initFieldValue = (fieldConfig) => {
        switch (fieldConfig.input_type) {
            case 'boolean':
                return fieldConfig.options?.default ?? 0;
            case 'option':
                const defaultVal = fieldConfig.options?.default ?? '';
                return { value: defaultVal, label: defaultVal };
            case 'externalEntity':
                return null;
            case 'deepExternalEntity':
            case 'multipleExternalEntity':
                return [];
            default:
                return fieldConfig.options?.default ?? '';
        }
    };

    const handleEdit = async (user) => {
        try {
            const response = await DataManager.getItem(ENTITY, user.id);
            if (response.success === 1 && response.body && response.body[0]) {
                const fullUser = response.body[0];
                const userData = { id: fullUser.id };

                editableColumns.forEach(col => {
                    if (props.columns[col]) {
                        userData[col] = extractFieldValue(fullUser[col], props.columns[col]);
                    }
                });

                setEditingUser(userData);
                setShowEditModal(true);
            }
        } catch (error) {
            console.error('Error loading user:', error);
            toast.error('Errore nel caricamento utente');
        }
    };

    const handleAdd = () => {
        const userData = {};

        editableColumns.forEach(col => {
            if (props.columns[col]) {
                userData[col] = initFieldValue(props.columns[col]);
            }
        });

        setEditingUser(userData);
        setShowEditModal(true);
    };

    // Controlla se un campo è vuoto (gestisce sia valori semplici che oggetti)
    const isFieldEmpty = (value, fieldConfig) => {
        if (value === null || value === undefined || value === '') return true;

        switch (fieldConfig.input_type) {
            case 'option':
                // { value: '', label: '' } è considerato vuoto; 0 è un valore valido (es. livello admin)
                const optionValue = typeof value === 'object' ? value.value : value;
                return optionValue === null || optionValue === undefined || optionValue === '';
            case 'externalEntity':
                // null o { id: '' } è considerato vuoto
                return typeof value === 'object' ? !value?.id : !value;
            default:
                return !value;
        }
    };

    const handleSave = async () => {
        // Validazione campi required
        for (const col of editableColumns) {
            // Salta validazione password in edit (non è mostrata)
            if (col === 'password' && editingUser.id) continue;

            const fieldConfig = props.columns[col];
            if (fieldConfig?.validation?.required && isFieldEmpty(editingUser[col], fieldConfig)) {
                toast.error(`${LanguageProvider.getLabel(ENTITY, col)} è obbligatorio`);
                return;
            }
        }

        // Password obbligatoria per nuovo utente
        if (!editingUser.id && editableColumns.includes('password') && !editingUser.password) {
            toast.error('La password è obbligatoria per i nuovi utenti');
            return;
        }

        setSaving(true);
        try {
            // I valori restano nel formato del Field: ad appiattirli è parseData, per la
            // modifica come per la creazione, la stessa strada delle entità standard
            // (option -> value, externalEntity -> id, file -> hash, deep -> righe figlie
            // appiattite, testi svuotati -> '', externalEntity svuotate -> null).
            const raw = {};
            editableColumns.forEach(col => {
                if (!props.columns[col]) return;
                // In modifica la password ha il suo modale dedicato
                if (col === 'password' && editingUser.id) return;
                raw[col] = editingUser[col];
            });

            let response;
            if (editingUser.id) {
                // /users/edit e non /post: permessi specifici sugli utenti (anche "group")
                // e idUserGroup modificabile, che Post.php ignora
                const data = DataManager.parseData(ENTITY, raw);
                data.id = editingUser.id;
                response = await ApiManager.sendAuthenticatedRequest('/users/edit', data);
            } else {
                // Salva idUserGroup prima della creazione (Post.php lo ignora e imposta quello dell'utente corrente)
                const selectedUserGroup = raw.idUserGroup;
                delete raw.idUserGroup;
                response = await DataManager.insertItem(ENTITY, raw);

                // Se admin con accesso completo ha scelto un gruppo diverso, aggiorna subito dopo la creazione
                if (response.success === 1 && isFullEditAccess && selectedUserGroup) {
                    const groupData = DataManager.parseData(ENTITY, { idUserGroup: selectedUserGroup });
                    if (groupData.idUserGroup) {
                        await ApiManager.sendAuthenticatedRequest('/users/edit', {
                            id: response.id,
                            idUserGroup: groupData.idUserGroup
                        });
                    }
                }
            }

            if (response.success === 1) {
                toast.success(editingUser.id ? 'Utente aggiornato' : 'Utente creato');
                setShowEditModal(false);
                setEditingUser(null);
                loadUsers();
            } else {
                toast.error(response.message || 'Errore nel salvataggio');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            toast.error('Errore nel salvataggio');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = (user) => {
        setPasswordUser(user);
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setShowPasswordModal(true);
    };

    const handleSavePassword = async () => {
        if (!newPassword) {
            toast.error('Inserisci la nuova password');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Le password non coincidono');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('La password deve essere di almeno 6 caratteri');
            return;
        }

        setSavingPassword(true);
        try {
            const response = await DataManager.updateItem(ENTITY, {
                password: newPassword
            }, passwordUser.id, passwordUser);

            if (response.success === 1) {
                toast.success('Password aggiornata');
                setShowPasswordModal(false);
                setPasswordUser(null);
            } else {
                toast.error(response.message || 'Errore nel salvataggio');
            }
        } catch (error) {
            console.error('Error saving password:', error);
            toast.error('Errore nel salvataggio');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleDeleteClick = (user) => {
        setDeletingUser(user);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingUser) return;

        setDeleting(true);
        try {
            const response = await DataManager.deleteItem(ENTITY, deletingUser.id);
            if (response.success === 1) {
                toast.success('Utente eliminato');
                setShowDeleteModal(false);
                setDeletingUser(null);
                loadUsers();
            } else {
                toast.error(response.message || 'Errore nell\'eliminazione');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Errore nell\'eliminazione');
        } finally {
            setDeleting(false);
        }
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const items = [];
        const maxVisible = 5;
        let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        items.push(
            <PaginationFirst key="first" onClick={() => setPage(1)} disabled={page === 1} />,
            <PaginationPrev key="prev" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
        );

        if (startPage > 1) {
            items.push(<PaginationItem key="ellipsis-start" disabled>…</PaginationItem>);
        }

        for (let i = startPage; i <= endPage; i++) {
            items.push(
                <PaginationItem key={i} active={i === page} onClick={() => setPage(i)}>
                    {i}
                </PaginationItem>
            );
        }

        if (endPage < totalPages) {
            items.push(<PaginationItem key="ellipsis-end" disabled>…</PaginationItem>);
        }

        items.push(
            <PaginationNext key="next" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} />,
            <PaginationLast key="last" onClick={() => setPage(totalPages)} disabled={page === totalPages} />
        );

        return <Pagination className="mb-0">{items}</Pagination>;
    };

    if (!canView) {
        return (
            <div className="users-page mb-4 mt-4 w-full px-3">
                <div className="py-12 text-center">
                    <Icon name="lock" size="3x" className="mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Non hai i permessi per visualizzare questa pagina</p>
                </div>
            </div>
        );
    }

    return (
        <div className="users-page mb-4 mt-4 w-full px-3">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="mb-0">
                    {LanguageProvider.get('entity.' + ENTITY)}
                </h3>
                {canCreate && (
                    <Button variant="outline-success" onClick={handleAdd}>
                        <Icon name="plus" /> Nuovo Utente
                    </Button>
                )}
            </div>

            {activeTab !== 'deleted' && (
                <>
                    <InputGroup className={filtersObj.constraints.length > 0 ? 'mb-2' : 'mb-4'}>
                        <InputGroupText>
                            <Icon name="magnifying-glass" />
                        </InputGroupText>
                        <Input
                            type="text"
                            placeholder="Cerca in tutti i campi..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {searchQuery && (
                            <Button variant="outline-secondary" onClick={() => handleSearch('')}>
                                <Icon name="xmark" />
                            </Button>
                        )}
                    </InputGroup>
                    {filtersObj.constraints.length > 0 && (
                        <div className="mb-4">
                            <AppliedFilters entity={ENTITY} constraints={filtersObj.constraints} onRemove={removeConstraint} />
                        </div>
                    )}
                </>
            )}

            <Card>
                <CardBody>
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-4">
                        <TabsList>
                            <TabsTrigger value="active">
                                <Icon name="users" />
                                Utenti Attivi
                            </TabsTrigger>
                            <TabsTrigger value="disabled">
                                <Icon name="user-slash" />
                                Utenti Disabilitati
                            </TabsTrigger>
                            {canDelete && (
                                <TabsTrigger value="deleted">
                                    <Icon name="trash" />
                                    Utenti Eliminati
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </Tabs>

                    {loading ? (
                        <div className="py-12 text-center">
                            <Spinner variant="primary" />
                        </div>
                    ) : (
                        <>
                            <Table
                                responsive
                                hover
                                className="mb-0 text-sm [&>thead>tr>th]:bg-muted [&>thead>tr>th]:text-[11px] [&>thead>tr>th]:font-medium [&>thead>tr>th]:text-muted-foreground [&>tbody>tr>td]:py-2.5 [&>tbody>tr>td]:align-middle"
                            >
                                <thead>
                                    <tr>
                                        <th style={{ width: '56px' }}></th>
                                        {visibleColumns.map((col) => (
                                            <th key={col}>
                                                {activeTab === 'deleted' ? (
                                                    /* la tab eliminati usa un'API custom senza search: niente filtri */
                                                    LanguageProvider.getLabel(ENTITY, col)
                                                ) : (
                                                    <ColumnFilter
                                                        fieldName={col}
                                                        fieldConfig={props.columns[col]}
                                                        entity={ENTITY}
                                                        params={{ sorting: [sorting], sortingField: sorting.field, sortingOrder: sorting.order }}
                                                        changeSorting={changeSorting}
                                                        invertSorting={invertSorting}
                                                        removeSorting={removeSorting}
                                                        searchObj={filtersObj}
                                                        setSearchObj={handleFiltersChange}
                                                    />
                                                )}
                                            </th>
                                        ))}
                                        {(canEdit || canDelete) && <th style={{ width: '64px' }} className="text-right"></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={visibleColumns.length + 1 + (canEdit || canDelete ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                                                <Icon name="users" size="2x" className="mb-3 opacity-40" />
                                                <div>{LanguageProvider.get('defaults.no_results', 'Nessun elemento trovato')}</div>
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id}>
                                                <td>
                                                    <div className="flex items-center">
                                                        {getAvatarImage(user) ? (
                                                            <img
                                                                src={getAvatarImage(user)}
                                                                alt={user.name}
                                                                className={`users-page__avatar ${activeTab === 'disabled' ? 'opacity-50 grayscale' : ''}`}
                                                            />
                                                        ) : (
                                                            <div className={`users-page__avatar-placeholder ${activeTab === 'disabled' ? 'opacity-50' : ''}`}>
                                                                <Icon name="user" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                {visibleColumns.map((col) => (
                                                    <td key={col}>
                                                        <FieldPreview item={user} field={col} props={props} entity={ENTITY} />
                                                    </td>
                                                ))}
                                                {(canEdit || canDelete) && (
                                                    <td className="text-right">
                                                        {activeTab === 'deleted' ? (
                                                            // Tab eliminati: solo ripristina
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRestoreClick(user)}
                                                                title="Ripristina utente"
                                                                className="text-success hover:text-success"
                                                            >
                                                                <Icon name="arrow-rotate-left" />
                                                            </Button>
                                                        ) : (
                                                            // Tab attivi/disabilitati: menu azioni
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Azioni">
                                                                        <Icon name="ellipsis" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    {canEdit && (
                                                                        <>
                                                                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                                                <Icon name="pen-to-square" className="w-4 opacity-60" /> Modifica
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handlePasswordChange(user)}>
                                                                                <Icon name="key" className="w-4 opacity-60" /> Cambia password
                                                                            </DropdownMenuItem>
                                                                            {activeTab === 'active' ? (
                                                                                <DropdownMenuItem onClick={() => handleDisableClick(user)}>
                                                                                    <Icon name="ban" className="w-4 opacity-60" /> Disabilita
                                                                                </DropdownMenuItem>
                                                                            ) : (
                                                                                <DropdownMenuItem onClick={() => handleEnableClick(user)}>
                                                                                    <Icon name="check" className="w-4 opacity-60" /> Riabilita
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {canDelete && (
                                                                        <>
                                                                            {canEdit && <DropdownMenuSeparator />}
                                                                            <DropdownMenuItem
                                                                                className="text-danger focus:bg-danger/10 focus:text-danger"
                                                                                onClick={() => handleDeleteClick(user)}
                                                                            >
                                                                                <Icon name="trash" className="w-4" /> Elimina
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                            <div className="flex items-center justify-between border-t border-border p-4">
                                <small className="text-muted-foreground">
                                    {totalItems} {LanguageProvider.get('defaults.elements', 'elementi')}
                                </small>
                                {renderPagination()}
                            </div>
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Modal Modifica Utente */}
            <Dialog open={showEditModal} onOpenChange={(open) => { if (!open) setShowEditModal(false) }}>
                <DialogContent size="lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingUser?.id ? 'Modifica Utente' : 'Nuovo Utente'}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {editingUser && props && (
                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="row">
                                    {editableColumns.map((col) => {
                                        const fieldConfig = props.columns[col];
                                        if (!fieldConfig) return null;

                                        // Password: mostra solo in creazione
                                        if (col === 'password' && editingUser.id) return null;

                                        // Avatar: rendering custom
                                        if (col === 'avatar') return null;

                                        const inputType = fieldConfig.input_type;

                                        // Determina la larghezza della colonna in base al tipo
                                        let colClass = 'col-md-6 mb-4';
                                        if (inputType === 'text' || inputType === 'richText' || inputType === 'markdown' || inputType === 'deepExternalEntity') {
                                            colClass = 'col-12 mb-4';
                                        }

                                        return (
                                            <div key={col} className={colClass}>
                                                <Field
                                                    type={inputType}
                                                    fieldKey={col}
                                                    value={editingUser[col]}
                                                    entity={ENTITY}
                                                    view={{ properties: props }}
                                                    save={handleFieldChange}
                                                    data={editingUser}
                                                    noclass={true}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Avatar custom */}
                                {editableColumns.includes('avatar') && (
                                    <div className="row">
                                        <div className="col-12">
                                            <div className="mb-4">
                                                <Label className="text-sm">{LanguageProvider.getLabel(ENTITY, 'avatar')}</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {avatars.map((avatarImg, i) => {
                                                        // Avatar può essere un numero o un oggetto { value: X }
                                                        const currentAvatar = editingUser.avatar?.value !== undefined
                                                            ? editingUser.avatar.value
                                                            : editingUser.avatar;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`users-page__avatar-option ${currentAvatar == i ? 'selected' : ''}`}
                                                                onClick={() => setEditingUser({ ...editingUser, avatar: { value: i, label: String(i) } })} // formato option del Field, come si aspetta parseData
                                                            >
                                                                <img src={avatarImg} style={{ width: 50, height: 50 }} alt={'avatar ' + i} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                            Annulla
                        </Button>
                        <Button variant="primary" onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Icon name="floppy-disk" className="me-2" />
                                    Salva
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Cambio Password */}
            <Dialog open={showPasswordModal} onOpenChange={(open) => { if (!open) setShowPasswordModal(false) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Cambia Password
                            {passwordUser && <small className="block text-muted-foreground">{passwordUser.username}</small>}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="mb-4">
                                <Label className="text-sm">Nuova Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showNewPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Inserisci nuova password"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowNewPassword(v => !v)}
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                        title={showNewPassword ? 'Nascondi password' : 'Mostra password'}
                                    >
                                        <Icon name={showNewPassword ? 'eye-slash' : 'eye'} />
                                    </button>
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    Minimo 6 caratteri
                                </div>
                            </div>
                            <div className="mb-4">
                                <Label className="text-sm">Conferma Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Conferma password"
                                        className={'pr-10' + (confirmPassword && newPassword !== confirmPassword ? ' border-danger' : '')}
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowConfirmPassword(v => !v)}
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                        title={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
                                    >
                                        <Icon name={showConfirmPassword ? 'eye-slash' : 'eye'} />
                                    </button>
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <div className="mt-1 text-sm text-danger">
                                        Le password non coincidono
                                    </div>
                                )}
                            </div>
                        </form>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
                            Annulla
                        </Button>
                        <Button variant="warning" onClick={handleSavePassword} disabled={savingPassword}>
                            {savingPassword ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Salvataggio...
                                </>
                            ) : (
                                <>
                                    <Icon name="key" className="me-2" />
                                    Aggiorna Password
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Conferma Eliminazione */}
            <Dialog open={showDeleteModal} onOpenChange={(open) => { if (!open) setShowDeleteModal(false) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Conferma Eliminazione</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {deletingUser && (
                            <p>
                                Sei sicuro di voler eliminare l'utente <strong>{deletingUser.name} {deletingUser.surname}</strong> ({deletingUser.username})?
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                            Annulla
                        </Button>
                        <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
                            {deleting ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Eliminazione...
                                </>
                            ) : (
                                <>
                                    <Icon name="trash" className="me-2" />
                                    Elimina
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Conferma Disabilitazione */}
            <Dialog open={showDisableModal} onOpenChange={(open) => { if (!open) setShowDisableModal(false) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disabilita Utente</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {disablingUser && (
                            <>
                                <p>
                                    Sei sicuro di voler disabilitare l'utente <strong>{disablingUser.name} {disablingUser.surname}</strong> ({disablingUser.username})?
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    L'utente non potrà più accedere al sistema e non potrà recuperare la password.
                                </p>
                            </>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowDisableModal(false)}>
                            Annulla
                        </Button>
                        <Button variant="dark" onClick={handleConfirmDisable} disabled={disabling}>
                            {disabling ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Disabilitazione...
                                </>
                            ) : (
                                <>
                                    <Icon name="ban" className="me-2" />
                                    Disabilita
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Conferma Riabilitazione */}
            <Dialog open={showEnableModal} onOpenChange={(open) => { if (!open) setShowEnableModal(false) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Riabilita Utente</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {enablingUser && (
                            <>
                                <p>
                                    Sei sicuro di voler riabilitare l'utente <strong>{enablingUser.name} {enablingUser.surname}</strong> ({enablingUser.username})?
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    L'utente potrà nuovamente accedere al sistema con le credenziali esistenti.
                                </p>
                            </>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowEnableModal(false)}>
                            Annulla
                        </Button>
                        <Button variant="success" onClick={handleConfirmEnable} disabled={enabling}>
                            {enabling ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Riabilitazione...
                                </>
                            ) : (
                                <>
                                    <Icon name="check" className="me-2" />
                                    Riabilita
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Conferma Ripristino */}
            <Dialog open={showRestoreModal} onOpenChange={(open) => { if (!open) setShowRestoreModal(false) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ripristina Utente</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        {restoringUser && (
                            <>
                                <p>
                                    Sei sicuro di voler ripristinare l'utente <strong>{restoringUser.name} {restoringUser.surname}</strong> ({restoringUser.username})?
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    L'utente verrà ripristinato e sarà nuovamente visibile nella lista utenti attivi.
                                </p>
                            </>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>
                            Annulla
                        </Button>
                        <Button variant="success" onClick={handleConfirmRestore} disabled={restoring}>
                            {restoring ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Ripristino...
                                </>
                            ) : (
                                <>
                                    <Icon name="arrow-rotate-left" className="me-2" />
                                    Ripristina
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
