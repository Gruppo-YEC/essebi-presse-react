import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '../../ui/breadcrumb';
import { Helmet } from 'react-helmet-async';
import { LanguageProvider } from '../../../core/language-provider';
import { settings } from '../../../config/settings';
import './style.css';
import Icon from '../Icon';

export default function HeaderTitle() {
    const location = useLocation();

    const getPageTitle = () => {
        const path = location.pathname;
        const completePath  = location.pathname + location.search;

        // Home/Dashboard
        if (path === '/' || path === '/dashboard') {
            return 'Dashboard';
        }

        // Entity pages
        const entityMatch = path.match(/^\/entity\/([^/]+)/);
        if (entityMatch) {
            const entity = entityMatch[1];
            const entityName = LanguageProvider.get('entity.' + entity);

            // Add page
            if (completePath.includes('/add')) {
                return `${LanguageProvider.get('defaults.add')} - ${entityName}`;
            }

            // Edit page
            if (completePath.includes('/edit?id=')) {
                return `${LanguageProvider.get('defaults.edit')} - ${entityName}`;
            }

            // Clone page
            if (completePath.includes('/clone?id=')) {
                return `${LanguageProvider.get('defaults.clone')} - ${entityName}`;
            }

            // View/Detail page
            if (completePath.includes('/item?id=')) {
                return `${LanguageProvider.get('defaults.details')} - ${entityName}`;
            }

            // List page
            return entityName;
        }

        // Users page
        if (path === '/users') {
            return LanguageProvider.get('entity.user', 'Utenti');
        }

        // Settings page
        if (path === '/settings') {
            return LanguageProvider.get('header.settings');
        }

        // Schema page
        if (path === '/schema') {
            return LanguageProvider.get('header.schema', 'Schema entità');
        }

        // Resources page
        if (path === '/resources') {
            return LanguageProvider.get('header.resources', 'Risorse');
        }

        // Analytics page
        if (path === '/analytics') {
            return 'Analytics';
        }

        // About/License page
        if (path === '/about' || path === '/license') {
            return LanguageProvider.get('header.about');
        }

        // Custom pages: se in entity_language c'è customPage: { NomePagina: '...' }
        // si usa quella, altrimenti il nome della pagina dall'URL
        const pageMatch = path.match(/^\/page\/([^/]+)/);
        if (pageMatch) {
            return LanguageProvider.get('customPage.' + pageMatch[1], pageMatch[1]);
        }

        return '';
    };

    const renderBreadcrumbs = () => {
        const path = location.pathname;
        const completePath  = location.pathname + location.search;

        // Home/Dashboard
        if (path === '/' || path === '/dashboard') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem active>
                        <Icon name="house" />
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Breadcrumbs per le entità standard
        const entityMatch = path.match(/^\/entity\/([^/]+)/);
        if (entityMatch) {
            const entity = entityMatch[1];
            const entityName = LanguageProvider.get('entity.' + entity);

            // Breadcrumbs per pagine di add, edit, clone
            if ((completePath.includes('/add') || completePath.includes('/edit?id=') || completePath.includes('/clone?id=') || completePath.includes('/item?id=')) && path.includes('entity')) {
                return (
                    <Breadcrumb className="header-breadcrumb">
                        <BreadcrumbItem>
                            <Link to="/"><Icon name="house" /></Link>
                        </BreadcrumbItem>
                        <BreadcrumbItem>
                            <Link to={`/entity/${entity}`}>{entityName}</Link>
                        </BreadcrumbItem>
                        <BreadcrumbItem active>
                            {path.includes('/add') && LanguageProvider.get('defaults.add')}
                            {completePath.includes('/edit?id=') && LanguageProvider.get('defaults.edit')}
                            {completePath.includes('/clone?id=') && LanguageProvider.get('defaults.clone')}
                            {completePath.includes('/item?id=') && LanguageProvider.get('defaults.view')}
                        </BreadcrumbItem>
                    </Breadcrumb>
                );
            }

            // Breadcrumbs per la pagina principale del datagrid
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {entityName}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Logout page
        if (path === '/logout') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {LanguageProvider.get('header.logout')}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Users page
        if (path === '/users') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {LanguageProvider.get('entity.user', 'Utenti')}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Settings page
        if (path === '/settings') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {LanguageProvider.get('header.settings')}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Resources page
        if (path === '/resources') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {LanguageProvider.get('header.resources', 'Risorse')}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Schema page
        if (path === '/schema') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {LanguageProvider.get('header.schema', 'Schema entità')}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Analytics page
        if (path === '/analytics') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        Analytics
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // About/License page
        if (path === '/about' || path === '/license') {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {LanguageProvider.get('header.about')}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Custom pages
        const pageMatch = path.match(/^\/page\/([^/]+)/);
        if (pageMatch) {
            return (
                <Breadcrumb className="header-breadcrumb">
                    <BreadcrumbItem>
                        <Link to="/"><Icon name="house" /></Link>
                    </BreadcrumbItem>
                    <BreadcrumbItem active>
                        {LanguageProvider.get('customPage.' + pageMatch[1], pageMatch[1])}
                    </BreadcrumbItem>
                </Breadcrumb>
            );
        }

        // Default: nessuna breadcrumb
        return null;
    };

    const pageTitle = getPageTitle();
    const breadcrumbs = renderBreadcrumbs();

    return (
        <>
            <Helmet>
                <title>{pageTitle ? `${pageTitle} - ${settings.title}` : settings.title}</title>
            </Helmet>
            {breadcrumbs}
        </>
    );
}
