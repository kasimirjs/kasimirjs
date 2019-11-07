/**
 * Infracamp's KasimirJS
 *
 * A no-dependency render on request
 *
 * @author Matthias Leuffen <m@tth.es>
 */
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


function kasimir(loadfn) {
    window.addEventListener("load", loadfn);
}

class KasimirBinder {


    constructor() {
        this._interval = null;
        this._observedLastValue = null;
        this._onchange = null;
        /**
         *
         * @type {object}
         * @private
         */
        this._observedObj = null;
    }

    /**
     *
     * @param obj
     * @return {KasimirBinder}
     */
    bind(obj) {
        if (typeof obj !== "object")
            throw new Error("bind(" + typeof obj + "): parameter must be object.");
        if (this._interval !== null)
            window.clearInterval(this._interval);

        this._observedObj = obj;
        console.log("set");
        this._interval = window.setInterval(e => {
            if (JSON.stringify(obj) !== this._observedLastValue) {
                this._observedLastValue = JSON.stringify(obj);
                if (this._onchange !== null)
                    this._onchange(obj);
            }
        }, 200);
        return this;
    }


    /**
     *
     * @param newValue
     * @return {KasimirBinder}
     */
    setDataWithoutTrigger(newValue) {
        if (this._observedObj === null)
            throw "no object is bind(). call bind() before setDataWithoutTrigger()";
        Object.assign(this._observedObj, newValue);
        this._observedLastValue = JSON.stringify(this._observedObj);
        return this;
    }


    /**
     *
     * @param callback
     * @return {KasimirBinder}
     */
    setOnChange(callback) {
        this._onchange = callback;
        return this;
    }



}



class KasimirDebouncer {


    constructor(callback, timeout=300) {
        this.callback = callback;
        this.timeout = timeout;
        this._timeout = null;
    }

    debounce() {
        if (this._timeout !== null)
            window.clearTimeout(this._timeout)
        this._timeout = window.setTimeout(this.callback, this.timeout);
    }

    trigger() {
        if (this._timeout !== null)
            window.clearTimeout(this._timeout)
        this.callback();
    }

}
/**
 *
 * @param selector
 * @return {KasimirForm}
 */
function kasimir_form(selector) {
    return new KasimirForm(selector);
}

class KasimirFormSerializer {

    static ElemGetValue (formSelector, parent) {
        let form = kasimir_elem(formSelector, parent);

        switch (form.tagName) {
            case "INPUT":
                switch (form.type) {
                    case "checkbox":
                    case "radio":
                        if (form.checked == true)
                            return form.value;
                        return null;
                }
            case "SELECT":
                return form.value;

            case "TEXTAREA":
                return form.value;
        }

    }

    static ElemSetValue (formSelector, newValue, parent) {
        let form = kasimir_elem(formSelector, parent);
        switch (form.tagName) {
            case "INPUT":
                switch (form.type) {
                    case "checkbox":
                    case "radio":
                        if (newValue == form.value) {
                            form.checked = true;
                        } else {
                            form.checked = false;
                        }
                        return;
                }
                form.value = newValue;
                break;
            case "SELECT":
                form.value = newValue;
                break;
            case "TEXTAREA":
                form.value = newValue;
                break;
        }
    }

    static GetData(formSelector) {
        let form = kasimir_elem(formSelector);
        let data = {};

        for(let elem of kasimir_elem_all("input, select, textarea", form)) {
            let val = this.ElemGetValue(elem);
            if (val === null)
                continue;
            let name = elem.name;
            if (name == "")
                name = elem.id;

            data[name] = val;
        }
        return data;
    }

    static SetData(formSelector, newValue) {
        let form = kasimir_elem(formSelector);
        for(let elem of kasimir_elem_all("input, select, textarea", form)) {
            let name = elem.name;
            if (name == "")
                name = elem.id;

            let val = newValue[name];
            this.ElemSetValue(elem, val);
        }
    }

}


class KasimirForm {

    constructor(selector) {
        this.form = kasimir_elem(selector);
        this._debouncer = null;
        this._binder = new KasimirBinder();
    }

    get data () {
        return KasimirFormSerializer.GetData(this.form);
    }

    set data(value) {
        KasimirFormSerializer.SetData(this.form, value);
        this._binder.setDataWithoutTrigger(value);
    }

    /**
     *
     * @param object
     * @return {KasimirForm}
     */
    bind(object) {
        this._binder.bind(object).setDataWithoutTrigger(object).setOnChange((obj) => {
            this.data = obj;
        });

        let debouncer = this._debouncer = new KasimirDebouncer(() => {
            this._binder.setDataWithoutTrigger(this.data);
        });
        this.form.addEventListener("change", (e) => debouncer.trigger());
        this.form.addEventListener("keyup", (e) => debouncer.debounce());
        this.data = this.data;
        return this;
    }

    /**
     *
     * @param callback
     * @return {KasimirForm}
     */
    onsubmit(callback) {
        this.form.addEventListener("submit", (e) => {
            e.preventDefault();
            e.stopPropagation();
            callback(e);
        });
        return this;
    }

}
/**
 *
 * @param url
 * @param params
 */
function kasimir_http(url, params={}) {
    return new KasimirHttpRequest(url, params);
}


class KasimirHttpRequest {

    constructor(url, params={}) {

        url = url.replace(/(\{|\:)([a-zA-Z0-9_\-]+)/, (match, p1, p2) => {
            if ( ! params.hasOwnProperty(p2))
                throw "parameter '" + p2 + "' missing in url '" + url + "'";
            return encodeURI(params[p2]);
        });

        this.request = {
            url: url,
            method: "GET",
            body: null,
            headers: {},
            dataType: "text",
            onError: null,
            data: null
        };


    }

    /**
     * Add additional query parameters to url
     *
     * @param params
     * @return {KasimirHttpRequest}
     */
    withParams(params) {
        if (this.request.url.indexOf("?") === -1) {
            this.request.url += "?";
        } else {
            this.request.url += "&";
        }
        let str = [];
        for (let name in params) {
            if (params.hasOwnProperty(name)) {
                str.push(encodeURIComponent(name) + "=" + encodeURIComponent(params[name]));
            }
        }
        this.request.url += str.join("&");
        return this;
    }

    /**
     *
     * @param method
     * @return {KasimirHttpRequest}
     */
    withMethod(method) {
        this.request.method = method;
        return this;
    }

    /**
     *
     * @param token
     * @return {KasimirHttpRequest}
     */
    withBearerToken(token) {
        this.withHeaders({"authorization": "baerer " + token});
        return this;
    }


    /**
     *
     * @param headers
     * @return {KasimirHttpRequest}
     */
    withHeaders(headers) {
        Object.assign(this.request.headers, headers);
        return this;
    }


    /**
     *
     * @param body
     * @return {KasimirHttpRequest}
     */
    withBody(body) {
        if (this.request.method === "GET")
            this.request.method = "POST";
        if (Array.isArray(body) || typeof body === "object") {
            body = JSON.stringify(body);
            this.withHeaders({"content-type": "application/json"});
        }

        this.request.body = body;
        return this;
    }

    /**
     *
     * @param callback
     * @return {KasimirHttpRequest}
     */
    withOnError(callback) {
        this.request.onError = callback;
        return this;
    }

    set json(fn) {
        this.send((res) => {
            fn(res.getBodyJson());
        });
    }

    set plain(fn) {
        this.send((res) => {
            fn(res.getBody());
        })
    }


    /**
     *
     * @param fn
     * @param filter
     * @return
     */
    send(onSuccessFn) {
        let xhttp = new XMLHttpRequest();

        xhttp.open(this.request.method, this.request.url);
        for (let headerName in this.request.headers) {
            xhttp.setRequestHeader(headerName, this.request.headers[headerName]);
        }
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === 4) {
                console.log("ok", xhttp);
                if (this.request.onError !== null && xhttp.status >= 400) {
                    this.request.onError(new KasimirHttpResponse(xhttp.response, xhttp.status, this));
                    return;
                }
                onSuccessFn(new KasimirHttpResponse(xhttp.response, xhttp.status, this));
                return;
            }

        };

        xhttp.send(this.request.body);
    }

}


class KasimirHttpResponse {


    constructor (body, status, request) {
        this.body = body;
        this.status = status;
        this.request = request;
    }

    /**
     *
     * @return {object}
     */
    getBodyJson() {
        return JSON.parse(this.body)
    }

    /**
     *
     * @return {string}
     */
    getBody() {
        return this.body;
    }

    /**
     *
     * @return {boolean}
     */
    isOk() {
        return this.status === 200;
    }

}



class KmInputElem extends HTMLInputElement {

