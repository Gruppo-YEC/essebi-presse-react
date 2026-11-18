import React, { useEffect, useState, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../ui/button';
import { LoginManager } from '../../../core/login-manager';
import Sidebar from '../Sidebar';
import HeaderHook from '../../../config/hooks/HeaderHook';
import HeaderTitle from '../HeaderTitle';
import Icon from '../Icon';
import AiHeaderButton from '../../../pages/ai/AiHeaderButton';


/**
 * Barra superiore minimale in stile shadcn: trigger della sidebar,
 * separatore e breadcrumb. Utente, tema e analytics vivono nel footer
 * della Sidebar.
 */
export default function HeaderBlock() {

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userInfo, setUserInfo] = useState(null);
    let location = useLocation();

    useEffect(() => {
        console.log('location: ', location)
        var element = document.getElementById("app-container");
        element.setAttribute("data-page", location.pathname);


        if(window.innerWidth < 992) {
            console.log('Mobile view, closing menu...', window.innerWidth)
            closeSidebar()
        }
    }, [location]);


    useLayoutEffect(() => {
        document.documentElement.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant", // Optional if you want to skip the scrolling animation
        });
    }, [location.pathname]);


    useEffect(() => {
        async function init() {
            var userInfo = LoginManager.getUserInfo()
            setUserInfo(userInfo)
        }
        init()
    }, []);


    useEffect(() => {
        if(userInfo !== null) {
            var element = document.getElementById("app-container");
            element.setAttribute("data-user-level", parseInt(userInfo.level));
        }
    }, [userInfo]);


    function toggleSidebar() {
        var element = document.getElementById("column-container");
        if (sidebarOpen === true) {
            element.classList.remove("sidebar-open");
        }
        else {
            element.classList.add("sidebar-open");
        }
        setSidebarOpen(!sidebarOpen)
    }

    function closeSidebar() { //use only for mobile on location change
        var element = document.getElementById("column-container");
        if (sidebarOpen === true) {
            element.classList.remove("sidebar-open");
        }
        setSidebarOpen(false)
    }



    if(userInfo) return (
        <>
            <header id="header-navbar" className="sticky top-0 z-[1020] bg-background">
                <div className="flex h-full items-center gap-2 px-3" id="header-menu" data-sidebar={sidebarOpen}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleSidebar} title="Toggle sidebar">
                        <Icon name="bars" />
                    </Button>
                    <div className="mx-1 h-4 w-px bg-border" />
                    <HeaderTitle />
                    <div className="ms-auto flex items-center gap-2">
                        <HeaderHook />
                        <AiHeaderButton />
                    </div>
                </div>
            </header>
            <Sidebar open={sidebarOpen} userInfo={userInfo} />
        </>
    );
};
