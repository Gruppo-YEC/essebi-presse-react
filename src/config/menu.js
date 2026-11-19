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
        "label": 'Catalogo'
    },
    {
        "type": 'item',
        "href": '/entity/item_model',
        "icon": 'boxes-stacked',
        "entity": 'item_model',
        "label": 'Articoli'
    },
    // Pagine custom del catalogo: gestione rapida con trascinamento e modali.
    // L'Editor articolo non sta nel menu: si apre da Articoli ("Crea nuovo" e "Editor" di riga)
    {
        "type": 'item',
        "href": '/page/CatalogoCategorie',
        "icon": 'folder-tree',
        "entity": 'item_technical_category',
        "label": 'Gestione categorie'
    },
    {
        "type": 'item',
        "href": '/page/CatalogoAttributi',
        "icon": 'list-check',
        "entity": 'item_attribute_definition',
        "label": 'Gestione attributi'
    },
    {
        "type": 'item',
        "href": '/entity/brand',
        "icon": 'trademark',
        "entity": 'brand',
        "label": 'Marchi'
    },
    {
        "type": 'folder',
        "href": '#',
        "icon": 'sitemap',
        "entity": '',
        "label": 'Configurazione',
        "items": [
            {
                "type": 'item',
                "href": '/entity/item_goods_category',
                "entity": 'item_goods_category',
                "label": 'Categorie merceologiche'
            },
            {
                "type": 'item',
                "href": '/entity/item_technical_category',
                "entity": 'item_technical_category',
                "label": 'Categorie tecniche'
            },
            {
                "type": 'item',
                "href": '/entity/item_technical_type',
                "entity": 'item_technical_type',
                "label": 'Tipologie'
            },
            {
                "type": 'item',
                "href": '/entity/item_attribute_definition',
                "icon": 'sliders',
                "entity": 'item_attribute_definition',
                "label": 'Attributi'
            },
        ]
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