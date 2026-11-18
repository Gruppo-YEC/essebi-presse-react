# 📊 Analytics Dashboard - Documentazione Tecnica

## 🎯 Panoramica

Il **Dashboard Analytics** è un componente completo per l'analisi dei dati del sistema CKD Framework. Fornisce visualizzazioni avanzate attraverso grafici interattivi, KPI e metriche di performance in tempo reale basate sui log del sistema.

---

## 📁 Struttura File

```
/frontend/src/components/Analytics/
├── index.js                    # Componente principale AnalyticsModal
├── style.css                   # Stili specifici per Analytics
├── components/
│   ├── OverviewTab.js         # Tab Overview con KPI
│   ├── TrendsTab.js           # Tab Trends temporali CRUD
│   ├── SessionsTab.js         # Tab Sessioni Login/Logout
│   ├── ActivityTab.js         # Tab Log attività con ricerca/paginazione
│   └── PerformanceTab.js      # Tab Performance server real-time
└── DOCUMENTATION.md           # Questo file di documentazione
```

---

## 🔧 Architettura Backend

### 📝 Classe PHP: `AdvancedAnalytics.php`
**Path:** `/backend/api/classes/AdvancedAnalytics.php`

#### 🎯 Caratteristiche Principali:
- **Generica**: Funziona con qualsiasi progetto CKD Framework
- **Dinamica**: Legge entità da `tables.json` automaticamente
- **Resiliente**: Gestisce tabelle/colonne mancanti con try-catch
- **PDO**: Usa prepared statements PDO (mai MySQLi)
- **Core Class**: Spostata da `custom_classes/` a `classes/`

#### 🔑 API Endpoint Disponibili:

| Metodo | Endpoint | Descrizione | Parametri |
|--------|----------|-------------|-----------|
| `get_overview_analytics()` | `/analytics/overview` | KPI principali e distribuzione entità | `timeRange`, `startDate`, `endDate` |
| `get_trends_data()` | `/analytics/trends` | Trend temporali CRUD per entità | `timeRange`, `entity` |
| `get_sessions_data()` | `/analytics/sessions` | Login/Logout nel tempo | `timeRange` |
| `get_server_info()` | `/analytics/server_info` | Info server real-time (PHP, MySQL, OS) | - |
| `get_activity_log()` | `/analytics/activity` | Log attività con ricerca/paginazione | `limit`, `page`, `search`, `timeRange` |
| `export_analytics_report()` | `/analytics/export` | Export report analytics | `format`, `timeRange` |

#### 🚀 Architettura Endpoint:
- **analytics.php**: Dispatcher principale (come custom_calls.php)
- **analytics_config.php**: Configurazione azioni (come custom_calls_config.php)
- **.htaccess**: `RewriteRule ^analytics/(.*)$ analytics.php?action=$1`

#### 🗄️ Fonti Dati:

| Fonte | Utilizzo | Note |
|-------|----------|------|
| `auth_token` | Utenti attivi | `COUNT(DISTINCT idUser) WHERE lastUpdate >= start` |
| `log` | Operazioni CRUD | Filtra per `operation`: `2_ADD`, `1_EDIT`, `0_DELETE` |
| `log` | Login/Logout | Filtra per `operation`: `3_LOGIN`, `4_LOGOUT` |
| `log` | Ricerca attività | JOIN con `user` per username/email |
| `tables.json` | Entità disponibili | Caricamento dinamico entità |
| Sistema | Info server | PHP_VERSION, MySQL VERSION(), OS info |

---

## 🎨 Architettura Frontend

### 📱 Componente Principale: `AnalyticsModal`

#### 🔧 Gestione Modal:
- **Fullscreen**: Modal a schermo intero
- **Header**: Titolo "Analytics" con pulsante X bianco
- **Trigger**: Bottone tondo nell'header (stile ThemeToggle)
- **Props**: `show`, `onHide` (gestite dal HeaderBlock)

#### 🔄 Stati React:
```javascript
// Controlli UI principali
const [activeTab, setActiveTab] = useState('overview');
const [timeRange, setTimeRange] = useState('7d');
const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
const [availableEntities, setAvailableEntities] = useState([]);
```

#### ⏱️ Time Range Options:
```javascript
const timeRangeOptions = [
  { value: '24h', label: 'Ultime 24 ore' },      // Granularità: ore
  { value: '7d', label: 'Ultimi 7 giorni' },     // Granularità: giorni  
  { value: '30d', label: 'Ultimi 30 giorni' },   // Granularità: giorni
  { value: 'custom', label: 'Personalizzato' }    // Granularità: giorni
];
```