    constructor() {
        super();
        this._attrs = {
            bind: null,
            observe: null,
            scope: null
        };
        this._config = {
        };

    }


    static get observedAttributes() { return ["bind"]; }

    attributeChangedCallback(name, oldValue, newValue) {
        this._attrs[name] = newValue;
    }

    connectedCallback() {
        console.log("connected!!!", this);
        console.log(window.status);

        try {
            this.value = eval(this._attrs.bind);

            this.onchange = () => {
                console.log("change", this.value);
                eval(this._attrs.bind + " = this.value");
            }
        } catch (e) {
            console.error(e + " in element ", this);
            throw e;
        }

    }

}

customElements.define("km-input", KmInputElem, {extends: "input"});




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




class KasimirRenderer {

    constructor(attrPrefix="*") {
        this._attrPrefix = attrPrefix
    }

    /**
     *
     * @param domnode {HTMLElement}
     */
    _getAttributeStr(domnode) {
        let ret = "";
        for (let attr of domnode.attributes)
            ret += " " + attr.name + "=\"" + attr.value + "\"";
        return ret;
    }


    _addslashes(string) {
        return string.replace(/\\/g, '\\\\').
            replace(/\u0008/g, '\\b').
            replace(/\t/g, '\\t').
            replace(/\n/g, '\\n').
            replace(/\f/g, '\\f').
            replace(/\r/g, '\\r').
            replace(/'/g, '\\\'').
            replace(/"/g, '\\"');
    }

    /**
     *
     * @param domnode {HTMLElement}
     * @return
     */
    _getLogic(domnode) {
        let ret = {open:"", close:"", handler:{}};

        if (domnode.hasAttribute(this._attrPrefix + "if")) {
            ret.open += "if(" + domnode.getAttribute(this._attrPrefix + "if") + "){";
            ret.close += "}";
        }
        if (domnode.hasAttribute(this._attrPrefix + "for")) {
            ret.open += "for(" + domnode.getAttribute(this._attrPrefix + "for") + "){";
            ret.close += "}";
        }

        for (let attr of domnode.attributes) {
            let matches = attr.name.match(/^on(.+)/);
            if (matches === null)
                continue;
            ret.handler[attr.name] = attr.value;
        }

        return ret;
    }

    /**
     *
     * @param domnode {Node}
     * @param path {String}
     * @param depth
     */
    _render(domnode, path, depth) {
        let out = "";

        if (domnode instanceof HTMLElement) {

            let logic = this._getLogic(domnode);
            let attrStr = this._getAttributeStr(domnode);
            let curPath = path + " > " + domnode.tagName + attrStr;
            out += "\n" + logic.open;

            out += "\n__debug_path__ = '" + this._addslashes(curPath) + "';";
            if (domnode.tagName === "SCRIPT") {
                out += "\neval(`" + domnode.textContent + "`);"
            } else {
                if (domnode.hasAttribute("is")) {
                    out += "\n_e[" + depth + "] = document.createElement('" + domnode.tagName + "', {is: '" + domnode.getAttribute("is") + "'});";
                } else {
                    out += "\n_e[" + depth + "] = document.createElement('" + domnode.tagName + "');";
                }
                for (let attr of domnode.attributes) {
                    if (attr.name.startsWith(this._attrPrefix))
                        continue;
                    out += "\n_e[" + depth + "].setAttribute('" + attr.name + "', `" + attr.value + "`);";
                }
                for (let handlerName in logic.handler) {
                    out += "\n_e[" + depth + "]." + handlerName + " = function(e){ " + logic.handler[handlerName] + " };";
                }

                out += "\n_e[" + (depth - 1) + "].appendChild(_e[" + depth + "]);";
                // out += "\n__html__ += `<" + domnode.tagName + attrStr + ">`;";
                for (let child of domnode.childNodes) {
                    out += this._render(child, curPath, depth + 1);
                }
            }
            //out += "\n__html__ += `</" + domnode.tagName + ">`;"
            out += "\n" + logic.close;
        } else if (domnode instanceof Text) {
            let curPath = path + " > (text)";
            out += "\n__debug_path__ = '" + this._addslashes(curPath) + "';";
            out += "\n_e[" + (depth-1) +"].appendChild(document.createTextNode(`" + domnode.textContent + "`));";
        }
        return out
    }


    /**
     *
     * @param domnode
     * @return {KasimirTemplate}
     */
    render(domnode) {
        let out = "var __debug_path__ = '(root)';";
        out += "\nvar _e = [document.createElement('div')];";


        if (domnode instanceof HTMLTemplateElement) {

            for (let curChild of domnode.content.childNodes) {
                out += this._render(curChild,  "(root)", 1);
            }
        } else {
            out += this._render(domnode,  "(root)", 1);
        }


        let xout = `
            fn = function(scope){
                let fns = [];
                try {
                    ${out}
                } catch (e) {
                    throw 'Error in ' + __debug_path__ + ': ' + e;
                }
                return _e[0];
            };
        `;

        // console.log(xout);
        let fn ;
        eval(xout);
        return new KasimirTemplate(fn);
    }

}


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





class KmTplElem extends HTMLElement {

    constructor() {
        super();

        this._attrs = {
            bind: null,
            observe: null,
            scope: null
        };
        this._config = {
        };

        /**
         *
         * @type {KasimirTemplate}
         */
        this.tpl = null;
    }


    static get observedAttributes() { return ["bind", "observe", "scope"]; }

    attributeChangedCallback(name, oldValue, newValue) {
        this._attrs[name] = newValue;
    }

    connectedCallback() {
        window.setTimeout(()=> {
            try {
                let template = this.querySelector("template");
                if (template === null) {
                    console.error("<km-tpl> has no template child.", this);
                    throw "<km-tpl> requires <template> child.";
                }

                this.tpl = kasimir_tpl(template);
                this.removeChild(template);
                this.tpl.renderIn(this);

                if (this._attrs.scope !== null) {
                    var scope = null;
                    eval("scope = " + this._attrs.scope);
                }
                if (this._attrs.bind !== null) {
                    this.tpl.bind(eval(this._attrs.bind));
                }
                if (this._attrs.observe) {
                    let observed = eval(this._attrs.observe);
                    console.log(observed);
                    if (typeof observed !== "object")
                        throw "observed variable '" + this._attrs.observe + "' is typeof " + (typeof observed) + " but object required";
                    this.tpl.observe(observed);
                }
            } catch (e) {
                console.error(e + " in element ", this);
                throw e;
            }
        }, 1);


    }

