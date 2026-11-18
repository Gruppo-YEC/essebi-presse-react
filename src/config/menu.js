export const menu = [
    {
        "type": 'header',
        "href": '#',
        "icon": '',
        "entity": '',
        "label": 'Pagine'
    },
    {
        "type": 'item',
        "href": '/',
        "icon": 'home',
        "entity": '',
        "label": 'Dashboard'
    },

    {
        "type": 'header',
        "href": '#',
        "icon": '',
        "entity": '',
        "label": 'Utente'
    },
    {
        "type": 'item',
        "href": '/settings',
        "icon": 'user-gear',
        "entity": '',
        "label": 'Profilo'
    },
    {
        "type": 'folder',
        "href": '#',
        "icon": 'cogs',
        "entity": '',
        "label": 'Impostazioni',
        "items": [
            {
                "type": 'item',
                "href": '/users',
                "entity": 'user',
                "label": 'Utenti'
            },
            {
                "type": 'item',
                "href": '/entity/user_group',
                "entity": 'user_group',
                "label": 'Gruppi'
            },
        ]
    },
    {
        "type": 'item',
        "href": '/logout',
        "icon": 'arrow-right-from-bracket',
        "entity": '',
        "label": 'Logout'
    }
]