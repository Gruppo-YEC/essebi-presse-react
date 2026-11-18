import { settings } from '../config/settings';
import { LoginManager } from './login-manager';


// Error codes che indicano che l'utente è disabilitato
const DISABLED_USER_ERROR_CODES = [
    'login.disabled',
    'forgot.disabled',
    'checkLogin.disabled',
    'refreshSid.disabled',
    'user.disabled'
];

function isDisabledUserError(errorCode) {
    return DISABLED_USER_ERROR_CODES.includes(errorCode);
}


async function sendRequest(action, body) {
    var url = settings.apiUrl + action;
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(body),
    }).then((response) => response.text()).then(async (text) => {
        try {
            const responseData = JSON.parse(text);
            return responseData
        } catch(err) {
            return text
        }
    }).catch((error) => {
        console.error(error);
        throw Error("APIManager (sendAuthenticatedDataToApi): Error calling API, check the connection.")
    });
}

async function sendAuthenticatedRequest(action, body) {
    var sid = await LoginManager.getSid()
    var url = settings.apiUrl + action;
    
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${sid}`
        },
        body: JSON.stringify(body),
    }).then((response) => response.text()).then(async (text) => {
        try {
            const responseData = JSON.parse(text);
            if(responseData.success === 0 && responseData.error_code && responseData.error_code === 'refresh.sid') {
                /*
                var r = await LoginManager.refreshSid(action, body)
                if(r === true) {
                    return sendAuthenticatedRequest(action, body)
                }
                else {
                    return responseData
                }
                */
               return await LoginManager.refreshSid(action, body)
            }
            else if(responseData.success === 0 && responseData.error_code && responseData.error_code === 'not.logged') {
                // Tenta refresh prima di fare logout definitivo
                console.log('API returned not.logged - attempting refresh...');
                try {
                    const refreshResult = await LoginManager.refreshSid(action, body);
                    if (refreshResult && refreshResult.success === 1) {
                        console.log('Refresh successful, returning refreshed response');
                        return refreshResult;
                    }
                } catch (e) {
                    console.error('Refresh failed:', e);
                }
                // Se anche il refresh fallisce, allora logout
                console.log('Refresh failed - logging out');
                LoginManager.logout();
                return responseData;
            }
            else if(responseData.success === 0 && responseData.error_code && isDisabledUserError(responseData.error_code)) {
                // Utente disabilitato - forza logout
                console.log('User is disabled - logging out');
                LoginManager.logout();
                return responseData;
            }
            else {
                return responseData
            }
        } catch(err) {
            return text
        }
    }).catch((error) => {
        console.error(error);
        throw Error("APIManager (sendAuthenticatedDataToApi): Error calling API, check the connection.")
    });
}


export const ApiManager = {
    sendAuthenticatedRequest: sendAuthenticatedRequest,
    sendRequest: sendRequest
};