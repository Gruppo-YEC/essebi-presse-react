import React, { useEffect, useState } from 'react';
import { DataManager } from '../core/data-manager';
import { LoginManager } from '../core/login-manager';
import { LanguageProvider } from '../core/language-provider';
import WidgetAi from '../pages/ai/WidgetAi';


export default function Dashboard() {

    const [errors, setErrors] = useState('');
    const [data, setData] = useState(null);

    useEffect(() => {
        async function init() {
            var userInfo = LoginManager.getUserInfo()

        }
        init()

    }, []);



    return (
        <>
            {/* Widget salvati dall'assistente AI (per utente): non mostra nulla se non ce ne sono. */}
            <WidgetAi />
        </>
    )
};
