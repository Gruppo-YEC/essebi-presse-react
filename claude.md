# CKD Framework - Frontend Guide

## Framework Overview

CKD Framework is a **configuration-driven full-stack application framework**. The frontend is a React SPA that auto-generates UI components from backend configuration.

### Architecture
- **Backend**: PHP + MySQL with auto-generated APIs (uses PDO)
- **Frontend**: React SPA with auto-generated UI components, built with **Vite**
- **Styling**: **Tailwind CSS v4** + shadcn-style components vendored in `src/components/ui/` (Radix UI primitives via the consolidated `radix-ui` package). Bootstrap and react-bootstrap are gone.
- **Configuration**: JSON-based entity and permission definitions
- **Philosophy**: Configure, don't code (custom logic only when necessary)

### Version numbers

`public/version.json` holds `MAJOR.MINOR.PATCH`. The first two parts belong to
the framework and change only when the template is aligned into the project
(`3.2.x` → `3.3.0`). The last part belongs to the project: developers who
change `src/config/` bump only that one (`3.3.0` → `3.3.1`) to mark their own
releases. An alignment overwrites the file, so the project counter restarts
from `.0` at every framework release.

### Where the entities actually come from

The frontend does not define entities: it renders whatever the backend declares.
Both live in the **backend** repo of the same project, next to this one:

| What | Where | Notes |
|---|---|---|
| Entities, columns, field types, permissions | `<backend>/config/tables.json` | The single source of truth. Adding a field here is enough to make it appear in the UI |
| Domain, database, mail, API keys, storage | `<backend>/config/settings.json` | |
| **Full framework documentation** | `<backend>/docs/CLAUDE.md` | Field types with all their options, permission system, hooks, every API endpoint |

So when a field renders wrong or an endpoint is missing, the answer is almost
always in `tables.json`, not in this repo. Read `<backend>/docs/CLAUDE.md`
before changing anything here.

**Field types** available in `tables.json`, all rendered by
`src/components/Entity/Field`: `string`, `text`, `richText`, `markdown`,
`code`, `email`, `phone`, `address`, `color`, `password`, `number`, `float`,
`currency`, `boolean`, `option`, `date`, `datetime`, `time`, `file`,
`externalEntity`, `deepExternalEntity`, `multipleExternalEntity`. Each one's
options are documented in the backend guide; only `markdown` needs frontend
notes, see below.

### Commands
| Command | Purpose |
|---|---|
| `npm start` / `npm run dev` | Dev server on `http://localhost:3000` |
| `npm run build` | Production build into `build/` |
| `npm run preview` | Serve the production build locally |

---

## Project Structure (Frontend)

```
index.html                     # ⚠️ Entry HTML (project-owned: title and favicon)
vite.config.mjs                # 🚫 DO NOT MODIFY
.nvmrc                         # 🚫 DO NOT MODIFY (Node 22)
src/
├── index.js, App.js           # 🚫 DO NOT MODIFY
├── assets/                    # ✅ project images
├── components/                # 🚫 DO NOT MODIFY
│   ├── BodyElements/Icon/     #    Icon component — use it for every icon
│   └── ui/                    #    shadcn-style components (Button, Dialog, toast, …) — importable from custom pages
├── core/                      # 🚫 DO NOT MODIFY (data-manager, api-manager, resource-manager, login-manager, …)
├── css/                       # 🚫 DO NOT MODIFY (tailwind.css holds the design tokens)
├── pages/                     # 🚫 DO NOT MODIFY
└── config/                    # ✅ ONLY MODIFY HERE
    ├── settings.js            # App configuration (apiUrl, storageUrl, title, locale, level gates)
    ├── menu.js                # Navigation structure
    ├── entity_language.js     # Internationalization labels
    ├── Dashboard.js           # Component rendered at /
    ├── custom.css             # Project CSS and design-token overrides
    ├── logo.svg, login.jpg    # Brand assets referenced by settings.js
    ├── pages/                 # Custom authenticated pages → /page/<Name>
    │   └── MyPage/
    │       ├── index.js       # Page component (folder + index.js layout is required)
    │       └── style.css      # Page-scoped styles
    ├── nl_pages/              # Custom public pages → /nl_page/<Name> (no auth); one can replace the login (settings.loginPage)
    └── hooks/                 # Business logic and UI injection hooks
        ├── preInsert.js, onInsert.js, preUpdate.js, onUpdate.js, preDelete.js, onDelete.js
        ├── actions.js         # Row dropdown / detail modal actions
        ├── customFilters.js   # Named constraint sets for externalEntity pickers
        └── *Hook.js           # UI injection points (see Hook System)
```

### Routes

```
/                          -> Dashboard (src/config/Dashboard.js)
/ (not logged)             -> Login, or src/config/nl_pages/<settings.loginPage> (see Custom Login Page)
/recover, /reset           -> Password recovery
/entity/:entity            -> Entity list (auto-generated CRUD)
/entity/:entity/add        -> Create new
/entity/:entity/edit?id=X  -> Edit
/entity/:entity/clone?id=X -> Clone
/entity/:entity/item?id=X  -> Detail view
/page/:page                -> Custom page (config/pages/)
/nl_page/:page             -> Public page (config/nl_pages/, no auth)
/settings                  -> Own profile and password
/users                     -> User administration
/resources                 -> File manager
/analytics                 -> Analytics (levels in settings.advancedAnalytics)
/schema                    -> Entity schema browser
/ai-assistant              -> AI assistant, full page (settings.aiAssistant, see below)
/logout
```