    disconnectCallback() {

    }

}

customElements.define("km-tpl", KmTplElem);

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUva2FzaW1pcl9lbGVtLmpzIiwiY29yZS9rYXNpbWlyLmpzIiwiY29yZS9LYXNpbWlyQmluZGVyLmpzIiwiY29yZS9LYXNpbWlyRGVib3VuY2VyLmpzIiwiZm9ybS9rYXNpbWlyX2Zvcm0uanMiLCJmb3JtL2thc2ltaXItZm9ybS1zZXJpYWxpemVyLmpzIiwiZm9ybS9LYXNpbWlyRm9ybS5qcyIsImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJrYXNpbWlyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudHxzdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHZvaWR9IHBhcmVudFxuICogQHJldHVybiB7SFRNTEVsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZWxlbShzZWxlY3RvciwgcGFyZW50KSB7XG4gICAgaWYgKHR5cGVvZiBwYXJlbnQgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50O1xuXG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0odW5kZWZpbmVkKTogdW5kZWZpbmVkIHZhbHVlIGluIHBhcmFtZXRlciAxXCI7XG5cbiAgICBsZXQgZWxlbSA9IG51bGw7XG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBlbGVtID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHNlbGVjdG9yICsgXCInKTogY2FuJ3QgZmluZCBlbGVtZW50LlwiO1xuICAgICAgICByZXR1cm4gZWxlbTtcbiAgICB9XG5cbiAgICBpZiAoICEgc2VsZWN0b3IgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgdHlwZW9mIHNlbGVjdG9yICsgXCInIGlzIG5vIHZhbGlkIEhUTUxFbGVtZW50XCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHN0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8dm9pZH0gcGFyZW50XG4gKiBAcmV0dXJuIHtIVE1MRWxlbWVudFtdfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX2VsZW1fYWxsKHNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICBpZiAodHlwZW9mIHBhcmVudCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQ7XG5cbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSh1bmRlZmluZWQpOiB1bmRlZmluZWQgdmFsdWUgaW4gcGFyYW1ldGVyIDFcIjtcblxuICAgIGxldCBlbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGVsZW0gPSBwYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGlmIChlbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgc2VsZWN0b3IgKyBcIicpOiBjYW4ndCBmaW5kIGVsZW1lbnQuXCI7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cblxuICAgIGlmICggISBBcnJheS5pc0FycmF5KCBzZWxlY3RvcikpXG4gICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHR5cGVvZiBzZWxlY3RvciArIFwiJyBpcyBubyB2YWxpZCBIVE1MRWxlbWVudFtdXCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufSIsIlxuXG5mdW5jdGlvbiBrYXNpbWlyKGxvYWRmbikge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBsb2FkZm4pO1xufSIsIlxuY2xhc3MgS2FzaW1pckJpbmRlciB7XG5cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb25jaGFuZ2UgPSBudWxsO1xuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge29iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX29ic2VydmVkT2JqID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvYmpcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIGJpbmQob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYmluZChcIiArIHR5cGVvZiBvYmogKyBcIik6IHBhcmFtZXRlciBtdXN0IGJlIG9iamVjdC5cIik7XG4gICAgICAgIGlmICh0aGlzLl9pbnRlcnZhbCAhPT0gbnVsbClcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsKTtcblxuICAgICAgICB0aGlzLl9vYnNlcnZlZE9iaiA9IG9iajtcbiAgICAgICAgY29uc29sZS5sb2coXCJzZXRcIik7XG4gICAgICAgIHRoaXMuX2ludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGUgPT4ge1xuICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KG9iaikgIT09IHRoaXMuX29ic2VydmVkTGFzdFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBKU09OLnN0cmluZ2lmeShvYmopO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vbmNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25jaGFuZ2Uob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdWYWx1ZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJCaW5kZXJ9XG4gICAgICovXG4gICAgc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKG5ld1ZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLl9vYnNlcnZlZE9iaiA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IFwibm8gb2JqZWN0IGlzIGJpbmQoKS4gY2FsbCBiaW5kKCkgYmVmb3JlIHNldERhdGFXaXRob3V0VHJpZ2dlcigpXCI7XG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5fb2JzZXJ2ZWRPYmosIG5ld1ZhbHVlKTtcbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBKU09OLnN0cmluZ2lmeSh0aGlzLl9vYnNlcnZlZE9iaik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIHNldE9uQ2hhbmdlKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX29uY2hhbmdlID0gY2FsbGJhY2s7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG5cbn0iLCJcblxuXG5jbGFzcyBLYXNpbWlyRGVib3VuY2VyIHtcblxuXG4gICAgY29uc3RydWN0b3IoY2FsbGJhY2ssIHRpbWVvdXQ9MzAwKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgdGhpcy50aW1lb3V0ID0gdGltZW91dDtcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IG51bGw7XG4gICAgfVxuXG4gICAgZGVib3VuY2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl90aW1lb3V0ICE9PSBudWxsKVxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0KVxuICAgICAgICB0aGlzLl90aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQodGhpcy5jYWxsYmFjaywgdGhpcy50aW1lb3V0KTtcbiAgICB9XG5cbiAgICB0cmlnZ2VyKCkge1xuICAgICAgICBpZiAodGhpcy5fdGltZW91dCAhPT0gbnVsbClcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fdGltZW91dClcbiAgICAgICAgdGhpcy5jYWxsYmFjaygpO1xuICAgIH1cblxufSIsIi8qKlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pckZvcm19XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZm9ybShzZWxlY3Rvcikge1xuICAgIHJldHVybiBuZXcgS2FzaW1pckZvcm0oc2VsZWN0b3IpO1xufSIsIlxuY2xhc3MgS2FzaW1pckZvcm1TZXJpYWxpemVyIHtcblxuICAgIHN0YXRpYyBFbGVtR2V0VmFsdWUgKGZvcm1TZWxlY3RvciwgcGFyZW50KSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3RvciwgcGFyZW50KTtcblxuICAgICAgICBzd2l0Y2ggKGZvcm0udGFnTmFtZSkge1xuICAgICAgICAgICAgY2FzZSBcIklOUFVUXCI6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChmb3JtLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNoZWNrYm94XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJyYWRpb1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvcm0uY2hlY2tlZCA9PSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBcIlNFTEVDVFwiOlxuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtLnZhbHVlO1xuXG4gICAgICAgICAgICBjYXNlIFwiVEVYVEFSRUFcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybS52YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgc3RhdGljIEVsZW1TZXRWYWx1ZSAoZm9ybVNlbGVjdG9yLCBuZXdWYWx1ZSwgcGFyZW50KSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3RvciwgcGFyZW50KTtcbiAgICAgICAgc3dpdGNoIChmb3JtLnRhZ05hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJJTlBVVFwiOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZm9ybS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjaGVja2JveFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwicmFkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSA9PSBmb3JtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvcm0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJTRUxFQ1RcIjpcbiAgICAgICAgICAgICAgICBmb3JtLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiVEVYVEFSRUFcIjpcbiAgICAgICAgICAgICAgICBmb3JtLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0aWMgR2V0RGF0YShmb3JtU2VsZWN0b3IpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yKTtcbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcblxuICAgICAgICBmb3IobGV0IGVsZW0gb2Yga2FzaW1pcl9lbGVtX2FsbChcImlucHV0LCBzZWxlY3QsIHRleHRhcmVhXCIsIGZvcm0pKSB7XG4gICAgICAgICAgICBsZXQgdmFsID0gdGhpcy5FbGVtR2V0VmFsdWUoZWxlbSk7XG4gICAgICAgICAgICBpZiAodmFsID09PSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IG5hbWUgPSBlbGVtLm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBcIlwiKVxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbGVtLmlkO1xuXG4gICAgICAgICAgICBkYXRhW25hbWVdID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIHN0YXRpYyBTZXREYXRhKGZvcm1TZWxlY3RvciwgbmV3VmFsdWUpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yKTtcbiAgICAgICAgZm9yKGxldCBlbGVtIG9mIGthc2ltaXJfZWxlbV9hbGwoXCJpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYVwiLCBmb3JtKSkge1xuICAgICAgICAgICAgbGV0IG5hbWUgPSBlbGVtLm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBcIlwiKVxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbGVtLmlkO1xuXG4gICAgICAgICAgICBsZXQgdmFsID0gbmV3VmFsdWVbbmFtZV07XG4gICAgICAgICAgICB0aGlzLkVsZW1TZXRWYWx1ZShlbGVtLCB2YWwpO1xuICAgICAgICB9XG4gICAgfVxuXG59IiwiXG5cbmNsYXNzIEthc2ltaXJGb3JtIHtcblxuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuZm9ybSA9IGthc2ltaXJfZWxlbShzZWxlY3Rvcik7XG4gICAgICAgIHRoaXMuX2RlYm91bmNlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2JpbmRlciA9IG5ldyBLYXNpbWlyQmluZGVyKCk7XG4gICAgfVxuXG4gICAgZ2V0IGRhdGEgKCkge1xuICAgICAgICByZXR1cm4gS2FzaW1pckZvcm1TZXJpYWxpemVyLkdldERhdGEodGhpcy5mb3JtKTtcbiAgICB9XG5cbiAgICBzZXQgZGF0YSh2YWx1ZSkge1xuICAgICAgICBLYXNpbWlyRm9ybVNlcmlhbGl6ZXIuU2V0RGF0YSh0aGlzLmZvcm0sIHZhbHVlKTtcbiAgICAgICAgdGhpcy5fYmluZGVyLnNldERhdGFXaXRob3V0VHJpZ2dlcih2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICogQHJldHVybiB7S2FzaW1pckZvcm19XG4gICAgICovXG4gICAgYmluZChvYmplY3QpIHtcbiAgICAgICAgdGhpcy5fYmluZGVyLmJpbmQob2JqZWN0KS5zZXREYXRhV2l0aG91dFRyaWdnZXIob2JqZWN0KS5zZXRPbkNoYW5nZSgob2JqKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBvYmo7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBkZWJvdW5jZXIgPSB0aGlzLl9kZWJvdW5jZXIgPSBuZXcgS2FzaW1pckRlYm91bmNlcigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9iaW5kZXIuc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKHRoaXMuZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoZSkgPT4gZGVib3VuY2VyLnRyaWdnZXIoKSk7XG4gICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKGUpID0+IGRlYm91bmNlci5kZWJvdW5jZSgpKTtcbiAgICAgICAgdGhpcy5kYXRhID0gdGhpcy5kYXRhO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICAgICAqL1xuICAgIG9uc3VibWl0KGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbn0iLCIvKipcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gcGFyYW1zXG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfaHR0cCh1cmwsIHBhcmFtcz17fSkge1xuICAgIHJldHVybiBuZXcgS2FzaW1pckh0dHBSZXF1ZXN0KHVybCwgcGFyYW1zKTtcbn0iLCJcblxuY2xhc3MgS2FzaW1pckh0dHBSZXF1ZXN0IHtcblxuICAgIGNvbnN0cnVjdG9yKHVybCwgcGFyYW1zPXt9KSB7XG5cbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXHt8XFw6KShbYS16QS1aMC05X1xcLV0rKS8sIChtYXRjaCwgcDEsIHAyKSA9PiB7XG4gICAgICAgICAgICBpZiAoICEgcGFyYW1zLmhhc093blByb3BlcnR5KHAyKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBcInBhcmFtZXRlciAnXCIgKyBwMiArIFwiJyBtaXNzaW5nIGluIHVybCAnXCIgKyB1cmwgKyBcIidcIjtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVVUkkocGFyYW1zW3AyXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgICAgICAgYm9keTogbnVsbCxcbiAgICAgICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgb25FcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGRhdGE6IG51bGxcbiAgICAgICAgfTtcblxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkIGFkZGl0aW9uYWwgcXVlcnkgcGFyYW1ldGVycyB0byB1cmxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aFBhcmFtcyhwYXJhbXMpIHtcbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdC51cmwuaW5kZXhPZihcIj9cIikgPT09IC0xKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IFwiP1wiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgc3RyID0gW107XG4gICAgICAgIGZvciAobGV0IG5hbWUgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgc3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQocGFyYW1zW25hbWVdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBzdHIuam9pbihcIiZcIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoTWV0aG9kKG1ldGhvZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3QubWV0aG9kID0gbWV0aG9kO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlblxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQmVhcmVyVG9rZW4odG9rZW4pIHtcbiAgICAgICAgdGhpcy53aXRoSGVhZGVycyh7XCJhdXRob3JpemF0aW9uXCI6IFwiYmFlcmVyIFwiICsgdG9rZW59KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoZWFkZXJzXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnJlcXVlc3QuaGVhZGVycywgaGVhZGVycyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYm9keVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQm9keShib2R5KSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QubWV0aG9kID09PSBcIkdFVFwiKVxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IFwiUE9TVFwiO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShib2R5KSB8fCB0eXBlb2YgYm9keSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgYm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgICAgICAgICAgdGhpcy53aXRoSGVhZGVycyh7XCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVxdWVzdC5ib2R5ID0gYm9keTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE9uRXJyb3IoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IgPSBjYWxsYmFjaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0IGpzb24oZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kKChyZXMpID0+IHtcbiAgICAgICAgICAgIGZuKHJlcy5nZXRCb2R5SnNvbigpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0IHBsYWluKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keSgpKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBzZW5kKG9uU3VjY2Vzc0ZuKSB7XG4gICAgICAgIGxldCB4aHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHhodHRwLm9wZW4odGhpcy5yZXF1ZXN0Lm1ldGhvZCwgdGhpcy5yZXF1ZXN0LnVybCk7XG4gICAgICAgIGZvciAobGV0IGhlYWRlck5hbWUgaW4gdGhpcy5yZXF1ZXN0LmhlYWRlcnMpIHtcbiAgICAgICAgICAgIHhodHRwLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyTmFtZSwgdGhpcy5yZXF1ZXN0LmhlYWRlcnNbaGVhZGVyTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHhodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHR0cC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJva1wiLCB4aHR0cCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5vbkVycm9yICE9PSBudWxsICYmIHhodHRwLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IobmV3IEthc2ltaXJIdHRwUmVzcG9uc2UoeGh0dHAucmVzcG9uc2UsIHhodHRwLnN0YXR1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9uU3VjY2Vzc0ZuKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcblxuICAgICAgICB4aHR0cC5zZW5kKHRoaXMucmVxdWVzdC5ib2R5KTtcbiAgICB9XG5cbn0iLCJcblxuY2xhc3MgS2FzaW1pckh0dHBSZXNwb25zZSB7XG5cblxuICAgIGNvbnN0cnVjdG9yIChib2R5LCBzdGF0dXMsIHJlcXVlc3QpIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gYm9keTtcbiAgICAgICAgdGhpcy5zdGF0dXMgPSBzdGF0dXM7XG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0Qm9keUpzb24oKSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHRoaXMuYm9keSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRCb2R5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ib2R5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc09rKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMgPT09IDIwMDtcbiAgICB9XG5cbn0iLCJcblxuXG5jbGFzcyBLbUlucHV0RWxlbSBleHRlbmRzIEhUTUxJbnB1dEVsZW1lbnQge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2F0dHJzID0ge1xuICAgICAgICAgICAgYmluZDogbnVsbCxcbiAgICAgICAgICAgIG9ic2VydmU6IG51bGwsXG4gICAgICAgICAgICBzY29wZTogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICAgIH07XG5cbiAgICB9XG5cblxuICAgIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCkgeyByZXR1cm4gW1wiYmluZFwiXTsgfVxuXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICB0aGlzLl9hdHRyc1tuYW1lXSA9IG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3RlZCEhIVwiLCB0aGlzKTtcbiAgICAgICAgY29uc29sZS5sb2cod2luZG93LnN0YXR1cyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBldmFsKHRoaXMuX2F0dHJzLmJpbmQpO1xuXG4gICAgICAgICAgICB0aGlzLm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2hhbmdlXCIsIHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgIGV2YWwodGhpcy5fYXR0cnMuYmluZCArIFwiID0gdGhpcy52YWx1ZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlICsgXCIgaW4gZWxlbWVudCBcIiwgdGhpcyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKFwia20taW5wdXRcIiwgS21JbnB1dEVsZW0sIHtleHRlbmRzOiBcImlucHV0XCJ9KTtcblxuIiwiXG5cbi8qKlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZVNlbGVjdG9yXG4gKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfdHBsKHRlbXBsYXRlU2VsZWN0b3IpIHtcbiAgICBsZXQgdHBsRWxlbSA9IGthc2ltaXJfZWxlbSh0ZW1wbGF0ZVNlbGVjdG9yKTtcbiAgICBsZXQgcmVuZGVyZXIgPSBuZXcgS2FzaW1pclJlbmRlcmVyKCk7XG4gICAgcmV0dXJuIHJlbmRlcmVyLnJlbmRlcih0cGxFbGVtKTtcbn1cblxuIiwiXG5cbmNsYXNzIEthc2ltaXJSZW5kZXJlciB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyUHJlZml4PVwiKlwiKSB7XG4gICAgICAgIHRoaXMuX2F0dHJQcmVmaXggPSBhdHRyUHJlZml4XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKSB7XG4gICAgICAgIGxldCByZXQgPSBcIlwiO1xuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcylcbiAgICAgICAgICAgIHJldCArPSBcIiBcIiArIGF0dHIubmFtZSArIFwiPVxcXCJcIiArIGF0dHIudmFsdWUgKyBcIlxcXCJcIjtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cblxuICAgIF9hZGRzbGFzaGVzKHN0cmluZykge1xuICAgICAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHUwMDA4L2csICdcXFxcYicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx0L2csICdcXFxcdCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxuL2csICdcXFxcbicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxmL2csICdcXFxcZicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxyL2csICdcXFxccicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvJy9nLCAnXFxcXFxcJycpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBfZ2V0TG9naWMoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0ge29wZW46XCJcIiwgY2xvc2U6XCJcIiwgaGFuZGxlcjp7fX07XG5cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpKSB7XG4gICAgICAgICAgICByZXQub3BlbiArPSBcImlmKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiaWZcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImZvclwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJmb3IoXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgbGV0IG1hdGNoZXMgPSBhdHRyLm5hbWUubWF0Y2goL15vbiguKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVzID09PSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmV0LmhhbmRsZXJbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge05vZGV9XG4gICAgICogQHBhcmFtIHBhdGgge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gZGVwdGhcbiAgICAgKi9cbiAgICBfcmVuZGVyKGRvbW5vZGUsIHBhdGgsIGRlcHRoKSB7XG4gICAgICAgIGxldCBvdXQgPSBcIlwiO1xuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcblxuICAgICAgICAgICAgbGV0IGxvZ2ljID0gdGhpcy5fZ2V0TG9naWMoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgYXR0clN0ciA9IHRoaXMuX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKTtcbiAgICAgICAgICAgIGxldCBjdXJQYXRoID0gcGF0aCArIFwiID4gXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5vcGVuO1xuXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fX2RlYnVnX3BhdGhfXyA9ICdcIiArIHRoaXMuX2FkZHNsYXNoZXMoY3VyUGF0aCkgKyBcIic7XCI7XG4gICAgICAgICAgICBpZiAoZG9tbm9kZS50YWdOYW1lID09PSBcIlNDUklQVFwiKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuZXZhbChgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKTtcIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUoXCJpc1wiKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicsIHtpczogJ1wiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUoXCJpc1wiKSArIFwiJ30pO1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdcIiArIGRvbW5vZGUudGFnTmFtZSArIFwiJyk7XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCh0aGlzLl9hdHRyUHJlZml4KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLnNldEF0dHJpYnV0ZSgnXCIgKyBhdHRyLm5hbWUgKyBcIicsIGBcIiArIGF0dHIudmFsdWUgKyBcImApO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBoYW5kbGVyTmFtZSBpbiBsb2dpYy5oYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0uXCIgKyBoYW5kbGVyTmFtZSArIFwiID0gZnVuY3Rpb24oZSl7IFwiICsgbG9naWMuaGFuZGxlcltoYW5kbGVyTmFtZV0gKyBcIiB9O1wiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoIC0gMSkgKyBcIl0uYXBwZW5kQ2hpbGQoX2VbXCIgKyBkZXB0aCArIFwiXSk7XCI7XG4gICAgICAgICAgICAgICAgLy8gb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDxcIiArIGRvbW5vZGUudGFnTmFtZSArIGF0dHJTdHIgKyBcIj5gO1wiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGNoaWxkIG9mIGRvbW5vZGUuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGNoaWxkLCBjdXJQYXRoLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDwvXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIj5gO1wiXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5cIiArIGxvZ2ljLmNsb3NlO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBUZXh0KSB7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+ICh0ZXh0KVwiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyAoZGVwdGgtMSkgK1wiXS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKSk7XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dFxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgb3V0ID0gXCJ2YXIgX19kZWJ1Z19wYXRoX18gPSAnKHJvb3QpJztcIjtcbiAgICAgICAgb3V0ICs9IFwiXFxudmFyIF9lID0gW2RvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXTtcIjtcblxuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuXG4gICAgICAgICAgICBmb3IgKGxldCBjdXJDaGlsZCBvZiBkb21ub2RlLmNvbnRlbnQuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoY3VyQ2hpbGQsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoZG9tbm9kZSwgIFwiKHJvb3QpXCIsIDEpO1xuICAgICAgICB9XG5cblxuICAgICAgICBsZXQgeG91dCA9IGBcbiAgICAgICAgICAgIGZuID0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgICAgICAgICAgIGxldCBmbnMgPSBbXTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAke291dH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdFcnJvciBpbiAnICsgX19kZWJ1Z19wYXRoX18gKyAnOiAnICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9lWzBdO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgYDtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyh4b3V0KTtcbiAgICAgICAgbGV0IGZuIDtcbiAgICAgICAgZXZhbCh4b3V0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBLYXNpbWlyVGVtcGxhdGUoZm4pO1xuICAgIH1cblxufVxuXG4iLCJjbGFzcyBLYXNpbWlyVGVtcGxhdGUge1xuXG4gICAgY29uc3RydWN0b3IodHBsRm4pIHtcbiAgICAgICAgdGhpcy5fdHBsRm4gPSB0cGxGbjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2JpbmRlciA9IG5ldyBLYXNpbWlyQmluZGVyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tU2VsZWN0b3Ige3N0cmluZ3xIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuIEthc2ltaXJUZW1wbGF0ZVxuICAgICAqL1xuICAgIHJlbmRlckluKGRvbVNlbGVjdG9yKSB7XG4gICAgICAgIGxldCBub2RlID0gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBkb21TZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZG9tU2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJiaW5kKCk6IGNhbid0IGZpbmQgZWxlbWVudCAnXCIgKyBkb21TZWxlY3RvciArIFwiJ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbVNlbGVjdG9yIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb21TZWxlY3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBwYXJhbWV0ZXIxIGlzIG5vdCBhIEh0bWxFbGVtZW50XCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcmVuZGVySW5FbGVtZW50ID0gbm9kZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY29wZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVySW5FbGVtZW50LnJlcGxhY2VDaGlsZCh0aGlzLl90cGxGbihzY29wZSksIHRoaXMuX3JlbmRlckluRWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgb2JzZXJ2ZShzY29wZSkge1xuICAgICAgICB0aGlzLnJlbmRlcihzY29wZSk7XG4gICAgICAgIHRoaXMuX2JpbmRlci5iaW5kKHNjb3BlKS5zZXRPbkNoYW5nZSgoKT0+dGhpcy5yZW5kZXIoc2NvcGUpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG59XG5cbiIsIlxuXG5cbmNsYXNzIEttVHBsRWxlbSBleHRlbmRzIEhUTUxFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX2F0dHJzID0ge1xuICAgICAgICAgICAgYmluZDogbnVsbCxcbiAgICAgICAgICAgIG9ic2VydmU6IG51bGwsXG4gICAgICAgICAgICBzY29wZTogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRwbCA9IG51bGw7XG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIiwgXCJvYnNlcnZlXCIsIFwic2NvcGVcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoKCk9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCB0ZW1wbGF0ZSA9IHRoaXMucXVlcnlTZWxlY3RvcihcInRlbXBsYXRlXCIpO1xuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiPGttLXRwbD4gaGFzIG5vIHRlbXBsYXRlIGNoaWxkLlwiLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCI8a20tdHBsPiByZXF1aXJlcyA8dGVtcGxhdGU+IGNoaWxkLlwiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMudHBsID0ga2FzaW1pcl90cGwodGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2hpbGQodGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIHRoaXMudHBsLnJlbmRlckluKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLnNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGV2YWwoXCJzY29wZSA9IFwiICsgdGhpcy5fYXR0cnMuc2NvcGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYXR0cnMuYmluZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRwbC5iaW5kKGV2YWwodGhpcy5fYXR0cnMuYmluZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYXR0cnMub2JzZXJ2ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgb2JzZXJ2ZWQgPSBldmFsKHRoaXMuX2F0dHJzLm9ic2VydmUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhvYnNlcnZlZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JzZXJ2ZWQgIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIm9ic2VydmVkIHZhcmlhYmxlICdcIiArIHRoaXMuX2F0dHJzLm9ic2VydmUgKyBcIicgaXMgdHlwZW9mIFwiICsgKHR5cGVvZiBvYnNlcnZlZCkgKyBcIiBidXQgb2JqZWN0IHJlcXVpcmVkXCI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHBsLm9ic2VydmUob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUgKyBcIiBpbiBlbGVtZW50IFwiLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxKTtcblxuXG4gICAgfVxuXG4gICAgZGlzY29ubmVjdENhbGxiYWNrKCkge1xuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLXRwbFwiLCBLbVRwbEVsZW0pO1xuXG4iXX0=
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUva2FzaW1pcl9lbGVtLmpzIiwiY29yZS9rYXNpbWlyLmpzIiwiY29yZS9LYXNpbWlyQmluZGVyLmpzIiwiY29yZS9LYXNpbWlyRGVib3VuY2VyLmpzIiwiZm9ybS9rYXNpbWlyX2Zvcm0uanMiLCJmb3JtL2thc2ltaXItZm9ybS1zZXJpYWxpemVyLmpzIiwiZm9ybS9LYXNpbWlyRm9ybS5qcyIsImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJrYXNpbWlyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudHxzdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHZvaWR9IHBhcmVudFxuICogQHJldHVybiB7SFRNTEVsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZWxlbShzZWxlY3RvciwgcGFyZW50KSB7XG4gICAgaWYgKHR5cGVvZiBwYXJlbnQgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50O1xuXG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0odW5kZWZpbmVkKTogdW5kZWZpbmVkIHZhbHVlIGluIHBhcmFtZXRlciAxXCI7XG5cbiAgICBsZXQgZWxlbSA9IG51bGw7XG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBlbGVtID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHNlbGVjdG9yICsgXCInKTogY2FuJ3QgZmluZCBlbGVtZW50LlwiO1xuICAgICAgICByZXR1cm4gZWxlbTtcbiAgICB9XG5cbiAgICBpZiAoICEgc2VsZWN0b3IgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgdHlwZW9mIHNlbGVjdG9yICsgXCInIGlzIG5vIHZhbGlkIEhUTUxFbGVtZW50XCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHN0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8dm9pZH0gcGFyZW50XG4gKiBAcmV0dXJuIHtIVE1MRWxlbWVudFtdfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX2VsZW1fYWxsKHNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICBpZiAodHlwZW9mIHBhcmVudCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQ7XG5cbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSh1bmRlZmluZWQpOiB1bmRlZmluZWQgdmFsdWUgaW4gcGFyYW1ldGVyIDFcIjtcblxuICAgIGxldCBlbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGVsZW0gPSBwYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGlmIChlbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgc2VsZWN0b3IgKyBcIicpOiBjYW4ndCBmaW5kIGVsZW1lbnQuXCI7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cblxuICAgIGlmICggISBBcnJheS5pc0FycmF5KCBzZWxlY3RvcikpXG4gICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHR5cGVvZiBzZWxlY3RvciArIFwiJyBpcyBubyB2YWxpZCBIVE1MRWxlbWVudFtdXCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufSIsIlxuXG5mdW5jdGlvbiBrYXNpbWlyKGxvYWRmbikge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBsb2FkZm4pO1xufSIsIlxuY2xhc3MgS2FzaW1pckJpbmRlciB7XG5cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb25jaGFuZ2UgPSBudWxsO1xuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge29iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX29ic2VydmVkT2JqID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvYmpcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIGJpbmQob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYmluZChcIiArIHR5cGVvZiBvYmogKyBcIik6IHBhcmFtZXRlciBtdXN0IGJlIG9iamVjdC5cIik7XG4gICAgICAgIGlmICh0aGlzLl9pbnRlcnZhbCAhPT0gbnVsbClcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhckludGVydmFsKHRoaXMuX2ludGVydmFsKTtcblxuICAgICAgICB0aGlzLl9vYnNlcnZlZE9iaiA9IG9iajtcbiAgICAgICAgY29uc29sZS5sb2coXCJzZXRcIik7XG4gICAgICAgIHRoaXMuX2ludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGUgPT4ge1xuICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KG9iaikgIT09IHRoaXMuX29ic2VydmVkTGFzdFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBKU09OLnN0cmluZ2lmeShvYmopO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vbmNoYW5nZSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fb25jaGFuZ2Uob2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuZXdWYWx1ZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJCaW5kZXJ9XG4gICAgICovXG4gICAgc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKG5ld1ZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLl9vYnNlcnZlZE9iaiA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IFwibm8gb2JqZWN0IGlzIGJpbmQoKS4gY2FsbCBiaW5kKCkgYmVmb3JlIHNldERhdGFXaXRob3V0VHJpZ2dlcigpXCI7XG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5fb2JzZXJ2ZWRPYmosIG5ld1ZhbHVlKTtcbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBKU09OLnN0cmluZ2lmeSh0aGlzLl9vYnNlcnZlZE9iaik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIHNldE9uQ2hhbmdlKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuX29uY2hhbmdlID0gY2FsbGJhY2s7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG5cbn0iLCJcblxuXG5jbGFzcyBLYXNpbWlyRGVib3VuY2VyIHtcblxuXG4gICAgY29uc3RydWN0b3IoY2FsbGJhY2ssIHRpbWVvdXQ9MzAwKSB7XG4gICAgICAgIHRoaXMuY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICAgICAgdGhpcy50aW1lb3V0ID0gdGltZW91dDtcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IG51bGw7XG4gICAgfVxuXG4gICAgZGVib3VuY2UoKSB7XG4gICAgICAgIGlmICh0aGlzLl90aW1lb3V0ICE9PSBudWxsKVxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0KVxuICAgICAgICB0aGlzLl90aW1lb3V0ID0gd2luZG93LnNldFRpbWVvdXQodGhpcy5jYWxsYmFjaywgdGhpcy50aW1lb3V0KTtcbiAgICB9XG5cbiAgICB0cmlnZ2VyKCkge1xuICAgICAgICBpZiAodGhpcy5fdGltZW91dCAhPT0gbnVsbClcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fdGltZW91dClcbiAgICAgICAgdGhpcy5jYWxsYmFjaygpO1xuICAgIH1cblxufSIsIi8qKlxuICpcbiAqIEBwYXJhbSBzZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pckZvcm19XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZm9ybShzZWxlY3Rvcikge1xuICAgIHJldHVybiBuZXcgS2FzaW1pckZvcm0oc2VsZWN0b3IpO1xufSIsIlxuY2xhc3MgS2FzaW1pckZvcm1TZXJpYWxpemVyIHtcblxuICAgIHN0YXRpYyBFbGVtR2V0VmFsdWUgKGZvcm1TZWxlY3RvciwgcGFyZW50KSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3RvciwgcGFyZW50KTtcblxuICAgICAgICBzd2l0Y2ggKGZvcm0udGFnTmFtZSkge1xuICAgICAgICAgICAgY2FzZSBcIklOUFVUXCI6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChmb3JtLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNoZWNrYm94XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJyYWRpb1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvcm0uY2hlY2tlZCA9PSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmb3JtLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBcIlNFTEVDVFwiOlxuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtLnZhbHVlO1xuXG4gICAgICAgICAgICBjYXNlIFwiVEVYVEFSRUFcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybS52YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgc3RhdGljIEVsZW1TZXRWYWx1ZSAoZm9ybVNlbGVjdG9yLCBuZXdWYWx1ZSwgcGFyZW50KSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3RvciwgcGFyZW50KTtcbiAgICAgICAgc3dpdGNoIChmb3JtLnRhZ05hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJJTlBVVFwiOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZm9ybS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjaGVja2JveFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwicmFkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdWYWx1ZSA9PSBmb3JtLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybS5jaGVja2VkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9ybS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvcm0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJTRUxFQ1RcIjpcbiAgICAgICAgICAgICAgICBmb3JtLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiVEVYVEFSRUFcIjpcbiAgICAgICAgICAgICAgICBmb3JtLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBzdGF0aWMgR2V0RGF0YShmb3JtU2VsZWN0b3IpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yKTtcbiAgICAgICAgbGV0IGRhdGEgPSB7fTtcblxuICAgICAgICBmb3IobGV0IGVsZW0gb2Yga2FzaW1pcl9lbGVtX2FsbChcImlucHV0LCBzZWxlY3QsIHRleHRhcmVhXCIsIGZvcm0pKSB7XG4gICAgICAgICAgICBsZXQgdmFsID0gdGhpcy5FbGVtR2V0VmFsdWUoZWxlbSk7XG4gICAgICAgICAgICBpZiAodmFsID09PSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgbGV0IG5hbWUgPSBlbGVtLm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBcIlwiKVxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbGVtLmlkO1xuXG4gICAgICAgICAgICBkYXRhW25hbWVdID0gdmFsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIHN0YXRpYyBTZXREYXRhKGZvcm1TZWxlY3RvciwgbmV3VmFsdWUpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yKTtcbiAgICAgICAgZm9yKGxldCBlbGVtIG9mIGthc2ltaXJfZWxlbV9hbGwoXCJpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYVwiLCBmb3JtKSkge1xuICAgICAgICAgICAgbGV0IG5hbWUgPSBlbGVtLm5hbWU7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBcIlwiKVxuICAgICAgICAgICAgICAgIG5hbWUgPSBlbGVtLmlkO1xuXG4gICAgICAgICAgICBsZXQgdmFsID0gbmV3VmFsdWVbbmFtZV07XG4gICAgICAgICAgICB0aGlzLkVsZW1TZXRWYWx1ZShlbGVtLCB2YWwpO1xuICAgICAgICB9XG4gICAgfVxuXG59IiwiXG5cbmNsYXNzIEthc2ltaXJGb3JtIHtcblxuICAgIGNvbnN0cnVjdG9yKHNlbGVjdG9yKSB7XG4gICAgICAgIHRoaXMuZm9ybSA9IGthc2ltaXJfZWxlbShzZWxlY3Rvcik7XG4gICAgICAgIHRoaXMuX2RlYm91bmNlciA9IG51bGw7XG4gICAgICAgIHRoaXMuX2JpbmRlciA9IG5ldyBLYXNpbWlyQmluZGVyKCk7XG4gICAgfVxuXG4gICAgZ2V0IGRhdGEgKCkge1xuICAgICAgICByZXR1cm4gS2FzaW1pckZvcm1TZXJpYWxpemVyLkdldERhdGEodGhpcy5mb3JtKTtcbiAgICB9XG5cbiAgICBzZXQgZGF0YSh2YWx1ZSkge1xuICAgICAgICBLYXNpbWlyRm9ybVNlcmlhbGl6ZXIuU2V0RGF0YSh0aGlzLmZvcm0sIHZhbHVlKTtcbiAgICAgICAgdGhpcy5fYmluZGVyLnNldERhdGFXaXRob3V0VHJpZ2dlcih2YWx1ZSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gb2JqZWN0XG4gICAgICogQHJldHVybiB7S2FzaW1pckZvcm19XG4gICAgICovXG4gICAgYmluZChvYmplY3QpIHtcbiAgICAgICAgdGhpcy5fYmluZGVyLmJpbmQob2JqZWN0KS5zZXREYXRhV2l0aG91dFRyaWdnZXIob2JqZWN0KS5zZXRPbkNoYW5nZSgob2JqKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmRhdGEgPSBvYmo7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBkZWJvdW5jZXIgPSB0aGlzLl9kZWJvdW5jZXIgPSBuZXcgS2FzaW1pckRlYm91bmNlcigoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9iaW5kZXIuc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKHRoaXMuZGF0YSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoZSkgPT4gZGVib3VuY2VyLnRyaWdnZXIoKSk7XG4gICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKGUpID0+IGRlYm91bmNlci5kZWJvdW5jZSgpKTtcbiAgICAgICAgdGhpcy5kYXRhID0gdGhpcy5kYXRhO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICAgICAqL1xuICAgIG9uc3VibWl0KGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKFwic3VibWl0XCIsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbn0iLCIvKipcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gcGFyYW1zXG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfaHR0cCh1cmwsIHBhcmFtcz17fSkge1xuICAgIHJldHVybiBuZXcgS2FzaW1pckh0dHBSZXF1ZXN0KHVybCwgcGFyYW1zKTtcbn0iLCJcblxuY2xhc3MgS2FzaW1pckh0dHBSZXF1ZXN0IHtcblxuICAgIGNvbnN0cnVjdG9yKHVybCwgcGFyYW1zPXt9KSB7XG5cbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXHt8XFw6KShbYS16QS1aMC05X1xcLV0rKS8sIChtYXRjaCwgcDEsIHAyKSA9PiB7XG4gICAgICAgICAgICBpZiAoICEgcGFyYW1zLmhhc093blByb3BlcnR5KHAyKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBcInBhcmFtZXRlciAnXCIgKyBwMiArIFwiJyBtaXNzaW5nIGluIHVybCAnXCIgKyB1cmwgKyBcIidcIjtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVVUkkocGFyYW1zW3AyXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgICAgICAgYm9keTogbnVsbCxcbiAgICAgICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgb25FcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGRhdGE6IG51bGxcbiAgICAgICAgfTtcblxuXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQWRkIGFkZGl0aW9uYWwgcXVlcnkgcGFyYW1ldGVycyB0byB1cmxcbiAgICAgKlxuICAgICAqIEBwYXJhbSBwYXJhbXNcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aFBhcmFtcyhwYXJhbXMpIHtcbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdC51cmwuaW5kZXhPZihcIj9cIikgPT09IC0xKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IFwiP1wiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBcIiZcIjtcbiAgICAgICAgfVxuICAgICAgICBsZXQgc3RyID0gW107XG4gICAgICAgIGZvciAobGV0IG5hbWUgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICAgICAgICAgICAgc3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KG5hbWUpICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQocGFyYW1zW25hbWVdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBzdHIuam9pbihcIiZcIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG1ldGhvZFxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoTWV0aG9kKG1ldGhvZCkge1xuICAgICAgICB0aGlzLnJlcXVlc3QubWV0aG9kID0gbWV0aG9kO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSB0b2tlblxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQmVhcmVyVG9rZW4odG9rZW4pIHtcbiAgICAgICAgdGhpcy53aXRoSGVhZGVycyh7XCJhdXRob3JpemF0aW9uXCI6IFwiYmFlcmVyIFwiICsgdG9rZW59KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBoZWFkZXJzXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnJlcXVlc3QuaGVhZGVycywgaGVhZGVycyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYm9keVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQm9keShib2R5KSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QubWV0aG9kID09PSBcIkdFVFwiKVxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IFwiUE9TVFwiO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShib2R5KSB8fCB0eXBlb2YgYm9keSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgYm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgICAgICAgICAgdGhpcy53aXRoSGVhZGVycyh7XCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVxdWVzdC5ib2R5ID0gYm9keTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE9uRXJyb3IoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IgPSBjYWxsYmFjaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0IGpzb24oZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kKChyZXMpID0+IHtcbiAgICAgICAgICAgIGZuKHJlcy5nZXRCb2R5SnNvbigpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0IHBsYWluKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keSgpKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBzZW5kKG9uU3VjY2Vzc0ZuKSB7XG4gICAgICAgIGxldCB4aHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIHhodHRwLm9wZW4odGhpcy5yZXF1ZXN0Lm1ldGhvZCwgdGhpcy5yZXF1ZXN0LnVybCk7XG4gICAgICAgIGZvciAobGV0IGhlYWRlck5hbWUgaW4gdGhpcy5yZXF1ZXN0LmhlYWRlcnMpIHtcbiAgICAgICAgICAgIHhodHRwLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyTmFtZSwgdGhpcy5yZXF1ZXN0LmhlYWRlcnNbaGVhZGVyTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHhodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHR0cC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJva1wiLCB4aHR0cCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5vbkVycm9yICE9PSBudWxsICYmIHhodHRwLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IobmV3IEthc2ltaXJIdHRwUmVzcG9uc2UoeGh0dHAucmVzcG9uc2UsIHhodHRwLnN0YXR1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9uU3VjY2Vzc0ZuKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcblxuICAgICAgICB4aHR0cC5zZW5kKHRoaXMucmVxdWVzdC5ib2R5KTtcbiAgICB9XG5cbn0iLCJcblxuY2xhc3MgS2FzaW1pckh0dHBSZXNwb25zZSB7XG5cblxuICAgIGNvbnN0cnVjdG9yIChib2R5LCBzdGF0dXMsIHJlcXVlc3QpIHtcbiAgICAgICAgdGhpcy5ib2R5ID0gYm9keTtcbiAgICAgICAgdGhpcy5zdGF0dXMgPSBzdGF0dXM7XG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9XG4gICAgICovXG4gICAgZ2V0Qm9keUpzb24oKSB7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHRoaXMuYm9keSlcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3N0cmluZ31cbiAgICAgKi9cbiAgICBnZXRCb2R5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5ib2R5O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc09rKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdGF0dXMgPT09IDIwMDtcbiAgICB9XG5cbn0iLCJcblxuXG5jbGFzcyBLbUlucHV0RWxlbSBleHRlbmRzIEhUTUxJbnB1dEVsZW1lbnQge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG4gICAgICAgIHRoaXMuX2F0dHJzID0ge1xuICAgICAgICAgICAgYmluZDogbnVsbCxcbiAgICAgICAgICAgIG9ic2VydmU6IG51bGwsXG4gICAgICAgICAgICBzY29wZTogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICAgIH07XG5cbiAgICB9XG5cblxuICAgIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCkgeyByZXR1cm4gW1wiYmluZFwiXTsgfVxuXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICB0aGlzLl9hdHRyc1tuYW1lXSA9IG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuICAgICAgICBjb25zb2xlLmxvZyhcImNvbm5lY3RlZCEhIVwiLCB0aGlzKTtcbiAgICAgICAgY29uc29sZS5sb2cod2luZG93LnN0YXR1cyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBldmFsKHRoaXMuX2F0dHJzLmJpbmQpO1xuXG4gICAgICAgICAgICB0aGlzLm9uY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2hhbmdlXCIsIHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgIGV2YWwodGhpcy5fYXR0cnMuYmluZCArIFwiID0gdGhpcy52YWx1ZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihlICsgXCIgaW4gZWxlbWVudCBcIiwgdGhpcyk7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKFwia20taW5wdXRcIiwgS21JbnB1dEVsZW0sIHtleHRlbmRzOiBcImlucHV0XCJ9KTtcblxuIiwiXG5cbi8qKlxuICpcbiAqIEBwYXJhbSB0ZW1wbGF0ZVNlbGVjdG9yXG4gKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfdHBsKHRlbXBsYXRlU2VsZWN0b3IpIHtcbiAgICBsZXQgdHBsRWxlbSA9IGthc2ltaXJfZWxlbSh0ZW1wbGF0ZVNlbGVjdG9yKTtcbiAgICBsZXQgcmVuZGVyZXIgPSBuZXcgS2FzaW1pclJlbmRlcmVyKCk7XG4gICAgcmV0dXJuIHJlbmRlcmVyLnJlbmRlcih0cGxFbGVtKTtcbn1cblxuIiwiXG5cbmNsYXNzIEthc2ltaXJSZW5kZXJlciB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyUHJlZml4PVwiKlwiKSB7XG4gICAgICAgIHRoaXMuX2F0dHJQcmVmaXggPSBhdHRyUHJlZml4XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKSB7XG4gICAgICAgIGxldCByZXQgPSBcIlwiO1xuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcylcbiAgICAgICAgICAgIHJldCArPSBcIiBcIiArIGF0dHIubmFtZSArIFwiPVxcXCJcIiArIGF0dHIudmFsdWUgKyBcIlxcXCJcIjtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cblxuICAgIF9hZGRzbGFzaGVzKHN0cmluZykge1xuICAgICAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHUwMDA4L2csICdcXFxcYicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx0L2csICdcXFxcdCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxuL2csICdcXFxcbicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxmL2csICdcXFxcZicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxyL2csICdcXFxccicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvJy9nLCAnXFxcXFxcJycpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBfZ2V0TG9naWMoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0ge29wZW46XCJcIiwgY2xvc2U6XCJcIiwgaGFuZGxlcjp7fX07XG5cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpKSB7XG4gICAgICAgICAgICByZXQub3BlbiArPSBcImlmKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiaWZcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImZvclwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJmb3IoXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgbGV0IG1hdGNoZXMgPSBhdHRyLm5hbWUubWF0Y2goL15vbiguKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVzID09PSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmV0LmhhbmRsZXJbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge05vZGV9XG4gICAgICogQHBhcmFtIHBhdGgge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gZGVwdGhcbiAgICAgKi9cbiAgICBfcmVuZGVyKGRvbW5vZGUsIHBhdGgsIGRlcHRoKSB7XG4gICAgICAgIGxldCBvdXQgPSBcIlwiO1xuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcblxuICAgICAgICAgICAgbGV0IGxvZ2ljID0gdGhpcy5fZ2V0TG9naWMoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgYXR0clN0ciA9IHRoaXMuX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKTtcbiAgICAgICAgICAgIGxldCBjdXJQYXRoID0gcGF0aCArIFwiID4gXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5vcGVuO1xuXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fX2RlYnVnX3BhdGhfXyA9ICdcIiArIHRoaXMuX2FkZHNsYXNoZXMoY3VyUGF0aCkgKyBcIic7XCI7XG4gICAgICAgICAgICBpZiAoZG9tbm9kZS50YWdOYW1lID09PSBcIlNDUklQVFwiKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuZXZhbChgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKTtcIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUoXCJpc1wiKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicsIHtpczogJ1wiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUoXCJpc1wiKSArIFwiJ30pO1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdcIiArIGRvbW5vZGUudGFnTmFtZSArIFwiJyk7XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCh0aGlzLl9hdHRyUHJlZml4KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLnNldEF0dHJpYnV0ZSgnXCIgKyBhdHRyLm5hbWUgKyBcIicsIGBcIiArIGF0dHIudmFsdWUgKyBcImApO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBoYW5kbGVyTmFtZSBpbiBsb2dpYy5oYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0uXCIgKyBoYW5kbGVyTmFtZSArIFwiID0gZnVuY3Rpb24oZSl7IFwiICsgbG9naWMuaGFuZGxlcltoYW5kbGVyTmFtZV0gKyBcIiB9O1wiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoIC0gMSkgKyBcIl0uYXBwZW5kQ2hpbGQoX2VbXCIgKyBkZXB0aCArIFwiXSk7XCI7XG4gICAgICAgICAgICAgICAgLy8gb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDxcIiArIGRvbW5vZGUudGFnTmFtZSArIGF0dHJTdHIgKyBcIj5gO1wiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGNoaWxkIG9mIGRvbW5vZGUuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGNoaWxkLCBjdXJQYXRoLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDwvXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIj5gO1wiXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5cIiArIGxvZ2ljLmNsb3NlO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBUZXh0KSB7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+ICh0ZXh0KVwiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyAoZGVwdGgtMSkgK1wiXS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKSk7XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dFxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgb3V0ID0gXCJ2YXIgX19kZWJ1Z19wYXRoX18gPSAnKHJvb3QpJztcIjtcbiAgICAgICAgb3V0ICs9IFwiXFxudmFyIF9lID0gW2RvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXTtcIjtcblxuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuXG4gICAgICAgICAgICBmb3IgKGxldCBjdXJDaGlsZCBvZiBkb21ub2RlLmNvbnRlbnQuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoY3VyQ2hpbGQsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoZG9tbm9kZSwgIFwiKHJvb3QpXCIsIDEpO1xuICAgICAgICB9XG5cblxuICAgICAgICBsZXQgeG91dCA9IGBcbiAgICAgICAgICAgIGZuID0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgICAgICAgICAgIGxldCBmbnMgPSBbXTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAke291dH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdFcnJvciBpbiAnICsgX19kZWJ1Z19wYXRoX18gKyAnOiAnICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9lWzBdO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgYDtcblxuICAgICAgICAvLyBjb25zb2xlLmxvZyh4b3V0KTtcbiAgICAgICAgbGV0IGZuIDtcbiAgICAgICAgZXZhbCh4b3V0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBLYXNpbWlyVGVtcGxhdGUoZm4pO1xuICAgIH1cblxufVxuXG4iLCJjbGFzcyBLYXNpbWlyVGVtcGxhdGUge1xuXG4gICAgY29uc3RydWN0b3IodHBsRm4pIHtcbiAgICAgICAgdGhpcy5fdHBsRm4gPSB0cGxGbjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2JpbmRlciA9IG5ldyBLYXNpbWlyQmluZGVyKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tU2VsZWN0b3Ige3N0cmluZ3xIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuIEthc2ltaXJUZW1wbGF0ZVxuICAgICAqL1xuICAgIHJlbmRlckluKGRvbVNlbGVjdG9yKSB7XG4gICAgICAgIGxldCBub2RlID0gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBkb21TZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZG9tU2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJiaW5kKCk6IGNhbid0IGZpbmQgZWxlbWVudCAnXCIgKyBkb21TZWxlY3RvciArIFwiJ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbVNlbGVjdG9yIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb21TZWxlY3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBwYXJhbWV0ZXIxIGlzIG5vdCBhIEh0bWxFbGVtZW50XCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcmVuZGVySW5FbGVtZW50ID0gbm9kZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBzY29wZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5fcmVuZGVySW5FbGVtZW50LnJlcGxhY2VDaGlsZCh0aGlzLl90cGxGbihzY29wZSksIHRoaXMuX3JlbmRlckluRWxlbWVudC5maXJzdENoaWxkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgb2JzZXJ2ZShzY29wZSkge1xuICAgICAgICB0aGlzLnJlbmRlcihzY29wZSk7XG4gICAgICAgIHRoaXMuX2JpbmRlci5iaW5kKHNjb3BlKS5zZXRPbkNoYW5nZSgoKT0+dGhpcy5yZW5kZXIoc2NvcGUpKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG59XG5cbiIsIlxuXG5cbmNsYXNzIEttVHBsRWxlbSBleHRlbmRzIEhUTUxFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX2F0dHJzID0ge1xuICAgICAgICAgICAgYmluZDogbnVsbCxcbiAgICAgICAgICAgIG9ic2VydmU6IG51bGwsXG4gICAgICAgICAgICBzY29wZTogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRwbCA9IG51bGw7XG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIiwgXCJvYnNlcnZlXCIsIFwic2NvcGVcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgd2luZG93LnNldFRpbWVvdXQoKCk9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCB0ZW1wbGF0ZSA9IHRoaXMucXVlcnlTZWxlY3RvcihcInRlbXBsYXRlXCIpO1xuICAgICAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiPGttLXRwbD4gaGFzIG5vIHRlbXBsYXRlIGNoaWxkLlwiLCB0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCI8a20tdHBsPiByZXF1aXJlcyA8dGVtcGxhdGU+IGNoaWxkLlwiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRoaXMudHBsID0ga2FzaW1pcl90cGwodGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQ2hpbGQodGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIHRoaXMudHBsLnJlbmRlckluKHRoaXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLnNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGV2YWwoXCJzY29wZSA9IFwiICsgdGhpcy5fYXR0cnMuc2NvcGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYXR0cnMuYmluZCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRwbC5iaW5kKGV2YWwodGhpcy5fYXR0cnMuYmluZCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fYXR0cnMub2JzZXJ2ZSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgb2JzZXJ2ZWQgPSBldmFsKHRoaXMuX2F0dHJzLm9ic2VydmUpO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhvYnNlcnZlZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JzZXJ2ZWQgIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIm9ic2VydmVkIHZhcmlhYmxlICdcIiArIHRoaXMuX2F0dHJzLm9ic2VydmUgKyBcIicgaXMgdHlwZW9mIFwiICsgKHR5cGVvZiBvYnNlcnZlZCkgKyBcIiBidXQgb2JqZWN0IHJlcXVpcmVkXCI7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudHBsLm9ic2VydmUob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGUgKyBcIiBpbiBlbGVtZW50IFwiLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxKTtcblxuXG4gICAgfVxuXG4gICAgZGlzY29ubmVjdENhbGxiYWNrKCkge1xuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLXRwbFwiLCBLbVRwbEVsZW0pO1xuXG4iXX0=
