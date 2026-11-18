import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../../ui/dropdown-menu';
import { menu } from '../../../config/menu';
import { settings } from '../../../config/settings';
import { AuthorizationManager } from '../../../core/authorization-manager';
import { LanguageProvider } from '../../../core/language-provider';
import avatars from '../../../core/avatar';
import Icon from '../Icon';
import { Input } from '../../ui/input';


/* Filtro della barra di ricerca: header e divider spariscono durante la
   ricerca (senza le loro voci non hanno contesto), un folder resta se matcha
   lui o almeno una sotto-voce — in quel caso con le sole sotto-voci che
   matchano. Il clone col spread evita di mutare gli item di menuAuth. */
function filterMenu(items, query) {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const matches = (label) => (label || '').toLowerCase().includes(q);
    const result = [];
    for (const item of items) {
        switch (item.type) {
            case 'header':
            case 'divider':
                break;
            case 'folder':
                if (matches(item.label)) {
                    result.push(item);
                }
                else {
                    const sub = item.items.filter(s => matches(s.label));
                    if (sub.length > 0) result.push({ ...item, items: sub });
                }
                break;
            default:
                if (matches(item.label)) result.push(item);
        }
    }
    return result;
}


/* userInfo.level arriva dal backend come stringa, ma nei menu hideForLevel
   viene scritto anche con numeri: il confronto va fatto a tipo normalizzato */
function hiddenForLevel(element, userLevel) {
    if (!element.hideForLevel || userLevel === undefined || userLevel === null) return false;
    return element.hideForLevel.map(String).includes(String(userLevel));
}