---

### AI assistant (`src/pages/ai/`)

Framework code, one folder. The backend guide (`<backend>/docs/CLAUDE.md`,
"AI Assistant") has the endpoints, the security model and the configuration;
this is the browser side.

| File | Role |
|---|---|
| `index.js` | full page, route `/ai-assistant`: conversation sidebar, chat, admin panel |
| `AiPanel.js`, `AiHeaderButton.js` | side panel on every page and the header button that toggles it |
| `AiProvider.js` | the ONE shared state (mounted in `App.js` above the routes): messages, history, review, attachments, panel, form opened by the assistant; a conversation survives navigation |
| `aiClient.js` | the agentic loop in the browser: `message` → tools → `message`; every server tool is one request; also export, feedback, admin and config helpers |
| `ChatThread.js` | thread, composer, review card, query log, feedback bar, save-widget dialog |
| `pageContext.js` | route, entity, id, custom page + menu and entity labels from `src/config`, sent with every call |
| `uiTools.js` | `ui_navigate`, `ui_open_record`, `ui_open_form`: actions the model asks for, executed here with the router. `ui_open_form` navigates to the standard add/edit **page** with the form prefilled via router state (`state.body`, read by `add.js` and `edit.js`), never a modal or an in-chat form; saving is always the user's click |
| `chatMarkdown.js` | escaped markdown renderer for answers; internal links go through the router |
| `charts.js`, `ChartBlock.js` | ```` ```chart ```` JSON blocks in answers → Chart.js (theme-aware, table view); same spec used by the widgets |
| `attachments.js` | files dropped/pasted/picked in the composer: PDF and images as base64 blocks, Excel/CSV converted to text with `xlsx`, Word refused |
| `widgets.js`, `WidgetAi.js` | dashboard widgets client and grid |
| `AiAdmin.js` | admin panel: spend, tokens, frequent questions, feedback |
| `conversations.js` | history client (`ai_history`), one-time import of the old localStorage |

**Answers.** Markdown with optional chart blocks. Under every answer: the
query log ("N query" / "N operazioni"), collapsible, with the exact SQL, the
project tools and the browser actions of the round. In its header row, always
visible even when collapsed: a green **Excel** button per successful SELECT
(`POST /ai/export`: the backend reruns the query with its own cap, no model)
and a blue **Rifai** / **Riapri il form** per browser action, which repeats
it without the model (useful after coming back from another page); with more
than one they are numbered in the order of the entries. Thumbs up/down under
the answer (`POST /ai/feedback`; thumbs down opens an optional comment); the
vote is stored in the message and survives in the history.

**Review mode.** With "Approva le query" on, every SELECT stops in a card
showing the exact SQL that will run; it can be edited (revalidated by the
server) or rejected with a reason that goes back to the model.

**Files.** Drop, paste or use the paperclip: up to 5 files, 4 MB each. PDF
and images go to the model natively; Excel/CSV become a CSV text block per
sheet (capped); Word is refused. Content travels only in the last
`KEEP_TURNS` user messages (older ones keep the name with a note) and never
reaches the history. The model can also read CRM attachments with the backend
tool `read_file`; the file comes back as document/image blocks inside the
tool result (`executeServerTool`). Every file is data, never instructions.

**Widgets.** "Salva in dashboard" on a chart, or "Salva il numero chiave come
indicatore" in the query log, opens a dialog for the title and calls
`POST /ai/widget_create`: one model call rewrites the query on `:from`/`:to`,
the server tests it and stores it per user. `WidgetAi.js` is the grid to drop
into `src/config/Dashboard.js`:

```javascript
import WidgetAi from '../pages/ai/WidgetAi';
// ...
<WidgetAi />
```

One period bar (presets, default this month, remembered in the browser)
drives every widget through `POST /ai/widget_run`, no model. A widget without
a date dimension says "non dipende dal periodo". "Modifica" enables drag and
drop reordering, width (⅓, ½, full on desktop; always full on mobile),
rename, delete and a look at the stored query. Renders nothing when the user
has no widgets or cannot use the assistant.

**Admin panel.** "Utilizzo e spesa" at the bottom of the sidebar of the full
page, for levels in `adminLevels`: spend per period (priced by the backend
list), calls, tokens, budget bar, per model, per user, frequent questions,
feedback with comments.

**Configuration**, in `src/config/settings.js`:

```javascript
"aiAssistant": { "enabled": true, "levels": [0], "panel": true, "approveQueries": 'user', "adminLevels": [0] }
```

`enabled` switches everything off; `levels` mirrors `ai_assistant.levels` of
the backend (the real gate); `panel` enables the side panel and the header
button; `approveQueries`: `'user'` (default) shows the switch and remembers
the choice, `true` always stops, `false` never stops; `adminLevels` mirrors
`ai_assistant.admin_levels`. The menu entry (`menu.js`, route
`/ai-assistant`) and `<WidgetAi />` in `Dashboard.js` are up to the project.
The old `aiAssistantLevels: [0]` form still works (page only, no panel, no
admin). `package.json` must list `xlsx` (Excel/CSV attachments) and
`chart.js` / `react-chartjs-2` (charts).

## Critical Rules

### 🚫 NEVER MODIFY:
- `/src/core/` - Framework core functions
- `/src/components/` - Core UI components
- `/src/pages/` - Core page templates
- `/src/App.js` - Main application router
- `/src/index.js` - Application entry point
- `/vite.config.mjs` - Build configuration

### ✅ ONLY MODIFY:
- `/src/config/settings.js` - App configuration
- `/src/config/menu.js` - Navigation menu
- `/src/config/entity_language.js` - Labels and translations
- `/src/config/pages/` - Custom pages
- `/src/config/hooks/` - Business logic hooks
- `/index.html` - Only for the page `<title>` and the favicon

### JSX in `.js` files
The framework writes JSX inside `.js` files (not `.jsx`). `vite.config.mjs` configures esbuild
accordingly, so custom pages can keep using `.js`. Do not rename files to `.jsx`.

### Icons
Always use the framework `Icon` component. Never import `FontAwesomeIcon` or single icon
definitions: `Icon` is the only place FontAwesome is touched, and it registers the whole solid
set once.

```javascript
import Icon from '../../components/BodyElements/Icon';   // adjust the relative path

