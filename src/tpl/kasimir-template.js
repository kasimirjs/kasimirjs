class KasimirTemplate {

    constructor(tplFn) {
        this._tplFn = tplFn;
        /**
         *
         * @type {HTMLElement}
         * @private
         */
        this._renderInElement = null;
        this._binder = new KasimirBinder();
    }

    /**
     *
     * @param domSelector {string|HTMLElement}
     * @return KasimirTemplate
     */
    renderIn(domSelector) {
        let node = null;
        if (typeof domSelector === "string") {
            node = document.querySelector(domSelector);
            if (node === null)
                throw "bind(): can't find element '" + domSelector + "'";
        } else if (domSelector instanceof HTMLElement) {
            node = domSelector;
        } else {
            throw "bind(): parameter1 is not a HtmlElement";
        }
        this._renderInElement = node;
        return this;
    }


    /**
     *
     * @param scope
     * @return {KasimirTemplate}
     */
    render(scope) {
        this._renderInElement.replaceChild(this._tplFn(scope), this._renderInElement.firstChild);
        return this;
    }

    /**
     *
     * @param scope
     * @return {KasimirTemplate}
     */
    observe(scope) {
        this.render(scope);
        this._binder.bind(scope).setOnChange(()=>this.render(scope));
        return this;
    }

}

