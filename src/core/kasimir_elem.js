/**
 *
 * @param {HTMLElement|string} selector
 * @param {HTMLElement|void} parent
 * @return {HTMLElement}
 */
function kasimir_elem(selector, parent) {
    if (typeof parent === "undefined")
        parent = document;

    if (typeof selector === "undefined")
        throw "kasimir_elem(undefined): undefined value in parameter 1";

    let elem = null;
    if (typeof selector === "string") {
        elem = parent.querySelector(selector);
        if (elem === null)
            throw "kasimir_elem('" + selector + "'): can't find element.";
        return elem;
    }

    if ( ! selector instanceof HTMLElement)
        throw "kasimir_elem('" + typeof selector + "' is no valid HTMLElement";
    return selector;
}

/**
 *
 * @param {HTMLElement|string} selector
 * @param {HTMLElement|void} parent
 * @return {HTMLElement[]}
 */
function kasimir_elem_all(selector, parent) {
    if (typeof parent === "undefined")
        parent = document;

    if (typeof selector === "undefined")
        throw "kasimir_elem(undefined): undefined value in parameter 1";

    let elem = null;
    if (typeof selector === "string") {
        elem = parent.querySelectorAll(selector);
        if (elem === null)
            throw "kasimir_elem('" + selector + "'): can't find element.";
        return elem;
    }

    if ( ! Array.isArray( selector))
        throw "kasimir_elem('" + typeof selector + "' is no valid HTMLElement[]";
    return selector;
}