<Icon name="trash" />
<Icon name="spinner" spin className='me-2' />
<Icon name={isOpen ? 'chevron-up' : 'chevron-down'} />
```

Any other prop (`className`, `size`, `color`, `style`, `spin`, `onClick`…) is forwarded to
FontAwesome untouched.

Names are the **FontAwesome 7** ones. The version 5 aliases no longer exist, so use
`house` not `home`, `xmark` not `times`, `pen-to-square` not `edit`, `gear` not `cog`,
`magnifying-glass` not `search`, `floppy-disk` not `save`, `circle-info` not `info-circle`.
Browse the names at https://fontawesome.com/search?o=r&m=free

### Environment variables
Vite exposes only variables prefixed with `VITE_`, via `import.meta.env.VITE_MY_VAR`
(`process.env.REACT_APP_*` no longer exists). Prefer `src/config/settings.js` for configuration.

### Styling: Tailwind CSS v4 + shadcn-style components

Bootstrap has been removed. Styling works on two levels:

1. **Tailwind utility classes** everywhere in JSX (`flex`, `gap-2`, `text-sm`,
   `text-muted-foreground`, `grid grid-cols-2`, …).
2. **UI components** in `src/components/ui/` — shadcn-style, vendored in the
   repo (no runtime dependency on shadcn). They are built on Radix primitives
   (`radix-ui` package) and Tailwind:

   | Component | File | Notes |
   |---|---|---|
   | `Button` | `ui/button.js` | variants keep the historical names: `primary`, `secondary`, `success`, `danger`, `warning`, `info`, `light`, `dark`, `outline-*`, `ghost`, `link`; sizes `sm`/`default`/`lg`; `asChild` for links |
   | `Badge` | `ui/badge.js` | `variant` with the same color names, `pill` |
   | `Alert`, `AlertHeading` | `ui/alert.js` | colored subtle variants |
   | `Card`, `CardHeader`, `CardTitle`, `CardBody`, `CardFooter` | `ui/card.js` | flat, no shadow |
   | `Input`, `Textarea`, `Select` (native), `Label`, `FloatingInput` | `ui/*.js` | `size="sm"`/`"lg"` |
   | `Select*` (Radix) | `ui/select-dropdown.js` | dropdown shadcn con check e typeahead: è quella dei campi `option`; `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` |
   | `Attachment` | `ui/attachment.js` | tile per file caricati: thumbnail o icona per estensione, nome, azioni; è come il campo `file` mostra il valore |
   | `DatePicker`, `Calendar` | `ui/date-picker.js`, `ui/calendar.js` | input in cui la data si scrive direttamente (`12/03/2024`, `12032024`, `1/3/24`…) + bottone che apre il calendario (react-day-picker, tendine mese/anno per saltare tra gli anni); lavora su stringhe `YYYY-MM-DD`; usato dai campi `date` e dai filtri data (colonna e SearchPro) |
   | `Checkbox`, `CheckField`, `Switch`, `SwitchField` | `ui/checkbox.js`, `ui/switch.js` | Radix; `checked` + `onCheckedChange` |
   | `InputGroup`, `InputGroupText` | `ui/input-group.js` | attached controls row |
   | `Dialog*` | `ui/dialog.js` | centered, above sidebar/header; top-right X (`hideClose` to remove it) plus footer buttons. `size`: `sm`/`md`/`lg`/`xl`/`fullscreen` |
   | `DropdownMenu*` | `ui/dropdown-menu.js` | action menus |
   | `Popover*` | `ui/popover.js` | anchored panels that contain forms |
   | `Tabs*` | `ui/tabs.js` | shadcn pill style |
   | `Table` | `ui/table.js` | `striped`, `hover`, `responsive`, `size="sm"` |
   | `Pagination*` | `ui/pagination.js` | ghost buttons, chevrons |
   | `Tooltip`, `SimpleTooltip` | `ui/tooltip.js` | |
   | `Combobox`, `MultiCombobox` | `ui/combobox.js` | searchable select (Popover + cmdk); `onSearchChange` for server-side search (externalEntity), `MultiCombobox` returns the array of values |
   | `Command*` | `ui/command.js` | cmdk primitives, used by the Combobox |
   | `Spinner` | `ui/spinner.js` | |
   | `toast`, `Toaster` | `ui/toast.js` | imperative API: `toast.success/error/info/warning/loading/update`. `<Toaster />` is already mounted by App.js |

   ```javascript
   import { Button } from '../../../components/ui/button';
   import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../../components/ui/dialog';
   import { toast } from '../../../components/ui/toast';
   ```

**Design tokens** live in `src/css/tailwind.css` (`--primary`, `--background`,
`--radius`, `--sidebar*`, …): re-branding a project means overriding those
variables, not the components. **Never edit `tailwind.css` in a project**: it
is framework-owned and the next alignment replaces it. Override the tokens
from `src/config/custom.css` instead (imported after, so it wins):

```css
:root,
.dark-theme-active {
    --sidebar: #e67e22;
    --sidebar-foreground: #ffffff;
}
```

Dark mode is class-based (`dark-theme-active` on `<html>`, toggled from the
sidebar user menu) and every token has a dark value.

**Bootstrap grid compatibility**: `src/css/grid-compat.css` keeps `.row` and
`.col-*` working because the `className` option of fields in `tables.json`
historically contains classes like `col-md-6 col-lg-4`. Use Tailwind
`grid`/`flex` for new code.

### Importing from node_modules in Sass
Use bare specifiers, without the webpack `~` prefix:
```scss
@import 'some-lib/styles';    /* ✅ */
@import '~some-lib/styles';   /* ❌ */
```

### The `markdown` field type

`input_type: "markdown"` renders `Fields/Markdown`: a plain-text editor with
keyboard shortcuts and a live preview. **What is typed is exactly what is
stored** — no HTML, no conversion.

Use it instead of `richText` whenever the stored value is consumed by something
other than a browser, typically a language model. `richText` stores TinyMCE HTML,
which then has to be converted before use, and the conversion loses information:
emphasis and inline-code markers get flattened, so the author no longer sees what
the consumer actually receives.

```json
"instructions": {
  "type": "TEXT",
  "length": null,
  "input_type": "markdown",
  "null": true,
  "options": { "visible": false, "editable": true, "rows": 24 },
  "validation": { "required": false, "min": null, "max": null }
}
```

`options.rows` sets the textarea height (default 18). The column type is `TEXT`,
the same as `richText`, so switching between the two needs no database change.

Supported syntax: headings, `**bold**`, `*italic*`, `` `code` ``, bullet and
numbered lists, `> quotes`, `---`, links and bare URLs. `Ctrl/Cmd+B`, `+I` and
`+K` apply bold, italic and link; `Tab` indents; `Enter` continues a list.

The preview escapes the text before rendering, and only `http`, `https` and
`mailto` links are produced — the value comes from the database and must not
become active markup.

### CSS Scoping
When creating custom page styles, **always scope CSS to the page container class** to avoid overriding system styles:
```css
/* ✅ CORRECT - Scoped to page */
.my-page .btn { ... }
.my-page .card { ... }

