import { ApiManager } from './api-manager';
import { settings } from '../config/settings';


async function uploadBase64(base64data, filename, entity) {
    let body = {
        'filename': filename,
        'filedata': base64data,
        'entity': entity
    }
    console.warn(body)
    let response = await ApiManager.sendAuthenticatedRequest('/resource/uploadFile', body)
    return response;
}


async function getFile(hash, entity) {
    let body = {
        'hash': hash,
        'entity': entity
    }
    let response = await ApiManager.sendAuthenticatedRequest('/resource/getFile', body)
    return response
}

function getFileUrl(data, entity) {
    let url = settings.storageUrl + 'upload/' + entity + '/' + data.hash + '.' + data.extension
    return url;
}



export const ResourceManager = {
    uploadBase64: uploadBase64,
    getFileUrl: getFileUrl,
    getFile: getFile
};