export default function Sidebar({ open, userInfo }) {

    const [folderStatus, setFolderStatus] = useState([]);
    const [menuAuth, setMenuAuth] = useState(null);
    const [canViewAnalytics, setCanViewAnalytics] = useState(false);
    const [search, setSearch] = useState('');

    /* tema chiaro/scuro (spostato qui dall'header) */
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const initialDark = savedTheme === 'dark';
        setIsDark(initialDark);
        applyTheme(initialDark);
    }, []);

    const applyTheme = (dark) => {
        const htmlElement = document.documentElement;
        if (htmlElement) {
            if (dark) {
                htmlElement.classList.add('dark-theme-active')
                htmlElement.setAttribute('data-bs-theme', 'dark')
            } else {
                htmlElement.classList.remove('dark-theme-active')
                htmlElement.setAttribute('data-bs-theme', 'light')
            }
        }
    };

    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        applyTheme(newDark);
        localStorage.setItem('theme', newDark ? 'dark' : 'light');
    };


    useEffect(() => {
        if (userInfo !== null && settings.advancedAnalytics && Array.isArray(settings.advancedAnalytics)) {
            setCanViewAnalytics(settings.advancedAnalytics.includes(parseInt(userInfo.level)))
        }
        else {
            setCanViewAnalytics(false)
        }
    }, [userInfo]);


    useEffect(() => {
        if (userInfo) {
            console.log('sidebar userinfo detected change', userInfo)
            var userLevel = userInfo.level
            var menu2 = []
            for (var i = 0; i < menu.length; i++) {
                var element = menu[i];
                if(hiddenForLevel(element, userLevel)) {
                    //elemento nascosto
                }
                else {
                    switch (element.type) {
                        case 'item':
                            if (element.entity && element.entity !== '') {
                                var authorizedItem = AuthorizationManager.checkEntityAuth(element.entity)
                                if (authorizedItem)
                                    menu2.push(element);
                            }
                            else {
                                menu2.push(element);
                            }
                            break;
                        case 'folder':
                            let subMenu = [];
                            for (var j = 0; j < element.items.length; j++) {
                                var subElement = element.items[j]
                                if (subElement.entity && subElement.entity !== '') {
                                    var authorizedItem = AuthorizationManager.checkEntityAuth(subElement.entity)
                                    if (authorizedItem)
                                        subMenu.push(subElement);
                                }
                                else {
                                    subMenu.push(subElement);
                                }
                            }
                            if (subMenu.length > 0) {
                                let newElement = element;
                                newElement.items = subMenu;
                                menu2.push(newElement);
                            }
                            break;
                        default:
                            menu2.push(element)
                    }
                }
            }
            setMenuAuth(menu2)
        }
    }, [userInfo]);

    function arrayRemove(arr, value) {
        return arr.filter(function (ele) {
            return ele != value;
        });
    }
    function arrayAdd(arr, value) {
        arr.push(value);
        return arr.filter(function (ele) {
            return ele;
        });
    }
    function folderToggle(i) {
        let newArray = folderStatus;
        if (newArray.indexOf(i) >= 0) {
            let newFolder = arrayRemove(folderStatus, i);
            setFolderStatus(newFolder)
        }
        else {
            let newFolder = arrayAdd(folderStatus, i);
            setFolderStatus(newFolder)
        }
    }

    function isActivePage(item) {
        var url = window.location.pathname
        var itemUrl = item.href
        return itemUrl === url
    }

    const avatarSrc = userInfo && userInfo.avatar !== null && avatars[userInfo.avatar] ? avatars[userInfo.avatar] : avatars[2];


    if (userInfo !== null && menuAuth !== null) {
        const searching = search.trim() !== '';
        const visibleMenu = filterMenu(menuAuth, search);
        return (
            <div id='sidebar' data-sidebar={open}>
                {/* header stile shadcn: tile con il logo + nome app da settings */}
                <div className='sidebar-logo'>
                    <span className='sidebar-logo-tile'>
                        <img
                            src={settings.logo}
                            alt="logo"
                        />
                    </span>
                    <span className='sidebar-logo-title'>{settings.title}</span>
                </div>
                <div className='sidebar-search'>
                    <div className='relative'>
                        <Icon name='magnifying-glass' size='sm' className='sidebar-search-icon' />
                        <Input
                            size='sm'
                            type='search'
                            className='pl-8'
                            placeholder={LanguageProvider.get('header.search', 'Ricerca')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className='sidebar-menu'>
                    {visibleMenu.map((item, i) => {
                        i++
                        switch (item.type) {
                            case 'link':
                                return (
                                    <a key={i} href={item.href} className='sidebar-item'>
                                        <Icon size={'1x'} className='me-2' name={item.icon} /> {item.label}
                                    </a>
                                )
                            case 'item':
                                return (
                                    <Link key={i} to={item.href} onClick={() => setSearch('')} className={isActivePage(item) ? 'sidebar-item active' : 'sidebar-item'}>
                                        <Icon size={'1x'} className='me-2' name={item.icon} /> {item.label}
                                    </Link>
                                )
                            case 'folder':
                                if (item.items.length > 0) { //if folder has almost 1 sub-item
                                    return (
                                        <div key={i} className={folderStatus.includes(i) || searching ? 'sidebar-folder active' : 'sidebar-folder'}>
                                            <span onClick={() => folderToggle(i)} className='sidebar-foldername'>
                                                <Icon size={'1x'} className='me-2' name={item.icon} /> {item.label}
                                                <span className='chevron'><Icon name={folderStatus.includes(i) || searching ? 'chevron-up' : 'chevron-down'} size={'sm'} /></span>
                                            </span>
                                            <div className='sidebar-subitems'>
                                                {item.items.map((subItem, j) => {
                                                    if(hiddenForLevel(subItem, userInfo.level)) {
                                                        //elemento nascosto
                                                        return (
                                                            <></>
                                                        )
                                                    }
                                                    else {
                                                        return (
                                                            <Link to={subItem.href ? subItem.href : ""} key={j} onClick={() => setSearch('')} className={isActivePage(subItem) ? 'sidebar-subitem active' : 'sidebar-subitem'}>
                                                                {subItem.label}
                                                            </Link>
                                                        )
                                                    }
                                                })}
                                            </div>
                                        </div>
                                    )
                                }
                            case 'divider':
                                return (
                                    <div key={i}>
                                        <hr />
                                    </div>
                                )
                            case 'header':
                                return (
                                    <div key={i} className='sidebar-header'>
                                        <span>{item.label}</span>
                                    </div>
                                )
                            default:
                                return (
                                    <div key={i}></div>
                                )
                        }
                    })}
                </div>

                {/* footer con l'utente: al click impostazioni, tema e logout */}
                <div className='sidebar-footer'>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type='button' id='sidebar-user' className='sidebar-user'>
                                <img className="sidebar-user-avatar" src={avatarSrc} alt="user pic" width={32} height={32} />
                                <span className='sidebar-user-info'>
                                    <span className='sidebar-user-name'>{userInfo.username}</span>
                                    <span className='sidebar-user-email'>{userInfo.email}</span>
                                </span>
                                <Icon name='chevron-up' size='sm' className='sidebar-user-chevron' />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="top" align="start" className='w-[232px]'>
                            {canViewAnalytics && (
                                <DropdownMenuItem asChild>
                                    <Link to="/analytics"><Icon name="chart-area" /> Analytics</Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem asChild>
                                <Link to="/settings"><Icon name="gear" /> {LanguageProvider.get('header.settings')}</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={toggleTheme}>
                                <Icon name={isDark ? 'sun' : 'moon'} /> {isDark ? 'Tema chiaro' : 'Tema scuro'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link to="/logout"><Icon name="right-from-bracket" /> {LanguageProvider.get('header.logout')}</Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        );
    }
};