/* ❌ WRONG - Overrides global styles */
.btn { ... }
.card { ... }
```

---

## Core Functions

### DataManager - CRUD Operations
```javascript
import { DataManager } from '../core/data-manager';

// Get paginated list
const response = await DataManager.getItems(
  'entity_name',
  1,                              // page
  20,                             // limit
  { field: 'id', order: 'DESC' }  // sorting
);

// sorting accetta anche un ARRAY per l'ordinamento multi-colonna
// (nel datagrid si compone con shift+click sulle intestazioni):
// [{ field: 'id', order: 'DESC' }, { field: 'date', order: 'ASC' }]

// Get single item
const item = await DataManager.getItem('entity_name', 123);

// Create new item
const newItem = await DataManager.insertItem('entity_name', {
  name: 'New Item',
  description: 'Description'
});

// Update existing item
const updated = await DataManager.updateItem('entity_name', {
  name: 'Updated Name'
}, 123);

// Delete item (soft delete)
const deleted = await DataManager.deleteItem('entity_name', 123);

// Advanced search with constraints
const results = await DataManager.searchItems(
  'entity_name',
  1,                                    // page
  20,                                   // limit
  { field: 'name', order: 'ASC' },      // sorting
  'search term',                        // query string
  ['name', 'description'],              // fields to search
  constraints                           // array of constraint objects
);
```

### Search Constraints Format
Constraints are an **array of objects** with `fieldName`, `type`, and `value`:

```javascript
const constraints = [
  {
    fieldName: 'status',
    type: 'value',
    value: 'active'
  },
  {
    fieldName: 'date',
    type: 'range',
    min: '2024-01-01',
    max: '2024-12-31',
    range_type: 'STR'
  },
  {
    fieldName: 'idCategory',
    type: 'in',
    value: '1,3,5'
  }
];
```

#### Available Constraint Types:
| Type | Description | Use Case |
|------|-------------|----------|
| `value` | Equal to | Exact match |
| `different_from_value` | Not equal to | Exclusion |
| `like` | Contains (strings) | Partial text search |
| `start` | Starts with | Prefix search |
| `end` | Ends with | Suffix search |
| `greater` | Greater than | Dates, numbers |
| `minor` | Less than | Dates, numbers |
| `range` | Between `min` and `max` (no `value`; optional `range_type` `STR`/`INT`) | Date and number ranges |
| `in` | In a comma-separated STRING, not an array | `value: "a,b,c"` |
| `not_in` | Not in a comma-separated STRING | `value: "a,b,c"` |
| `in_ext` | Only on `multipleExternalEntity` fields: rows linked to any of the ids | `value: "1,2"` |
| `isnull` | Is null | Empty check |

### URL delle pagine entity

Le pagine `/entity/<nome>` tengono lo stato in query string **leggibile**
(i default sono omessi); utile per link da pagine custom o azioni:

```
/entity/customer?query=rossi&page=2&limit=50&sort=name asc, id desc
/entity/customer?f=status:value:active&f=date:range:2024-01-01..2024-12-31
/entity/customer?f=notes:isnull&f=idGroup:in:1,3,5
```

`sort` è una lista `campo [asc|desc]` separata da virgole (multi-sort).
Ogni filtro è un parametro `f` ripetuto nel formato `campo:condizione:valore`
(le condizioni sono i constraint types di `searchItems`; range =
`campo:range:min..max`, isnull senza valore). Nel datagrid il multi-sort si
compone con **shift+click** sulle intestazioni di colonna; la freccetta mostra
verso e priorità e cliccarla inverte il verso. Il checkbox sull'intestazione
della colonna di selezione seleziona/deseleziona tutte le righe della pagina.

### ResourceManager - File Operations
```javascript
import { ResourceManager } from '../core/resource-manager';

