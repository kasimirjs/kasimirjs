/**
 *
 * @param url
 * @param params
 */
function kasimir_http(url, params={}) {
    return new KasimirHttpRequest(url, params);
}