// "p" del marchio EsseBi in bianco: sta nel riquadro blu (--sidebar-primary) di sidebar e login
import logo from './logo.png';

export const settings = {
    "title": "EsseBi Presse Admin Console",
    "apiUrl": "https://api.essebipresse.it/api",
    "storageUrl": "https://api.essebipresse.it/",
    "googleMapKey": "inserire_chiave_valida",
    "config": {
        "limit": 100,
        "sortingField": 'id',
        "sortingOrder": 'desc'
    },
    "locale": {
        "currency": 'EUR',
        "country": 'it-IT'
    },
    "logo": logo,
    "modalDefaultSize": {
        delete: 'md',
        details: 'xl',
        entityCompiler: 'xl',
        entityConfig: 'lg',
        entityExport: 'md',
        entityImport: 'xl',
        entityViewer: 'xl',
        list: 'xl',
        listPicker: 'xl',
        picker: 'xl',
        viewFile: 'xl'
    },
    "modalFullscreen": {
        list: false,
        listPicker: false,
        picker: false
    },
    "debug": false,
    "advancedAnalytics": [0],
    /* Assistente AI (src/pages/ai): levels e adminLevels rispecchiano
       ai_assistant.levels / admin_levels del backend (la guardia vera);
       panel = pannello laterale e bottone in header; approveQueries =
       'user' | true | false. La voce di menu (/ai-assistant) e <WidgetAi />
       in Dashboard.js li aggiunge il progetto. */
    "aiAssistant": { "enabled": true, "levels": [0], "panel": false, "approveQueries": 'user', "adminLevels": [0] },
    "usingCache": true,
    /* colonne extra dell'entità user da mostrare nella tabella di /users
       (il livello è sempre visibile), es. ['phone', 'idUserGroup'] */
    "usersPageColumns": [],
    /* login personalizzata: nome di una cartella in src/config/nl_pages/<Nome>/index.js,
       mostrata su / al posto della login standard (vedi claude.md, "Custom login page") */
    // "loginPage": "Login",
}