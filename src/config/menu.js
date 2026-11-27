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
        "label": 'Contatti'
    },
    // Lead dai form del sito (o inseriti a mano) e i log di form ed email (27/11/2026)
    {
        "type": 'item',
        "href": '/entity/leads',
        "icon": 'address-book',
        "entity": 'leads',
        "label": 'Lead'
    },
    {
        "type": 'item',
        "href": '/entity/form_log',
        "icon": 'file-lines',
        "entity": 'form_log',
        "label": 'Log form'
    },
    {
        "type": 'item',
        "href": '/entity/email_log',
        "icon": 'envelope-circle-check',
        "entity": 'email_log',
        "label": 'Log email'
    },

    {
        "type": 'header',
        "href": '#',
        "icon": '',
        "entity": '',
        "label": 'Sito'
    },
    // Barra annunci in cima al sito (tabella site_announcement): il sito mostra la più recente
    // attiva ed entro le date
    {
        "type": 'item',
        "href": '/entity/site_announcement',
        "icon": 'bullhorn',
        "entity": 'site_announcement',
        "label": 'Barra annunci'
    },
    // Impostazioni del sito (tabella site_meta, chiave → testo): email amministratore e
    // versione. Pagina custom con controlli e anteprima (27/11/2026)
    {
        "type": 'item',
        "href": '/page/SiteMeta',
        "icon": 'sliders',
        "entity": 'site_meta',
        "label": 'Impostazioni sito'
    },
    // News ed eventi del sito: elenco, editor e categorie in una pagina custom (27/11/2026)
    {
        "type": 'item',
        "href": '/page/News',
        "icon": 'newspaper',
        "entity": 'posts',
        "label": 'News ed eventi'
    },
    // Cataloghi per gamma (tabella catalog): testo, loghi e PDF scaricabili. Un record per
    // gamma: il nome è univoco (uniqueFields.js) (27/11/2026)
    {
        "type": 'item',
        "href": '/entity/catalog',
        "icon": 'book-open',
        "entity": 'catalog',
        "label": 'Cataloghi'
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