// Upload base64 file
const uploadResult = await ResourceManager.uploadBase64(
  'data:image/png;base64,...',
  'image.png',
  'entity_name'
);

// Get file URL for display
const fileUrl = ResourceManager.getFileUrl(
  { hash: 'abc123', extension: 'jpg' },
  'entity_name'
);
```

### ApiManager - HTTP Client
```javascript
import { ApiManager } from '../core/api-manager';

// Authenticated request (adds Bearer token)
const response = await ApiManager.sendAuthenticatedRequest('/custom/my_action', {
  param1: 'value1',
  param2: 'value2'
});

// Public request (no authentication)
const publicResponse = await ApiManager.sendRequest('/public/public_action', {
  data: 'value'
});
```

**IMPORTANT**: The endpoint path format is `/custom/action_name` or `/public/action_name`. The action is part of the URL, NOT a body parameter.

---

## Backend API Reference

### Standard Endpoints (Auto-Generated)
| Endpoint | Purpose |
|----------|---------|
| `POST /get_items/{entity}` | List items with pagination |
| `POST /get_item/{entity}` | Get single item by ID |
| `POST /post/{entity}` | Create or update item |
| `POST /delete/{entity}` | Soft delete item |
| `POST /search_items/{entity}` | Advanced search |
| `POST /get_items_simple/{entity}` | Same as `get_items`, without nested child entities |
| `POST /get_item_simple/{entity}` | Same as `get_item`, without nested child entities |
| `POST /search_items_simple/{entity}` | Same as `search_items`, without nested child entities |

The `_simple` variants skip the recursive resolution of related entities: same
request and response shape, minus the nested objects, and much faster on large
datasets. Use them whenever the related entities are not needed.

### Other endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /resource/uploadFile` · `POST /resource/getFile` | Files — use `ResourceManager`, see below |
| `POST /account/updateProfile` · `POST /account/updatePassword` | Logged user's own profile and password |
| `POST /users/{action}` | User administration (`enable`, `disable`, `edit`) |
| `POST /external_api/{action}` | Server-side proxy for Google Maps, so the API key stays on the backend |
| `POST /utils/{action}` | Import/export and entity dependency info, used by the framework's own pages |
| `POST /analytics/{action}` | Analytics dashboard data |
| `POST /ai/{action}` | AI assistant (`src/pages/ai/`): `message`, `tool`, `export`, `feedback`, `admin_stats`, `widget_*`, `history_*` — one model call or one tool per request; config and security in the backend guide |

### Custom Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /custom/{action}` | Authenticated custom API |
| `POST /public/{action}` | Public custom API |

### Authentication Endpoints
| Endpoint | Purpose |
|----------|---------|
| `POST /auth/login` | Login |
| `POST /auth/checkLogin` | Validate session |
| `POST /auth/logout` | Logout |
| `POST /auth/forgot` | Password recovery |
| `POST /auth/reset` | Reset password |

---

## Menu Configuration

**File:** `src/config/menu.js`

