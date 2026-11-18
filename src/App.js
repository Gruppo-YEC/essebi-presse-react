import React, { useState, useEffect } from 'react';
import './css/tailwind.css';
import './css/grid-compat.css';
import './css/style.css';
import './css/header.css';
import './css/sidebar.css';
import './css/searchbar.css';
import './css/fields.css';
import './config/custom.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/toast';


/** pages */
import LoginPage from './pages/login/page'; // Login standard o settings.loginPage
import Recover from './pages/login/recover';
import Reset from './pages/login/reset';
import Logout from './pages/user/logout';
import Settings from './pages/user/settings';
import NotFound from './pages/not_found';
import Home from './pages/index';
import License from './pages/license';
import Analytics from './pages/analytics/index';
import Entity from './pages/entity/index';
import EntityAdd from './pages/entity/add';
import EntityEdit from './pages/entity/edit';
import EntityClone from './pages/entity/clone';
import EntityItem from './pages/entity/item';
import Page from './pages/page/index';
import NlPage from './pages/nlpage/index'; //not-logged page
import Users from './pages/users/index';
import Resources from './pages/utils/resources';
import Schema from './pages/utils/schema';
import AiAssistant from './pages/ai';
import { AiProvider } from './pages/ai/AiProvider';
import AiPanel from './pages/ai/AiPanel';


/** core & components */
import { LoginManager } from './core/login-manager';
import { CacheManager } from './core/cache-manager';
import HeaderBlock from './components/BodyElements/HeaderBlock';
import ConnectionStatus from './components/BodyElements/ConnectionStatus';
import Loading from './components/BodyElements/Loading';
import VersionCheck from './components/BodyElements/VersionCheck';


import { Helmet } from 'react-helmet-async';
import { settings } from './config/settings';



function App() {

    const [ isLogged, setIsLogged ] = useState(null);


    useEffect(() => {
        async function init() {
            var response = await LoginManager.checkLogin()
            console.log('checkLogin', response)
            setIsLogged(response)

            if(response === true) {
                // Start periodic pulling when the module loads
                if (typeof window !== 'undefined') {
                    // Only start in browser environment
                    CacheManager.startPeriodicPull();
                    
                    // Clean up on page unload
                    window.addEventListener('beforeunload', () => {
                        CacheManager.stopPeriodicPull();
                    });
                }
            }
        }

        init()
        detectSidChange()
    }, []);

    async function detectSidChange() {
        var sessionId = LoginManager.registerChangeSid(async function () {
            var response = await LoginManager.checkLogin()
            console.log('CheckLogin after sid changed', response)
            setIsLogged(response)
        })
        console.log('--- SESSION ID ' + sessionId + ' ---')
    }



    if (isLogged === null) {
        return (
            <>
                <Loading />
                <ConnectionStatus />
            </>
        )
    }
    else if (isLogged === false) {
        return (
            <Router basename={'/'}>
                <Helmet>
                    <meta charSet="utf-8" />
                    <title>{settings.title}</title>
                    <meta name="description" content="React application" />
                </Helmet>
                <div id="ckd-framework-container">
                    <div id='app-container'>
                        <Routes>
                            <Route exact path='/' element={<LoginPage />} /> {/* default page */}
                            <Route path='/recover' element={<Recover />} />
                            <Route path='/reset' element={<Reset />} />
                            <Route path='/license' element={<License />} />
                            <Route path="/nl_page/:page" element={<NlPage />} />
                            <Route path="*" element={<NotFound />} /> {/* 404 page */}
                        </Routes>
                    </div>
                    <Toaster />
                    <ConnectionStatus />
                    <VersionCheck />
                </div>
            </Router>
        )
    }
    else {
        return (
            <Router basename={'/'}>
                <Helmet>
                    <meta charSet="utf-8" />
                    <title>{settings.title}</title>
                    <meta name="description" content="React application" />
                </Helmet>
                <AiProvider>
                <div id="ckd-framework-container">
                    <HeaderBlock />
                    <div id='column-container' className='sidebar-open'>
                        <div id='app-container'>
                            <Routes>
                                <Route exact path='/' element={<Home />} /> {/* default page */}
                                <Route path="*" element={<NotFound />} /> {/* 404 page */}
                                <Route path='/license' element={<License />} />
                                <Route path='/logout' element={<Logout />} />
                                <Route path='/settings' element={<Settings />} />
                                <Route path="/analytics" element={<Analytics />} />
                                <Route path="/entity/:entity" element={<Entity />} />
                                <Route path="/entity/:entity/add" element={<EntityAdd />} />
                                <Route path="/entity/:entity/edit" element={<EntityEdit />} />
                                <Route path="/entity/:entity/clone" element={<EntityClone />} />
                                <Route path="/entity/:entity/item" element={<EntityItem />} />
                                <Route path="/page/:page" element={<Page />} />
                                <Route path="/nl_page/:page" element={<NlPage />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/resources" element={<Resources />} />
                                <Route path="/schema" element={<Schema />} />
                                <Route path="/ai-assistant" element={<AiAssistant />} />
                            </Routes>
                        </div>
                    </div>
                    {/* Pannello laterale dell'assistente: si monta solo se settings.aiAssistant.panel */}
                    <AiPanel />
                    <Toaster />
                    <ConnectionStatus />
                    <VersionCheck />
                </div>
                </AiProvider>
            </Router>
        );
    }
}

export default App;