#### 🔄 Controlli Header:
- **Select Time Range**: Filtro temporale con opzioni predefinite
- **Date Range Custom**: Input data inizio/fine (solo se custom)
- **Bottone Aggiorna**: `window.location.reload()` per refresh completo

---

## 📊 Struttura Tab (Bootstrap Tabs)

### 🏠 **Tab Overview**
**File:** `components/OverviewTab.js`

**Contenuto:**
- 4 KPI Cards: Utenti Attivi, Operazioni, Entità Totali, Sistema
- 1 Grafico: Distribuzione Entità (Doughnut chart)

**API Calls:**
- `/analytics/overview` → Carica KPI e disponibleEntities

### 📈 **Tab Trends**  
**File:** `components/TrendsTab.js`

**Contenuto:**
- Select "Tutte le entità" + entità dinamiche dal backend
- Grafico Line: Creazioni, Modifiche, Eliminazioni nel tempo

**Logica Filtro Entità:**
- **"Tutte le entità"**: Non invia parametro `entity` → Backend mostra tutti i log
- **Entità specifica**: Invia `entity: "user"` → Backend filtra per quella entità

**API Calls:**
- `/analytics/trends` con parametro `entity` condizionale

### 👥 **Tab Sessioni**
**File:** `components/SessionsTab.js`

**Contenuto:**
- Grafico Login/Logout (Line chart)
- **Rimosso**: Alert info e grafico picchi attività orari

**Caratteristiche:**
- **Sempre globali**: Non filtrano per entità
- Solo Login (`3_LOGIN`) e Logout (`4_LOGOUT`)

**API Calls:**
- `/analytics/sessions` → Dati globali login/logout

### 📝 **Tab Attività**
**File:** `components/ActivityTab.js`

**Contenuto:**
- Tabella attività con font small
- **Ricerca**: Filtra per username, entità, ID
- **Paginazione**: 50 elementi per pagina
- **Visualizza**: Modal 90% larghezza con JSON formattato

**Funzionalità:**
- `DataManager.getItem(entity, itemId)` per dettagli
- Ricerca real-time su user/entity/ID
- Pagination con controlli Bootstrap

**API Calls:**
- `/analytics/activity` con `limit`, `page`, `search`
- `DataManager.getItem()` per visualizzazione dettagli

### ⚡ **Tab Performance** (Real-time)
**File:** `components/PerformanceTab.js`

**Contenuto:**
- **Informazioni Server**: PHP, MySQL, OS, memoria, uptime
- **Informazioni Browser**: Tipo, piattaforma, connessione
- **Nessun filtro temporale**: Dati sempre real-time
- **Posizione**: Ultima tab (spostata dopo Activity)

**Caratteristiche:**
- **No auto-refresh**: Solo bottone manuale
- **No test API**: Rimossi test endpoint automatici
- **Info sistema**: Versioni software, utilizzo risorse

**API Calls:**
- `/analytics/server_info` → Info server real-time

---

## 🎯 Logica dei Filtri

### 🔍 Filtro Time Range (Tutte le Tab tranne Performance):

| Valore | Backend Query | Descrizione |
|--------|---------------|-------------|
| `24h` | `date >= NOW() - INTERVAL 1 DAY` | Ultime 24 ore |
| `7d` | `date >= NOW() - INTERVAL 7 DAY` | Ultimi 7 giorni |
| `30d` | `date >= NOW() - INTERVAL 30 DAY` | Ultimi 30 giorni |
| `custom` | `date >= :startDate AND date <= :endDate` | Range personalizzato |

### 🔍 Filtro Entità (Solo Tab Trends):

| Selezione | Backend Query | Descrizione |
|-----------|---------------|-------------|
| "Tutte le entità" | Nessun parametro `entity` | Mostra TUTTI i log CRUD |
| "User" | `entity = 'user'` | Solo log con `entity = 'user'` |
| "Stanza" | `entity = 'stanza'` | Solo log con `entity = 'stanza'` |

### 🚫 **Tab SEMPRE Globali:**
- **Overview**: KPI globali del sistema
- **Sessions**: Login/Logout di tutti gli utenti
- **Activity**: Log di tutte le entità (con ricerca)
- **Performance**: Monitoring server/browser

---

## 🛠️ Processo di Sviluppo

### ✅ **Per Aggiungere Nuovo Endpoint:**