```javascript
export const menu = [
  {
    type: 'item',
    href: '/',
    icon: 'home',
    entity: '',
    label: 'Dashboard'
  },
  {
    type: 'divider'
  },
  {
    type: 'item',
    href: '/entity/my_entity',
    icon: 'list',
    entity: 'my_entity',
    label: 'My Entity',
    hideForLevel: [1]        // Hide for user level 1
  },
  {
    type: 'item',
    href: '/page/MyCustomPage',  // Custom page route
    icon: 'chart-line',
    entity: '',
    label: 'Custom Page'
  },
  {
    type: 'folder',
    href: '#',
    icon: 'gear',
    label: 'Settings',
    items: [
      {
        type: 'item',
        href: '/entity/user',
        entity: 'user',
        label: 'Users'
      }
    ]
  }
];
```

---

## Language Configuration

**File:** `src/config/entity_language.js`

```javascript
export const entity_language = {
  entity: {
    user: 'Users',
    my_entity: 'My Entity'
  },
  labels: {
    "my_entity": {
      "id": 'ID',
      "name": 'Name',
      "status": 'Status',
      "status.options.active": 'Active',
      "status.options.inactive": 'Inactive'
    }
  }
};
```

---

## Custom Pages

### Layout: same margins and spacing as standard pages

Unless the request explicitly asks for a different layout, a custom page
must look like it belongs next to the entity pages, Settings, Analytics and
Resources. The rules:

- **No wrapper of your own.** The core already renders every custom page
  inside `<div className='mb-4 mt-4 w-full px-3'>` (`src/pages/page/index.js`),
  the same wrapper the standard pages use. Do not add `container`, `px-*`,
  `py-*`, `mt-*`/`mb-*` or a `max-width` on the page root: the margins would
  no longer match the rest of the panel.
- **Header row** as in every standard page:
  `<div className='mb-3 flex flex-wrap items-center justify-between gap-3'>`
  with `<h3 className='mb-0'>` on the left and the page actions on the right
  (filters, `size='sm'` buttons). No centered titles, no `h2`.
- **Content** built from `src/components/ui`: `Card`/`CardBody` for blocks,
  `Panel`/`PanelRow`/`Stat` from `ui/panel` for property lists and KPIs,
  tables inside a `Card` with `p-0`. Spacing between blocks `gap-3`/`gap-4`,
  `mt-3`/`mt-4`.
- **Text scale**: section titles `text-sm font-medium`, helper text
  `text-xs text-muted-foreground`. Colors only through theme tokens
  (`text-muted-foreground`, `bg-muted/40`, `border-border`), never hex codes,
  so the page follows the dark theme by itself.

Ask before deviating (full-height layouts like the AI assistant, dashboards,
print views). "Make it look nice" is not a request for a different layout.

### Creating a Custom Page

1. **Create folder and component:**
   ```
   src/config/pages/MyPage/
   ├── index.js      # Main component
   └── style.css     # Page-scoped styles
   ```

2. **Component template:**
   ```javascript
   // src/config/pages/MyPage/index.js
   import React, { useState, useEffect } from 'react';
   import { Card, CardBody } from '../../../components/ui/card';
   import { DataManager } from '../../../core/data-manager';
   import './style.css';

   export default function MyPage() {
     const [data, setData] = useState([]);
     const [loading, setLoading] = useState(false);

     useEffect(() => {
       loadData();
     }, []);

     const loadData = async () => {
       setLoading(true);
       try {
         const response = await DataManager.getItems('entity', 1, 100, {
           field: 'id',
           order: 'DESC'
         });
         if (response.success === 1) {
           setData(response.body || []);
         }
       } catch (error) {
         console.error('Error:', error);
       } finally {
         setLoading(false);
       }
     };

     // Il core avvolge già la pagina con gli stessi margini delle pagine entity
     // (mt-4 mb-4 w-full px-3): niente padding né container qui, o i margini
     // non combaciano con il resto del pannello.
     return (
       <div className="my-page">
         {/* Header row as in every standard page: title left, actions right */}
         <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
           <h3 className="mb-0">My Custom Page</h3>
         </div>
         <Card>
           <CardBody>
             {/* Page content: Tailwind classes + src/components/ui */}
           </CardBody>
         </Card>
       </div>
     );
   }
   ```

3. **Scoped CSS:**
   ```css
   /* src/config/pages/MyPage/style.css */
   .my-page {
     /* Page container styles */
   }

   .my-page .card {
     /* Card styles only for this page */
   }

   .my-page .btn {
     /* Button styles only for this page */
   }
   ```

4. **Add to menu:**
   ```javascript
   {
     type: 'item',
     href: '/page/MyPage',
     icon: 'chart-line',
     entity: '',
     label: 'My Page'
   }
   ```

5. **Access URL:** `/page/MyPage`

---

## Custom Login Page

A project can replace the standard login with its own page without touching
the core. In `src/config/settings.js`:

```javascript
"loginPage": "Login",   // src/config/nl_pages/Login/index.js
```

- The page is shown **at `/`** to users who are not logged in, full screen
  (no `NlPage` wrapper: the page owns its whole layout). There is no redirect
  to `/nl_page/...`, so logout, NotFound and the deeplink saved before login
  keep working unchanged.
- Fallback: if `loginPage` is not set, the folder does not exist or the import
  fails, the standard login is shown (with a `console.warn` in the last two
  cases). Projects that do not set the option see no difference.
