/**
 * @param {string} base64
 * @returns {string}
 */
function urlBase64(base64) {
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * @param {Record<string,unknown>} obj
 * @returns {string}
 */
export function base64encodeJSON(obj) {
  return urlBase64(btoa(JSON.stringify(obj)));
}

/**
 * @param {string} str
 * @returns {string}
 */
export function urlBase64encode(str) {
  return urlBase64(btoa(str));
}
