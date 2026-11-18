import { Utils } from './utils';
import { ApiManager } from './api-manager';
import { AuthorizationManager } from './authorization-manager';
import { ViewManager } from './view-manager';
import { CacheManager } from './cache-manager';


let data = {
    userInfo:null,
    sid: null
}

// Sistema callback per notificare logout
let logoutCallbacks = [];

// Promise per gestire refresh concorrenti
let refreshPromise = null;

var changedSidHandlers = {};

// Listener per sincronizzazione cross-tab
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key === 'sid') {
            if (event.newValue === null && data.sid !== null) {
                // Un'altra tab ha fatto logout
                data.sid = null;
                data.userInfo = null;
                logoutCallbacks.forEach(cb => cb());
            } else if (event.newValue && event.newValue !== data.sid) {
                // SID cambiato in un'altra tab
                data.sid = event.newValue;
                // Ricarica userInfo da localStorage
                const userInfoStr = localStorage.getItem('userInfo');
                if (userInfoStr) {
                    try {
                        data.userInfo = JSON.parse(userInfoStr);
                    } catch(e) {}
                }
            }
        }
    });
}

var callSidChangedHandlers = function () {
    for (var id in changedSidHandlers) {
        changedSidHandlers[id]()
    }
}

var registerChangeSid = function (handler) {
    var id = Date.now()
    changedSidHandlers[id] = handler;
    return id;
}

// Funzione per registrare callback di logout
function onLogout(callback) {
    logoutCallbacks.push(callback);
    // Ritorna funzione per unsubscribe
    return () => {
        logoutCallbacks = logoutCallbacks.filter(cb => cb !== callback);
    };
}

async function refreshSid(action = null, body = null) {
    // Se già in corso un refresh, attendi la stessa Promise
    if (refreshPromise) {
        try {
            await refreshPromise;
            // Dopo che il refresh è completato, riprova la richiesta originale
            if (action && body) {
                return ApiManager.sendAuthenticatedRequest(action, body);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    // Avvia nuovo refresh
    refreshPromise = performRefresh();
    try {
        const success = await refreshPromise;
        if (success && action && body) {
            return ApiManager.sendAuthenticatedRequest(action, body);
        }
        return success;
    } finally {
        refreshPromise = null;
    }
}

async function performRefresh() {
    let ltsid = await getLtsid();
    let b = {
        ltsid: ltsid
    }
    let response = await ApiManager.sendRequest('/auth/refreshSid', b)
    if(response.success === 1) {
        data.sid = response.sid;
        localStorage.setItem('sid', response.sid);
        data.userInfo = response.body;
        localStorage.setItem('ltsid', response.ltsid);
        localStorage.setItem('userInfo', JSON.stringify(response.body));

        AuthorizationManager.setAuthMap(response.auth_map);
        ViewManager.setProperties(response.props)
        return true;
    }
    else {
        await afterLogoutActions();
        return false;
    }
}

async function login(username, password, rememberme) {
    let body = {
        rememberme: rememberme,
        password: Utils.encrypt(password),
        username: username
    }
    let response = await ApiManager.sendRequest('/auth/login', body)
    if(response.success === 1) {
        afterLoginActions(response)
    }

    return response;
}

async function checkLogin() {
    let ltsid = await getLtsid();
    let body = {
        ltsid: ltsid
    }
    let response = await ApiManager.sendRequest('/auth/checkLogin', body)
    if(response.success === 1) {
        data.sid = response.sid; // Update in-memory cache first
        localStorage.setItem('sid', response.sid);
        data.userInfo = response.body;
        localStorage.setItem('ltsid', response.ltsid);
        localStorage.setItem('userInfo', JSON.stringify(response.body));

        AuthorizationManager.setAuthMap(response.auth_map);
        ViewManager.setProperties(response.props)
        return true
    }
    else {
        if(window.location.pathname !== '/') {
            localStorage.setItem('deeplink', window.location.href) //save deeplink
            console.warn('--- saving deeplink ---', window.location.href)
        }

        return false;
    }
}

async function logout() {
    let ltsid = await getLtsid();
    let body = {
        ltsid: ltsid
    }
    let response = await ApiManager.sendRequest('/auth/logout', body)
    console.log('logout', response)
    afterLogoutActions()
    return true
}

async function afterLoginActions(rawData) {
    data.sid = rawData.sid; // Update in-memory cache first
    localStorage.setItem('sid', rawData.sid);
    data.userInfo = rawData.body;
    localStorage.setItem('ltsid', rawData.ltsid);
    localStorage.setItem('userInfo', JSON.stringify(rawData.body));

    AuthorizationManager.setAuthMap(rawData.auth_map);
    ViewManager.setProperties(rawData.props)

    callSidChangedHandlers()

    var deeplink = localStorage.getItem('deeplink')
    if(deeplink) {
        if(deeplink.includes("nl_page")) {
            localStorage.removeItem('deeplink')
        }
        else {
            localStorage.removeItem('deeplink')
            window.location.href = deeplink
        }
    }

    return true;
}

async function afterLogoutActions(){
    data.userInfo = null;
    data.sid = null; // Clear in-memory cache
    localStorage.clear()
    CacheManager.clearAll()

    // Notifica tutti i listener del logout
    logoutCallbacks.forEach(cb => {
        try {
            cb();
        } catch(e) {
            console.error('Error in logout callback:', e);
        }
    });

    callSidChangedHandlers()

    return true;
}

function getUserInfo() {
    return data.userInfo;
}

async function getSid() {
    // Return in-memory cache first, fallback to localStorage
    if(data.sid !== null) {
        return data.sid;
    }
    let sid = localStorage.getItem('sid');
    if(sid) {
        data.sid = sid; // Populate cache from localStorage
    }
    return sid;
}

async function getLtsid() {
    let ltsid = localStorage.getItem('ltsid');

    console.log("LoginManager (getLtsid): ltsid is: " + ltsid)
    return ltsid;
}

async function changePassword(password, newPassword, confirmPassword) {
    let body = {
        password: Utils.encrypt(password),
        newPassword: Utils.encrypt(newPassword),
        confirmPassword: Utils.encrypt(confirmPassword),
    }
    let response = await ApiManager.sendAuthenticatedRequest('/account/updatePassword', body)
    return response;
}

async function updateProfile(body) {
    let response = await ApiManager.sendAuthenticatedRequest('/account/updateProfile', body)
    return response;
}

async function recoverPassword(username) {
    let body = {
        email: username
    }
    let response = await ApiManager.sendRequest('/auth/forgot', body)
    return response;
}

async function resetPassword(pin, newPassword, confirmPassword) {
    let body = {
        pin: pin,
        newPassword: Utils.encrypt(newPassword),
        confirmPassword: Utils.encrypt(confirmPassword),
    }
    let response = await ApiManager.sendRequest('/auth/reset', body)
    return response;
}



export const LoginManager = {
    login: login,
    refreshSid: refreshSid,
    checkLogin: checkLogin,
    logout: logout,
    getUserInfo: getUserInfo,
    getSid: getSid,
    getLtsid: getLtsid,
    registerChangeSid: registerChangeSid,
    onLogout: onLogout,
    changePassword: changePassword,
    recoverPassword: recoverPassword,
    resetPassword: resetPassword,
    updateProfile: updateProfile,
    afterLoginActions: afterLoginActions
};