- `/recover`, `/reset`, `/license` and `/nl_page/:page` stay as they are.
  Link the password recovery with react-router's `<Link to='/recover'>`.

### Contract for the custom page

- **Authenticate** with `LoginManager.login(username, password, 1)`. If the
  response has `success === 0`, show `response.message`. On success **do
  nothing**: no `navigate`, no reload. The framework switches to the logged-in
  router by itself and `/` becomes the Dashboard.
- **Read the values from the form in `onSubmit`** (`e.target.elements`), not
  only from state: Chrome autofill can fill the fields without firing
  `onChange`. Keep `name='username'` / `name='password'` and the
  `autoComplete` attributes.
- It can use `settings.logo`, `settings.title`, `LanguageProvider.get('login.*')`
  and the components in `src/components/ui`.

Minimal example:

```javascript
// src/config/nl_pages/Login/index.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Alert } from '../../../components/ui/alert';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { LanguageProvider } from '../../../core/language-provider';
import { LoginManager } from '../../../core/login-manager';
import { settings } from '../../settings';

export default function Login() {
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    // values from the form, not from state: Chrome autofill
    const { username, password } = e.target.elements;
    const response = await LoginManager.login(username.value, password.value, 1);
    if (response.success === 0) {
      setError(response.message);
    }
    // on success nothing to do: the framework switches router
  }

  return (
    <div className='flex min-h-svh items-center justify-center p-6'>
      <form onSubmit={handleSubmit} className='flex w-full max-w-sm flex-col gap-4'>
        <img src={settings.logo} alt={settings.title} className='mx-auto h-12' />
        <h1 className='mb-0 text-center text-2xl font-bold'>{LanguageProvider.get('login.title')}</h1>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='username'>{LanguageProvider.get('login.username')}</Label>
          <Input id='username' name='username' autoComplete='username' autoFocus />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='password'>{LanguageProvider.get('login.password')}</Label>
          <Input id='password' name='password' type='password' autoComplete='current-password' />
        </div>
        <Button variant='primary' type='submit'>{LanguageProvider.get('login.login')}</Button>
        <Link to='/recover' className='text-center text-sm text-muted-foreground hover:underline'>
          {LanguageProvider.get('login.forgot')}
        </Link>
        {error && <Alert variant='danger' className='mb-0'>{error}</Alert>}
      </form>
    </div>
  );
}
```

---

## Hook System

### Data Lifecycle Hooks

**Location:** `src/config/hooks/`

#### preInsert.js
```javascript
export async function preInsert(entity, data) {
  if (entity === 'my_entity') {
    // Validate before creation
    if (!data.name) {
      return { success: 0, message: 'Name is required' };
    }
  }
  return { success: 1, data: data };
}
```

#### onInsert.js
```javascript
export async function onInsert(response, entity, data) {
  if (entity === 'my_entity' && response.success === 1) {
    // Post-creation actions
    console.log('Created:', response.body.id);
  }
}
```

#### preUpdate.js
```javascript
export async function preUpdate(entity, data, id) {
  if (entity === 'my_entity') {
    // Validate before update
  }
  return { success: 1, data: data };
}
```

#### onUpdate.js
```javascript
export async function onUpdate(response, entity, data, id) {
  if (entity === 'my_entity' && response.success === 1) {
    // Post-update actions
  }
}
```

#### preDelete.js / onDelete.js
Same pattern for delete operations.

### UI Hooks

#### actions.js
```javascript
export const actions = {
    DataGridRow: {
        my_entity: [
            {
                label: 'Apri dettaglio',
                icon: 'up-right-from-square',
                func: (item, navigate, refreshData) => navigate('/page/MyDetail?id=' + item.id)
            }
        ]
    },
    ModalDetailsFooter: {
        my_entity: [
            { label: 'Azione', icon: 'bolt', func: (item, navigate) => { /* ... */ } }
        ]
    }
};
```

- `DataGridRow`: voci del dropdown di riga nel datagrid; `ModalDetailsFooter`: bottoni nel footer del modale di dettaglio.
- `func(item, navigate, refreshData)`: niente JSX — per flussi con UI si naviga a una pagina custom.
- **REGOLA**: se un'entità ha azioni custom in `DataGridRow`, il dropdown mostra
  **SOLO quelle** — le azioni standard (visualizza/modifica/duplica/elimina)
  spariscono. Per riaverle, riaggiungile come azioni custom:
  `navigate('/entity/<e>/item?id=' + item.id)` (visualizza),
  `'/entity/<e>/edit?id='` (modifica), `'/entity/<e>/clone?id='` (duplica).
  Senza azioni custom restano le standard con la logica dei permessi.

#### UI injection hooks (`*Hook.js`)

Componenti React renderizzati dal framework in punti fissi. Ricevono `entity`
e fanno `switch` su di essa: il default deve restituire un frammento vuoto.