1. **Backend (analytics_config.php):**
   ```php
   else if($action == "my_new_action") {
       $body_response = $analytics->get_my_new_data();
   }
   ```

2. **Frontend:**
   ```javascript
   const response = await ApiManager.sendAuthenticatedRequest('/analytics/my_new_action', {});
   ```

### ✅ **Per Aggiungere Nuova Tab:**

1. **Componente:**
   ```jsx
   // components/MyNewTab.js
   const MyNewTab = ({ timeRange, customDateRange }) => {
       // Logica componente
   };
   ```

2. **Registrazione in index.js:**
   ```jsx
   <Tab eventKey="mynew" title={<><FontAwesomeIcon icon={faIcon} /> My Tab</>}>
       <MyNewTab timeRange={timeRange} customDateRange={customDateRange} />
   </Tab>
   ```

---

## 🎨 Stili e UX

### 🌙 **Dark Mode Support:**
- Pulsante X bianco nell'header: `.bg-primary .btn-close { filter: invert(1); }`
- Chart.js colors dinamici basati su `dark-theme-active`
- CSS variables per adattività

### 📱 **Responsive Design:**
- Bootstrap Grid System responsive
- Modal fullscreen su tutti i dispositivi
- Font piccoli su mobile per leggibilità

### 🔘 **Button Styling:**
- Bottone Analytics: Stesso stile di ThemeToggle (tondo, outline-light)
- **No rotazione**: CSS override per `[title="Analytics"]`
- Icona `chart-area` con dimensioni consistenti

---

## 📋 Checklist Manutenzione

### 🔍 **Verifica Funzionamento:**
- [ ] Modal apre/chiude correttamente
- [ ] Tutti i tab mostrano dati
- [ ] Filtro entità funziona (solo Trends)
- [ ] Time range si aggiorna
- [ ] Ricerca/paginazione Activity funziona
- [ ] Performance mostra info server
- [ ] Bottone aggiorna reloada la pagina

### 🗄️ **Database Health Check:**
- [ ] Tabella `log` esiste e ha dati
- [ ] Tabella `auth_token` ha dati recenti  
- [ ] Operazioni nei log hanno format corretto (`2_ADD`, `1_EDIT`, etc.)
- [ ] Campo `entity` nei log è popolato
- [ ] JOIN con `user` funziona per Activity

### 🚨 **Troubleshooting Comune:**

| Problema | Causa Probabile | Soluzione |
|----------|-----------------|-----------|
| Endpoint 404 | Nuovo sistema analytics | Verificare `.htaccess` e `analytics.php` |
| Tab Trends vuote con "all" | Filtro entity backend | Controllare logica `$entity !== null` |
| Activity senza ricerca | JOIN query fallita | Verificare struttura tabella `user` |
| Performance tab errore | Server info mancante | Controllare permessi PHP per system info |
| Modal non si apre | Props non passate | Verificare HeaderBlock gestione state |

---

## 🔮 Sistema di Architettura

### 🏗️ **Architettura Attuale:**
- **Frontend**: Component-based con tab separate
- **Backend**: Dispatcher dedicato + config actions
- **API**: Endpoint REST `/analytics/*`
- **Auth**: Integrata nel dispatcher analytics.php
- **DB**: PDO prepared statements con error handling

### 💡 **Future Enhancements:**
- [ ] Real-time updates con WebSocket
- [ ] Export Excel/CSV funzionante
- [ ] Dashboard personalizzabili per ruolo
- [ ] Caching intelligente dei dati
- [ ] Comparazione periodi affiancati
- [ ] Alerting e notifiche
- [ ] API rate limiting

---

## 🤝 **Note per Sviluppatori**

### ⚠️ **Attenzioni Importanti:**
1. **Architettura Endpoint**: Usare sempre `/analytics/*` non `/custom/*`
2. **Filtro Entity**: `null` = tutti, stringa = filtrato
3. **Time Range**: Custom usa `startDate`/`endDate`, non `customStart`/`customEnd`
4. **Modal Props**: Sempre passare `show`/`onHide` dal parent
5. **Performance Tab**: No filtri temporali, solo real-time

### 🎯 **Convenzioni:**
- API response: `{success: 1, data: ...}` structure
- Component props: Passa `timeRange`, `customDateRange` dove necessario
- Error handling: Toast notifications consistenti
- Loading states: Spinner centralizzato per UX fluida

---

**Ultima modifica:** Gennaio 2025  
**Versione:** 2.0  
**Architettura**: Endpoint dedicati `/analytics/*`  
**Maintainer:** AI Assistant + Marco CKD