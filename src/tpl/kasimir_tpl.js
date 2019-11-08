

/**
 *
 * @param templateSelector
 * @return {KasimirTemplate}
 */
function kasimir_tpl(templateSelector) {
    let tplElem = kasimir_elem(templateSelector);
    let renderer = new KasimirRenderer();
    return renderer.render(tplElem);
}

