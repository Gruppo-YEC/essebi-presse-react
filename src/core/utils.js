import { SHA1 } from "./sha1-js";
import { MD5 } from "./md5-js";
import { settings } from "../config/settings";
import _ from "lodash"; // cool kids know _ is low-dash

function encrypt(data) {
    if (settings.encryptMode === "md5") {
        return MD5.md5(data);
    }
    return SHA1.sha1(data);
};

function removeFromArray (array, value) {
    var i = array.indexOf(value);
    if (i > -1) {
        array.splice(i, 1);
    }

    return array;
}

function cloneObject(original){
    // copy
    var clone = _.cloneDeep(original);
    return clone;
}

/**
 * Scarica un file arrivato dall'API come base64: { content, mimetype, filename }.
 * Usato da export e import, che prima ripetevano lo stesso giro di Blob a mano.
 */
function downloadBase64(data) {
    const binary = atob(data.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const url = window.URL.createObjectURL(new Blob([bytes], { type: data.mimetype }));
    const a = document.createElement('a');
    a.href = url;
    a.download = data.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

export const Utils = {
    downloadBase64,
    cloneObject: cloneObject,
    removeFromArray: removeFromArray,
    encrypt: encrypt
};