| Hook | Dove | Props |
|---|---|---|
| `HeaderHook` | Barra header | — |
| `StandardViewTopHook` / `StandardViewBottomHook` | Sopra / sotto la lista entity | `data, entity, searchObj, setSearchObj` |
| `DataGridTopHook` | Sopra il datagrid | `entity, data, setData, searchObj, setSearchObj, total, refreshData` |
| `DataGridTrHook` | Riga extra dopo ogni `<tr>` | `item, props, entity, refreshData` |
| `DataGridLastTdHook` | Cella extra in coda a ogni riga | `item, props, entity, data, setData, refreshData` |
| `DataGridSelectionHook` | Toolbar della selezione multipla | `data, setData, entity, selectedRows, setSelectedRows, refreshData` |
| `InstanceCompilerTopHook` | Sopra il form add/edit | `data, dataId, entity, setDataKeyValue` |
| `ModalPickerTopHook` | Sopra il picker degli externalEntity | `entity, selected, searchObj, setSearchObj, data` |

**Modifica in blocco dei selezionati: è già nel core.** Accanto a "Elimina
selezione" il framework mostra "Modifica selezione" (`DataGridBulkEdit`): si
sceglie un campo e un valore, resi col `Field` standard, e ogni riga
selezionata viene aggiornata con `updateItemNoCache`, quindi `preUpdate` e
`onUpdate` del progetto valgono anche lì. Sono offerti solo i campi con
`options.editable: true` in `tables.json`, non `options.disabled`, e concessi dall'authMap; esclusi
`multipleExternalEntity`, `deepExternalEntity` e `password`. Non va
reimplementato in `DataGridSelectionHook`: l'hook serve per azioni di progetto
in più, non per questa.

**`DataGridLastTdHook`: i bottoni si distanziano da soli.** La cella viene
renderizzata subito prima del bottone ingranaggio delle azioni di riga, senza
spazio in mezzo. Ogni bottone custom in quell'hook deve quindi avere `me-2`
(margin right), altrimenti risulta attaccato all'ingranaggio. Stessa taglia
del resto della riga: `size='sm'`.

```javascript
case 'db_query': return (
    <Button variant='outline-primary' size='sm' className='me-2' onClick={...}>Esegui query</Button>
);
```

#### customFilters.js

Funzioni con nome che restituiscono un array di constraint, referenziate da
`tables.json` nei picker `externalEntity` / `multipleExternalEntity`:

```json
"options": {
  "entity": "category",
  "labelField": "title",
  "filters": [
    { "operation": "customFilter", "reference": "filter01" },
    { "operation": "equalToValue", "field": "status", "value": "active" },
    { "operation": "equalToParentField", "field": "idCompany", "value": "idCompany" }
  ],
  "orderBy": { "field": "title", "order": "asc" }
}
```

- `customFilter`: chiama `customFilters[reference]()` e aggiunge i constraint restituiti.
- `equalToValue`: `field = value` sull'entità scelta.
- `equalToParentField`: `field` uguale al valore di `value` nel record in
  modifica (path con punti ammesso, es. `idCompany.id`).
- `orderBy`: ordinamento iniziale della lista del picker; l'utente lo cambia dalle
  intestazioni di colonna, che nel picker hanno lo stesso popover del datagrid
  (ordina, inverti, rimuovi, filtri di colonna). I `filters` qui sopra si
  aggiungono solo alla richiesta: non compaiono tra i filtri rimovibili.

---

## Permission System

### User Levels
- **Level 0**: Admin (full access)
- **Level 1**: Standard user (restricted)
- **Level 2+**: Custom restrictions

### Permission Values (Backend)
- `true`: Full access
- `false`: No access
- `"group"`: Access to same `idUserGroup` records
- `"user"`: Access to own records (`author` field)

---

## Best Practices

1. **Never modify core files** - Only work in `/src/config/`
2. **Scope custom CSS** - Always prefix with page container class
3. **Use DataManager** - Don't make direct API calls for CRUD
4. **Handle loading states** - Show spinners during async operations
5. **Handle errors** - Check `response.success` before using data
6. **Use hooks for business logic** - Keep custom logic in hooks
7. **Follow naming conventions** - CamelCase for pages, lowercase for entities
8. **Test permissions** - Verify access control with different user levels

---

## Quick Reference

### Imports
```javascript
import { DataManager } from '../../../core/data-manager';
import { ApiManager } from '../../../core/api-manager';
import { ResourceManager } from '../../../core/resource-manager';
import { LoginManager } from '../../../core/login-manager';
import { LanguageProvider } from '../../../core/language-provider';
```

### Get Current User
```javascript
import { LoginManager } from '../../../core/login-manager';

const userInfo = LoginManager.getUserInfo();
// userInfo.id, userInfo.level, userInfo.idUserGroup, etc.
```

### Common Libraries Available
- `src/components/ui/*` - shadcn-style UI components (Button, Dialog, Table, toast, …)
- `tailwindcss` v4 - utility classes (config-less, tokens in `src/css/tailwind.css`)
- `radix-ui` - headless primitives (already wrapped by `src/components/ui`)
- `chart.js` / `react-chartjs-2` - Charts (also used by the AI assistant)
- `xlsx` - Excel/CSV parsing in the browser (AI assistant attachments)
- `moment` - Date handling
- `@fortawesome/react-fontawesome` - Icons (always through the `Icon` component)
- `src/components/ui/combobox` - Searchable selects (`Combobox`/`MultiCombobox`, react-select is gone)
- `src/components/ui/toast` - Toast notifications (`toast.success(...)`, react-toastify is gone)
