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
            throw "bind(" + typeof obj + "): parameter must be object.";
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUva2FzaW1pcl9lbGVtLmpzIiwiY29yZS9rYXNpbWlyLmpzIiwiY29yZS9LYXNpbWlyQmluZGVyLmpzIiwiY29yZS9LYXNpbWlyRGVib3VuY2VyLmpzIiwiZm9ybS9rYXNpbWlyX2Zvcm0uanMiLCJmb3JtL2thc2ltaXItZm9ybS1zZXJpYWxpemVyLmpzIiwiZm9ybS9LYXNpbWlyRm9ybS5qcyIsImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJrYXNpbWlyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudHxzdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHZvaWR9IHBhcmVudFxuICogQHJldHVybiB7SFRNTEVsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZWxlbShzZWxlY3RvciwgcGFyZW50KSB7XG4gICAgaWYgKHR5cGVvZiBwYXJlbnQgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50O1xuXG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0odW5kZWZpbmVkKTogdW5kZWZpbmVkIHZhbHVlIGluIHBhcmFtZXRlciAxXCI7XG5cbiAgICBsZXQgZWxlbSA9IG51bGw7XG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBlbGVtID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHNlbGVjdG9yICsgXCInKTogY2FuJ3QgZmluZCBlbGVtZW50LlwiO1xuICAgICAgICByZXR1cm4gZWxlbTtcbiAgICB9XG5cbiAgICBpZiAoICEgc2VsZWN0b3IgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgdHlwZW9mIHNlbGVjdG9yICsgXCInIGlzIG5vIHZhbGlkIEhUTUxFbGVtZW50XCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHN0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8dm9pZH0gcGFyZW50XG4gKiBAcmV0dXJuIHtIVE1MRWxlbWVudFtdfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX2VsZW1fYWxsKHNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICBpZiAodHlwZW9mIHBhcmVudCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQ7XG5cbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSh1bmRlZmluZWQpOiB1bmRlZmluZWQgdmFsdWUgaW4gcGFyYW1ldGVyIDFcIjtcblxuICAgIGxldCBlbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGVsZW0gPSBwYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGlmIChlbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgc2VsZWN0b3IgKyBcIicpOiBjYW4ndCBmaW5kIGVsZW1lbnQuXCI7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cblxuICAgIGlmICggISBBcnJheS5pc0FycmF5KCBzZWxlY3RvcikpXG4gICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHR5cGVvZiBzZWxlY3RvciArIFwiJyBpcyBubyB2YWxpZCBIVE1MRWxlbWVudFtdXCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufSIsIlxuXG5mdW5jdGlvbiBrYXNpbWlyKGxvYWRmbikge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBsb2FkZm4pO1xufSIsIlxuY2xhc3MgS2FzaW1pckJpbmRlciB7XG5cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb25jaGFuZ2UgPSBudWxsO1xuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge29iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX29ic2VydmVkT2JqID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvYmpcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIGJpbmQob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgdGhyb3cgXCJiaW5kKFwiICsgdHlwZW9mIG9iaiArIFwiKTogcGFyYW1ldGVyIG11c3QgYmUgb2JqZWN0LlwiO1xuICAgICAgICBpZiAodGhpcy5faW50ZXJ2YWwgIT09IG51bGwpXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbCk7XG5cbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRPYmogPSBvYmo7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic2V0XCIpO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbChlID0+IHtcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShvYmopICE9PSB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gSlNPTi5zdHJpbmdpZnkob2JqKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb25jaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uY2hhbmdlKG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3VmFsdWVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIHNldERhdGFXaXRob3V0VHJpZ2dlcihuZXdWYWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5fb2JzZXJ2ZWRPYmogPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvdyBcIm5vIG9iamVjdCBpcyBiaW5kKCkuIGNhbGwgYmluZCgpIGJlZm9yZSBzZXREYXRhV2l0aG91dFRyaWdnZXIoKVwiO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuX29ic2VydmVkT2JqLCBuZXdWYWx1ZSk7XG4gICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gSlNPTi5zdHJpbmdpZnkodGhpcy5fb2JzZXJ2ZWRPYmopO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckJpbmRlcn1cbiAgICAgKi9cbiAgICBzZXRPbkNoYW5nZShjYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vbmNoYW5nZSA9IGNhbGxiYWNrO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuXG59IiwiXG5cblxuY2xhc3MgS2FzaW1pckRlYm91bmNlciB7XG5cblxuICAgIGNvbnN0cnVjdG9yKGNhbGxiYWNrLCB0aW1lb3V0PTMwMCkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSBudWxsO1xuICAgIH1cblxuICAgIGRlYm91bmNlKCkge1xuICAgICAgICBpZiAodGhpcy5fdGltZW91dCAhPT0gbnVsbClcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fdGltZW91dClcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KHRoaXMuY2FsbGJhY2ssIHRoaXMudGltZW91dCk7XG4gICAgfVxuXG4gICAgdHJpZ2dlcigpIHtcbiAgICAgICAgaWYgKHRoaXMuX3RpbWVvdXQgIT09IG51bGwpXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpXG4gICAgICAgIHRoaXMuY2FsbGJhY2soKTtcbiAgICB9XG5cbn0iLCIvKipcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX2Zvcm0oc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gbmV3IEthc2ltaXJGb3JtKHNlbGVjdG9yKTtcbn0iLCJcbmNsYXNzIEthc2ltaXJGb3JtU2VyaWFsaXplciB7XG5cbiAgICBzdGF0aWMgRWxlbUdldFZhbHVlIChmb3JtU2VsZWN0b3IsIHBhcmVudCkge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IsIHBhcmVudCk7XG5cbiAgICAgICAgc3dpdGNoIChmb3JtLnRhZ05hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJJTlBVVFwiOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZm9ybS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjaGVja2JveFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwicmFkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3JtLmNoZWNrZWQgPT0gdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgXCJTRUxFQ1RcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybS52YWx1ZTtcblxuICAgICAgICAgICAgY2FzZSBcIlRFWFRBUkVBXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm0udmFsdWU7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHN0YXRpYyBFbGVtU2V0VmFsdWUgKGZvcm1TZWxlY3RvciwgbmV3VmFsdWUsIHBhcmVudCkge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IsIHBhcmVudCk7XG4gICAgICAgIHN3aXRjaCAoZm9ybS50YWdOYW1lKSB7XG4gICAgICAgICAgICBjYXNlIFwiSU5QVVRcIjpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGZvcm0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2hlY2tib3hcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJhZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUgPT0gZm9ybS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3JtLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiU0VMRUNUXCI6XG4gICAgICAgICAgICAgICAgZm9ybS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlRFWFRBUkVBXCI6XG4gICAgICAgICAgICAgICAgZm9ybS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhdGljIEdldERhdGEoZm9ybVNlbGVjdG9yKSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3Rvcik7XG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgZm9yKGxldCBlbGVtIG9mIGthc2ltaXJfZWxlbV9hbGwoXCJpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYVwiLCBmb3JtKSkge1xuICAgICAgICAgICAgbGV0IHZhbCA9IHRoaXMuRWxlbUdldFZhbHVlKGVsZW0pO1xuICAgICAgICAgICAgaWYgKHZhbCA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGxldCBuYW1lID0gZWxlbS5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT0gXCJcIilcbiAgICAgICAgICAgICAgICBuYW1lID0gZWxlbS5pZDtcblxuICAgICAgICAgICAgZGF0YVtuYW1lXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICBzdGF0aWMgU2V0RGF0YShmb3JtU2VsZWN0b3IsIG5ld1ZhbHVlKSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3Rvcik7XG4gICAgICAgIGZvcihsZXQgZWxlbSBvZiBrYXNpbWlyX2VsZW1fYWxsKFwiaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWFcIiwgZm9ybSkpIHtcbiAgICAgICAgICAgIGxldCBuYW1lID0gZWxlbS5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT0gXCJcIilcbiAgICAgICAgICAgICAgICBuYW1lID0gZWxlbS5pZDtcblxuICAgICAgICAgICAgbGV0IHZhbCA9IG5ld1ZhbHVlW25hbWVdO1xuICAgICAgICAgICAgdGhpcy5FbGVtU2V0VmFsdWUoZWxlbSwgdmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxufSIsIlxuXG5jbGFzcyBLYXNpbWlyRm9ybSB7XG5cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3Rvcikge1xuICAgICAgICB0aGlzLmZvcm0gPSBrYXNpbWlyX2VsZW0oc2VsZWN0b3IpO1xuICAgICAgICB0aGlzLl9kZWJvdW5jZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9iaW5kZXIgPSBuZXcgS2FzaW1pckJpbmRlcigpO1xuICAgIH1cblxuICAgIGdldCBkYXRhICgpIHtcbiAgICAgICAgcmV0dXJuIEthc2ltaXJGb3JtU2VyaWFsaXplci5HZXREYXRhKHRoaXMuZm9ybSk7XG4gICAgfVxuXG4gICAgc2V0IGRhdGEodmFsdWUpIHtcbiAgICAgICAgS2FzaW1pckZvcm1TZXJpYWxpemVyLlNldERhdGEodGhpcy5mb3JtLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMuX2JpbmRlci5zZXREYXRhV2l0aG91dFRyaWdnZXIodmFsdWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG9iamVjdFxuICAgICAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICAgICAqL1xuICAgIGJpbmQob2JqZWN0KSB7XG4gICAgICAgIHRoaXMuX2JpbmRlci5iaW5kKG9iamVjdCkuc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKG9iamVjdCkuc2V0T25DaGFuZ2UoKG9iaikgPT4ge1xuICAgICAgICAgICAgdGhpcy5kYXRhID0gb2JqO1xuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgZGVib3VuY2VyID0gdGhpcy5fZGVib3VuY2VyID0gbmV3IEthc2ltaXJEZWJvdW5jZXIoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fYmluZGVyLnNldERhdGFXaXRob3V0VHJpZ2dlcih0aGlzLmRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKGUpID0+IGRlYm91bmNlci50cmlnZ2VyKCkpO1xuICAgICAgICB0aGlzLmZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIChlKSA9PiBkZWJvdW5jZXIuZGVib3VuY2UoKSk7XG4gICAgICAgIHRoaXMuZGF0YSA9IHRoaXMuZGF0YTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyRm9ybX1cbiAgICAgKi9cbiAgICBvbnN1Ym1pdChjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG59IiwiLyoqXG4gKlxuICogQHBhcmFtIHVybFxuICogQHBhcmFtIHBhcmFtc1xuICovXG5mdW5jdGlvbiBrYXNpbWlyX2h0dHAodXJsLCBwYXJhbXM9e30pIHtcbiAgICByZXR1cm4gbmV3IEthc2ltaXJIdHRwUmVxdWVzdCh1cmwsIHBhcmFtcyk7XG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVxdWVzdCB7XG5cbiAgICBjb25zdHJ1Y3Rvcih1cmwsIHBhcmFtcz17fSkge1xuXG4gICAgICAgIHVybCA9IHVybC5yZXBsYWNlKC8oXFx7fFxcOikoW2EtekEtWjAtOV9cXC1dKykvLCAobWF0Y2gsIHAxLCBwMikgPT4ge1xuICAgICAgICAgICAgaWYgKCAhIHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwMikpXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJwYXJhbWV0ZXIgJ1wiICsgcDIgKyBcIicgbWlzc2luZyBpbiB1cmwgJ1wiICsgdXJsICsgXCInXCI7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlVVJJKHBhcmFtc1twMl0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnJlcXVlc3QgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogXCJHRVRcIixcbiAgICAgICAgICAgIGJvZHk6IG51bGwsXG4gICAgICAgICAgICBoZWFkZXJzOiB7fSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcInRleHRcIixcbiAgICAgICAgICAgIG9uRXJyb3I6IG51bGwsXG4gICAgICAgICAgICBkYXRhOiBudWxsXG4gICAgICAgIH07XG5cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBhZGRpdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdXJsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhQYXJhbXMocGFyYW1zKSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QudXJsLmluZGV4T2YoXCI/XCIpID09PSAtMSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBcIj9cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0ciA9IFtdO1xuICAgICAgICBmb3IgKGxldCBuYW1lIGluIHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChuYW1lKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1tuYW1lXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gc3RyLmpvaW4oXCImXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE1ldGhvZChtZXRob2QpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5cbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJlYXJlclRva2VuKHRva2VuKSB7XG4gICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiYXV0aG9yaXphdGlvblwiOiBcImJhZXJlciBcIiArIHRva2VufSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVhZGVyc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5yZXF1ZXN0LmhlYWRlcnMsIGhlYWRlcnMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGJvZHlcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJvZHkoYm9keSkge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0Lm1ldGhvZCA9PT0gXCJHRVRcIilcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBcIlBPU1RcIjtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYm9keSkgfHwgdHlwZW9mIGJvZHkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShib2R5KTtcbiAgICAgICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiY29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwifSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlcXVlc3QuYm9keSA9IGJvZHk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhPbkVycm9yKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yID0gY2FsbGJhY2s7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNldCBqc29uKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keUpzb24oKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNldCBwbGFpbihmbikge1xuICAgICAgICB0aGlzLnNlbmQoKHJlcykgPT4ge1xuICAgICAgICAgICAgZm4ocmVzLmdldEJvZHkoKSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgc2VuZChvblN1Y2Nlc3NGbikge1xuICAgICAgICBsZXQgeGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICB4aHR0cC5vcGVuKHRoaXMucmVxdWVzdC5tZXRob2QsIHRoaXMucmVxdWVzdC51cmwpO1xuICAgICAgICBmb3IgKGxldCBoZWFkZXJOYW1lIGluIHRoaXMucmVxdWVzdC5oZWFkZXJzKSB7XG4gICAgICAgICAgICB4aHR0cC5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlck5hbWUsIHRoaXMucmVxdWVzdC5oZWFkZXJzW2hlYWRlck5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICB4aHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoeGh0dHAucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwib2tcIiwgeGh0dHApO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlcXVlc3Qub25FcnJvciAhPT0gbnVsbCAmJiB4aHR0cC5zdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3NGbihuZXcgS2FzaW1pckh0dHBSZXNwb25zZSh4aHR0cC5yZXNwb25zZSwgeGh0dHAuc3RhdHVzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG5cbiAgICAgICAgeGh0dHAuc2VuZCh0aGlzLnJlcXVlc3QuYm9keSk7XG4gICAgfVxuXG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVzcG9uc2Uge1xuXG5cbiAgICBjb25zdHJ1Y3RvciAoYm9keSwgc3RhdHVzLCByZXF1ZXN0KSB7XG4gICAgICAgIHRoaXMuYm9keSA9IGJvZHk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldEJvZHlKc29uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmJvZHkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0Qm9keSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNPaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzID09PSAyMDA7XG4gICAgfVxuXG59IiwiXG5cblxuY2xhc3MgS21JbnB1dEVsZW0gZXh0ZW5kcyBIVE1MSW5wdXRFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWQhISFcIiwgdGhpcyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHdpbmRvdy5zdGF0dXMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZXZhbCh0aGlzLl9hdHRycy5iaW5kKTtcblxuICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYW5nZVwiLCB0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuX2F0dHJzLmJpbmQgKyBcIiA9IHRoaXMudmFsdWVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLWlucHV0XCIsIEttSW5wdXRFbGVtLCB7ZXh0ZW5kczogXCJpbnB1dFwifSk7XG5cbiIsIlxuXG4vKipcbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX3RwbCh0ZW1wbGF0ZVNlbGVjdG9yKSB7XG4gICAgbGV0IHRwbEVsZW0gPSBrYXNpbWlyX2VsZW0odGVtcGxhdGVTZWxlY3Rvcik7XG4gICAgbGV0IHJlbmRlcmVyID0gbmV3IEthc2ltaXJSZW5kZXJlcigpO1xuICAgIHJldHVybiByZW5kZXJlci5yZW5kZXIodHBsRWxlbSk7XG59XG5cbiIsIlxuXG5jbGFzcyBLYXNpbWlyUmVuZGVyZXIge1xuXG4gICAgY29uc3RydWN0b3IoYXR0clByZWZpeD1cIipcIikge1xuICAgICAgICB0aGlzLl9hdHRyUHJlZml4ID0gYXR0clByZWZpeFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIF9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0gXCJcIjtcbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpXG4gICAgICAgICAgICByZXQgKz0gXCIgXCIgKyBhdHRyLm5hbWUgKyBcIj1cXFwiXCIgKyBhdHRyLnZhbHVlICsgXCJcXFwiXCI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG5cbiAgICBfYWRkc2xhc2hlcyhzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx1MDAwOC9nLCAnXFxcXGInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcci9nLCAnXFxcXHInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoLycvZywgJ1xcXFxcXCcnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgX2dldExvZ2ljKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IHJldCA9IHtvcGVuOlwiXCIsIGNsb3NlOlwiXCIsIGhhbmRsZXI6e319O1xuXG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJpZlwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJpZihcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikpIHtcbiAgICAgICAgICAgIHJldC5vcGVuICs9IFwiZm9yKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiZm9yXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGxldCBtYXRjaGVzID0gYXR0ci5uYW1lLm1hdGNoKC9eb24oLispLyk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHJldC5oYW5kbGVyW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtOb2RlfVxuICAgICAqIEBwYXJhbSBwYXRoIHtTdHJpbmd9XG4gICAgICogQHBhcmFtIGRlcHRoXG4gICAgICovXG4gICAgX3JlbmRlcihkb21ub2RlLCBwYXRoLCBkZXB0aCkge1xuICAgICAgICBsZXQgb3V0ID0gXCJcIjtcblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG5cbiAgICAgICAgICAgIGxldCBsb2dpYyA9IHRoaXMuX2dldExvZ2ljKGRvbW5vZGUpO1xuICAgICAgICAgICAgbGV0IGF0dHJTdHIgPSB0aGlzLl9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+IFwiICsgZG9tbm9kZS50YWdOYW1lICsgYXR0clN0cjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcblwiICsgbG9naWMub3BlbjtcblxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgaWYgKGRvbW5vZGUudGFnTmFtZSA9PT0gXCJTQ1JJUFRcIikge1xuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbmV2YWwoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCk7XCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKFwiaXNcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCInLCB7aXM6ICdcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKFwiaXNcIikgKyBcIid9KTtcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicpO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgodGhpcy5fYXR0clByZWZpeCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXS5zZXRBdHRyaWJ1dGUoJ1wiICsgYXR0ci5uYW1lICsgXCInLCBgXCIgKyBhdHRyLnZhbHVlICsgXCJgKTtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaGFuZGxlck5hbWUgaW4gbG9naWMuaGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLlwiICsgaGFuZGxlck5hbWUgKyBcIiA9IGZ1bmN0aW9uKGUpeyBcIiArIGxvZ2ljLmhhbmRsZXJbaGFuZGxlck5hbWVdICsgXCIgfTtcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIChkZXB0aCAtIDEpICsgXCJdLmFwcGVuZENoaWxkKF9lW1wiICsgZGVwdGggKyBcIl0pO1wiO1xuICAgICAgICAgICAgICAgIC8vIG91dCArPSBcIlxcbl9faHRtbF9fICs9IGA8XCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyICsgXCI+YDtcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZCBvZiBkb21ub2RlLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihjaGlsZCwgY3VyUGF0aCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL291dCArPSBcIlxcbl9faHRtbF9fICs9IGA8L1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCI+YDtcIlxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5jbG9zZTtcbiAgICAgICAgfSBlbHNlIGlmIChkb21ub2RlIGluc3RhbmNlb2YgVGV4dCkge1xuICAgICAgICAgICAgbGV0IGN1clBhdGggPSBwYXRoICsgXCIgPiAodGV4dClcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9fZGVidWdfcGF0aF9fID0gJ1wiICsgdGhpcy5fYWRkc2xhc2hlcyhjdXJQYXRoKSArIFwiJztcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoLTEpICtcIl0uYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCkpO1wiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IG91dCA9IFwidmFyIF9fZGVidWdfcGF0aF9fID0gJyhyb290KSc7XCI7XG4gICAgICAgIG91dCArPSBcIlxcbnZhciBfZSA9IFtkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKV07XCI7XG5cblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcblxuICAgICAgICAgICAgZm9yIChsZXQgY3VyQ2hpbGQgb2YgZG9tbm9kZS5jb250ZW50LmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGN1ckNoaWxkLCAgXCIocm9vdClcIiwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGRvbW5vZGUsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgbGV0IHhvdXQgPSBgXG4gICAgICAgICAgICBmbiA9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICAgICAgICAgICBsZXQgZm5zID0gW107XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHtvdXR9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRXJyb3IgaW4gJyArIF9fZGVidWdfcGF0aF9fICsgJzogJyArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBfZVswXTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIGA7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coeG91dCk7XG4gICAgICAgIGxldCBmbiA7XG4gICAgICAgIGV2YWwoeG91dCk7XG4gICAgICAgIHJldHVybiBuZXcgS2FzaW1pclRlbXBsYXRlKGZuKTtcbiAgICB9XG5cbn1cblxuIiwiY2xhc3MgS2FzaW1pclRlbXBsYXRlIHtcblxuICAgIGNvbnN0cnVjdG9yKHRwbEZuKSB7XG4gICAgICAgIHRoaXMuX3RwbEZuID0gdHBsRm47XG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9yZW5kZXJJbkVsZW1lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLl9iaW5kZXIgPSBuZXcgS2FzaW1pckJpbmRlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbVNlbGVjdG9yIHtzdHJpbmd8SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVybiBLYXNpbWlyVGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXJJbihkb21TZWxlY3Rvcikge1xuICAgICAgICBsZXQgbm9kZSA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgZG9tU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGRvbVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgZG9tU2VsZWN0b3IgKyBcIidcIjtcbiAgICAgICAgfSBlbHNlIGlmIChkb21TZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBub2RlID0gZG9tU2VsZWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBcImJpbmQoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudCA9IG5vZGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKHNjb3BlKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudC5yZXBsYWNlQ2hpbGQodGhpcy5fdHBsRm4oc2NvcGUpLCB0aGlzLl9yZW5kZXJJbkVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIG9ic2VydmUoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICB0aGlzLl9iaW5kZXIuYmluZChzY29wZSkuc2V0T25DaGFuZ2UoKCk9PnRoaXMucmVuZGVyKHNjb3BlKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxufVxuXG4iLCJcblxuXG5jbGFzcyBLbVRwbEVsZW0gZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50cGwgPSBudWxsO1xuICAgIH1cblxuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbXCJiaW5kXCIsIFwib2JzZXJ2ZVwiLCBcInNjb3BlXCJdOyB9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sobmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2F0dHJzW25hbWVdID0gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoXCJ0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIjxrbS10cGw+IGhhcyBubyB0ZW1wbGF0ZSBjaGlsZC5cIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiPGttLXRwbD4gcmVxdWlyZXMgPHRlbXBsYXRlPiBjaGlsZC5cIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnRwbCA9IGthc2ltaXJfdHBsKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRwbC5yZW5kZXJJbih0aGlzKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5zY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBldmFsKFwic2NvcGUgPSBcIiArIHRoaXMuX2F0dHJzLnNjb3BlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLmJpbmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cGwuYmluZChldmFsKHRoaXMuX2F0dHJzLmJpbmQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLm9ic2VydmUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9ic2VydmVkID0gZXZhbCh0aGlzLl9hdHRycy5vYnNlcnZlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9ic2VydmVkICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJvYnNlcnZlZCB2YXJpYWJsZSAnXCIgKyB0aGlzLl9hdHRycy5vYnNlcnZlICsgXCInIGlzIHR5cGVvZiBcIiArICh0eXBlb2Ygb2JzZXJ2ZWQpICsgXCIgYnV0IG9iamVjdCByZXF1aXJlZFwiO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRwbC5vYnNlcnZlKG9ic2VydmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlICsgXCIgaW4gZWxlbWVudCBcIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMSk7XG5cblxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RDYWxsYmFjaygpIHtcblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS10cGxcIiwgS21UcGxFbGVtKTtcblxuIl19
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUva2FzaW1pcl9lbGVtLmpzIiwiY29yZS9rYXNpbWlyLmpzIiwiY29yZS9LYXNpbWlyQmluZGVyLmpzIiwiY29yZS9LYXNpbWlyRGVib3VuY2VyLmpzIiwiZm9ybS9rYXNpbWlyX2Zvcm0uanMiLCJmb3JtL2thc2ltaXItZm9ybS1zZXJpYWxpemVyLmpzIiwiZm9ybS9LYXNpbWlyRm9ybS5qcyIsImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJrYXNpbWlyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudHxzdHJpbmd9IHNlbGVjdG9yXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHZvaWR9IHBhcmVudFxuICogQHJldHVybiB7SFRNTEVsZW1lbnR9XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZWxlbShzZWxlY3RvciwgcGFyZW50KSB7XG4gICAgaWYgKHR5cGVvZiBwYXJlbnQgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHBhcmVudCA9IGRvY3VtZW50O1xuXG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0odW5kZWZpbmVkKTogdW5kZWZpbmVkIHZhbHVlIGluIHBhcmFtZXRlciAxXCI7XG5cbiAgICBsZXQgZWxlbSA9IG51bGw7XG4gICAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBlbGVtID0gcGFyZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoZWxlbSA9PT0gbnVsbClcbiAgICAgICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHNlbGVjdG9yICsgXCInKTogY2FuJ3QgZmluZCBlbGVtZW50LlwiO1xuICAgICAgICByZXR1cm4gZWxlbTtcbiAgICB9XG5cbiAgICBpZiAoICEgc2VsZWN0b3IgaW5zdGFuY2VvZiBIVE1MRWxlbWVudClcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgdHlwZW9mIHNlbGVjdG9yICsgXCInIGlzIG5vIHZhbGlkIEhUTUxFbGVtZW50XCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufVxuXG4vKipcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHN0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8dm9pZH0gcGFyZW50XG4gKiBAcmV0dXJuIHtIVE1MRWxlbWVudFtdfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX2VsZW1fYWxsKHNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICBpZiAodHlwZW9mIHBhcmVudCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQ7XG5cbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSh1bmRlZmluZWQpOiB1bmRlZmluZWQgdmFsdWUgaW4gcGFyYW1ldGVyIDFcIjtcblxuICAgIGxldCBlbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGVsZW0gPSBwYXJlbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3Rvcik7XG4gICAgICAgIGlmIChlbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgc2VsZWN0b3IgKyBcIicpOiBjYW4ndCBmaW5kIGVsZW1lbnQuXCI7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cblxuICAgIGlmICggISBBcnJheS5pc0FycmF5KCBzZWxlY3RvcikpXG4gICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKCdcIiArIHR5cGVvZiBzZWxlY3RvciArIFwiJyBpcyBubyB2YWxpZCBIVE1MRWxlbWVudFtdXCI7XG4gICAgcmV0dXJuIHNlbGVjdG9yO1xufSIsIlxuXG5mdW5jdGlvbiBrYXNpbWlyKGxvYWRmbikge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwibG9hZFwiLCBsb2FkZm4pO1xufSIsIlxuY2xhc3MgS2FzaW1pckJpbmRlciB7XG5cblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IG51bGw7XG4gICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb25jaGFuZ2UgPSBudWxsO1xuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge29iamVjdH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX29ic2VydmVkT2JqID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvYmpcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIGJpbmQob2JqKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgdGhyb3cgXCJiaW5kKFwiICsgdHlwZW9mIG9iaiArIFwiKTogcGFyYW1ldGVyIG11c3QgYmUgb2JqZWN0LlwiO1xuICAgICAgICBpZiAodGhpcy5faW50ZXJ2YWwgIT09IG51bGwpXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbCh0aGlzLl9pbnRlcnZhbCk7XG5cbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRPYmogPSBvYmo7XG4gICAgICAgIGNvbnNvbGUubG9nKFwic2V0XCIpO1xuICAgICAgICB0aGlzLl9pbnRlcnZhbCA9IHdpbmRvdy5zZXRJbnRlcnZhbChlID0+IHtcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShvYmopICE9PSB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gSlNPTi5zdHJpbmdpZnkob2JqKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb25jaGFuZ2UgIT09IG51bGwpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX29uY2hhbmdlKG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDIwMCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmV3VmFsdWVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyQmluZGVyfVxuICAgICAqL1xuICAgIHNldERhdGFXaXRob3V0VHJpZ2dlcihuZXdWYWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5fb2JzZXJ2ZWRPYmogPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvdyBcIm5vIG9iamVjdCBpcyBiaW5kKCkuIGNhbGwgYmluZCgpIGJlZm9yZSBzZXREYXRhV2l0aG91dFRyaWdnZXIoKVwiO1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMuX29ic2VydmVkT2JqLCBuZXdWYWx1ZSk7XG4gICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gSlNPTi5zdHJpbmdpZnkodGhpcy5fb2JzZXJ2ZWRPYmopO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckJpbmRlcn1cbiAgICAgKi9cbiAgICBzZXRPbkNoYW5nZShjYWxsYmFjaykge1xuICAgICAgICB0aGlzLl9vbmNoYW5nZSA9IGNhbGxiYWNrO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuXG59IiwiXG5cblxuY2xhc3MgS2FzaW1pckRlYm91bmNlciB7XG5cblxuICAgIGNvbnN0cnVjdG9yKGNhbGxiYWNrLCB0aW1lb3V0PTMwMCkge1xuICAgICAgICB0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gICAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSBudWxsO1xuICAgIH1cblxuICAgIGRlYm91bmNlKCkge1xuICAgICAgICBpZiAodGhpcy5fdGltZW91dCAhPT0gbnVsbClcbiAgICAgICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGhpcy5fdGltZW91dClcbiAgICAgICAgdGhpcy5fdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KHRoaXMuY2FsbGJhY2ssIHRoaXMudGltZW91dCk7XG4gICAgfVxuXG4gICAgdHJpZ2dlcigpIHtcbiAgICAgICAgaWYgKHRoaXMuX3RpbWVvdXQgIT09IG51bGwpXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpXG4gICAgICAgIHRoaXMuY2FsbGJhY2soKTtcbiAgICB9XG5cbn0iLCIvKipcbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX2Zvcm0oc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gbmV3IEthc2ltaXJGb3JtKHNlbGVjdG9yKTtcbn0iLCJcbmNsYXNzIEthc2ltaXJGb3JtU2VyaWFsaXplciB7XG5cbiAgICBzdGF0aWMgRWxlbUdldFZhbHVlIChmb3JtU2VsZWN0b3IsIHBhcmVudCkge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IsIHBhcmVudCk7XG5cbiAgICAgICAgc3dpdGNoIChmb3JtLnRhZ05hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgXCJJTlBVVFwiOlxuICAgICAgICAgICAgICAgIHN3aXRjaCAoZm9ybS50eXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjaGVja2JveFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwicmFkaW9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3JtLmNoZWNrZWQgPT0gdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm9ybS52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhc2UgXCJTRUxFQ1RcIjpcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybS52YWx1ZTtcblxuICAgICAgICAgICAgY2FzZSBcIlRFWFRBUkVBXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm0udmFsdWU7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIHN0YXRpYyBFbGVtU2V0VmFsdWUgKGZvcm1TZWxlY3RvciwgbmV3VmFsdWUsIHBhcmVudCkge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IsIHBhcmVudCk7XG4gICAgICAgIHN3aXRjaCAoZm9ybS50YWdOYW1lKSB7XG4gICAgICAgICAgICBjYXNlIFwiSU5QVVRcIjpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGZvcm0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2hlY2tib3hcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJhZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3VmFsdWUgPT0gZm9ybS52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm0uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvcm0uY2hlY2tlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3JtLnZhbHVlID0gbmV3VmFsdWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFwiU0VMRUNUXCI6XG4gICAgICAgICAgICAgICAgZm9ybS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlRFWFRBUkVBXCI6XG4gICAgICAgICAgICAgICAgZm9ybS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgc3RhdGljIEdldERhdGEoZm9ybVNlbGVjdG9yKSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3Rvcik7XG4gICAgICAgIGxldCBkYXRhID0ge307XG5cbiAgICAgICAgZm9yKGxldCBlbGVtIG9mIGthc2ltaXJfZWxlbV9hbGwoXCJpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYVwiLCBmb3JtKSkge1xuICAgICAgICAgICAgbGV0IHZhbCA9IHRoaXMuRWxlbUdldFZhbHVlKGVsZW0pO1xuICAgICAgICAgICAgaWYgKHZhbCA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIGxldCBuYW1lID0gZWxlbS5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT0gXCJcIilcbiAgICAgICAgICAgICAgICBuYW1lID0gZWxlbS5pZDtcblxuICAgICAgICAgICAgZGF0YVtuYW1lXSA9IHZhbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9XG5cbiAgICBzdGF0aWMgU2V0RGF0YShmb3JtU2VsZWN0b3IsIG5ld1ZhbHVlKSB7XG4gICAgICAgIGxldCBmb3JtID0ga2FzaW1pcl9lbGVtKGZvcm1TZWxlY3Rvcik7XG4gICAgICAgIGZvcihsZXQgZWxlbSBvZiBrYXNpbWlyX2VsZW1fYWxsKFwiaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWFcIiwgZm9ybSkpIHtcbiAgICAgICAgICAgIGxldCBuYW1lID0gZWxlbS5uYW1lO1xuICAgICAgICAgICAgaWYgKG5hbWUgPT0gXCJcIilcbiAgICAgICAgICAgICAgICBuYW1lID0gZWxlbS5pZDtcblxuICAgICAgICAgICAgbGV0IHZhbCA9IG5ld1ZhbHVlW25hbWVdO1xuICAgICAgICAgICAgdGhpcy5FbGVtU2V0VmFsdWUoZWxlbSwgdmFsKTtcbiAgICAgICAgfVxuICAgIH1cblxufSIsIlxuXG5jbGFzcyBLYXNpbWlyRm9ybSB7XG5cbiAgICBjb25zdHJ1Y3RvcihzZWxlY3Rvcikge1xuICAgICAgICB0aGlzLmZvcm0gPSBrYXNpbWlyX2VsZW0oc2VsZWN0b3IpO1xuICAgICAgICB0aGlzLl9kZWJvdW5jZXIgPSBudWxsO1xuICAgICAgICB0aGlzLl9iaW5kZXIgPSBuZXcgS2FzaW1pckJpbmRlcigpO1xuICAgIH1cblxuICAgIGdldCBkYXRhICgpIHtcbiAgICAgICAgcmV0dXJuIEthc2ltaXJGb3JtU2VyaWFsaXplci5HZXREYXRhKHRoaXMuZm9ybSk7XG4gICAgfVxuXG4gICAgc2V0IGRhdGEodmFsdWUpIHtcbiAgICAgICAgS2FzaW1pckZvcm1TZXJpYWxpemVyLlNldERhdGEodGhpcy5mb3JtLCB2YWx1ZSk7XG4gICAgICAgIHRoaXMuX2JpbmRlci5zZXREYXRhV2l0aG91dFRyaWdnZXIodmFsdWUpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG9iamVjdFxuICAgICAqIEByZXR1cm4ge0thc2ltaXJGb3JtfVxuICAgICAqL1xuICAgIGJpbmQob2JqZWN0KSB7XG4gICAgICAgIHRoaXMuX2JpbmRlci5iaW5kKG9iamVjdCkuc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKG9iamVjdCkuc2V0T25DaGFuZ2UoKG9iaikgPT4ge1xuICAgICAgICAgICAgdGhpcy5kYXRhID0gb2JqO1xuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgZGVib3VuY2VyID0gdGhpcy5fZGVib3VuY2VyID0gbmV3IEthc2ltaXJEZWJvdW5jZXIoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5fYmluZGVyLnNldERhdGFXaXRob3V0VHJpZ2dlcih0aGlzLmRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgKGUpID0+IGRlYm91bmNlci50cmlnZ2VyKCkpO1xuICAgICAgICB0aGlzLmZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIChlKSA9PiBkZWJvdW5jZXIuZGVib3VuY2UoKSk7XG4gICAgICAgIHRoaXMuZGF0YSA9IHRoaXMuZGF0YTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyRm9ybX1cbiAgICAgKi9cbiAgICBvbnN1Ym1pdChjYWxsYmFjaykge1xuICAgICAgICB0aGlzLmZvcm0uYWRkRXZlbnRMaXN0ZW5lcihcInN1Ym1pdFwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG59IiwiLyoqXG4gKlxuICogQHBhcmFtIHVybFxuICogQHBhcmFtIHBhcmFtc1xuICovXG5mdW5jdGlvbiBrYXNpbWlyX2h0dHAodXJsLCBwYXJhbXM9e30pIHtcbiAgICByZXR1cm4gbmV3IEthc2ltaXJIdHRwUmVxdWVzdCh1cmwsIHBhcmFtcyk7XG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVxdWVzdCB7XG5cbiAgICBjb25zdHJ1Y3Rvcih1cmwsIHBhcmFtcz17fSkge1xuXG4gICAgICAgIHVybCA9IHVybC5yZXBsYWNlKC8oXFx7fFxcOikoW2EtekEtWjAtOV9cXC1dKykvLCAobWF0Y2gsIHAxLCBwMikgPT4ge1xuICAgICAgICAgICAgaWYgKCAhIHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShwMikpXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJwYXJhbWV0ZXIgJ1wiICsgcDIgKyBcIicgbWlzc2luZyBpbiB1cmwgJ1wiICsgdXJsICsgXCInXCI7XG4gICAgICAgICAgICByZXR1cm4gZW5jb2RlVVJJKHBhcmFtc1twMl0pO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLnJlcXVlc3QgPSB7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogXCJHRVRcIixcbiAgICAgICAgICAgIGJvZHk6IG51bGwsXG4gICAgICAgICAgICBoZWFkZXJzOiB7fSxcbiAgICAgICAgICAgIGRhdGFUeXBlOiBcInRleHRcIixcbiAgICAgICAgICAgIG9uRXJyb3I6IG51bGwsXG4gICAgICAgICAgICBkYXRhOiBudWxsXG4gICAgICAgIH07XG5cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBhZGRpdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdXJsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhQYXJhbXMocGFyYW1zKSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QudXJsLmluZGV4T2YoXCI/XCIpID09PSAtMSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBcIj9cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0ciA9IFtdO1xuICAgICAgICBmb3IgKGxldCBuYW1lIGluIHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChuYW1lKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1tuYW1lXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gc3RyLmpvaW4oXCImXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE1ldGhvZChtZXRob2QpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5cbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJlYXJlclRva2VuKHRva2VuKSB7XG4gICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiYXV0aG9yaXphdGlvblwiOiBcImJhZXJlciBcIiArIHRva2VufSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVhZGVyc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5yZXF1ZXN0LmhlYWRlcnMsIGhlYWRlcnMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGJvZHlcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJvZHkoYm9keSkge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0Lm1ldGhvZCA9PT0gXCJHRVRcIilcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBcIlBPU1RcIjtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYm9keSkgfHwgdHlwZW9mIGJvZHkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShib2R5KTtcbiAgICAgICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiY29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwifSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlcXVlc3QuYm9keSA9IGJvZHk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhPbkVycm9yKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yID0gY2FsbGJhY2s7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNldCBqc29uKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keUpzb24oKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNldCBwbGFpbihmbikge1xuICAgICAgICB0aGlzLnNlbmQoKHJlcykgPT4ge1xuICAgICAgICAgICAgZm4ocmVzLmdldEJvZHkoKSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgc2VuZChvblN1Y2Nlc3NGbikge1xuICAgICAgICBsZXQgeGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICB4aHR0cC5vcGVuKHRoaXMucmVxdWVzdC5tZXRob2QsIHRoaXMucmVxdWVzdC51cmwpO1xuICAgICAgICBmb3IgKGxldCBoZWFkZXJOYW1lIGluIHRoaXMucmVxdWVzdC5oZWFkZXJzKSB7XG4gICAgICAgICAgICB4aHR0cC5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlck5hbWUsIHRoaXMucmVxdWVzdC5oZWFkZXJzW2hlYWRlck5hbWVdKTtcbiAgICAgICAgfVxuICAgICAgICB4aHR0cC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoeGh0dHAucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwib2tcIiwgeGh0dHApO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlcXVlc3Qub25FcnJvciAhPT0gbnVsbCAmJiB4aHR0cC5zdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3NGbihuZXcgS2FzaW1pckh0dHBSZXNwb25zZSh4aHR0cC5yZXNwb25zZSwgeGh0dHAuc3RhdHVzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG5cbiAgICAgICAgeGh0dHAuc2VuZCh0aGlzLnJlcXVlc3QuYm9keSk7XG4gICAgfVxuXG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVzcG9uc2Uge1xuXG5cbiAgICBjb25zdHJ1Y3RvciAoYm9keSwgc3RhdHVzLCByZXF1ZXN0KSB7XG4gICAgICAgIHRoaXMuYm9keSA9IGJvZHk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldEJvZHlKc29uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmJvZHkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0Qm9keSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNPaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzID09PSAyMDA7XG4gICAgfVxuXG59IiwiXG5cblxuY2xhc3MgS21JbnB1dEVsZW0gZXh0ZW5kcyBIVE1MSW5wdXRFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWQhISFcIiwgdGhpcyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHdpbmRvdy5zdGF0dXMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZXZhbCh0aGlzLl9hdHRycy5iaW5kKTtcblxuICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYW5nZVwiLCB0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuX2F0dHJzLmJpbmQgKyBcIiA9IHRoaXMudmFsdWVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLWlucHV0XCIsIEttSW5wdXRFbGVtLCB7ZXh0ZW5kczogXCJpbnB1dFwifSk7XG5cbiIsIlxuXG4vKipcbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX3RwbCh0ZW1wbGF0ZVNlbGVjdG9yKSB7XG4gICAgbGV0IHRwbEVsZW0gPSBrYXNpbWlyX2VsZW0odGVtcGxhdGVTZWxlY3Rvcik7XG4gICAgbGV0IHJlbmRlcmVyID0gbmV3IEthc2ltaXJSZW5kZXJlcigpO1xuICAgIHJldHVybiByZW5kZXJlci5yZW5kZXIodHBsRWxlbSk7XG59XG5cbiIsIlxuXG5jbGFzcyBLYXNpbWlyUmVuZGVyZXIge1xuXG4gICAgY29uc3RydWN0b3IoYXR0clByZWZpeD1cIipcIikge1xuICAgICAgICB0aGlzLl9hdHRyUHJlZml4ID0gYXR0clByZWZpeFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIF9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0gXCJcIjtcbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpXG4gICAgICAgICAgICByZXQgKz0gXCIgXCIgKyBhdHRyLm5hbWUgKyBcIj1cXFwiXCIgKyBhdHRyLnZhbHVlICsgXCJcXFwiXCI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG5cbiAgICBfYWRkc2xhc2hlcyhzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx1MDAwOC9nLCAnXFxcXGInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcci9nLCAnXFxcXHInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoLycvZywgJ1xcXFxcXCcnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgX2dldExvZ2ljKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IHJldCA9IHtvcGVuOlwiXCIsIGNsb3NlOlwiXCIsIGhhbmRsZXI6e319O1xuXG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJpZlwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJpZihcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikpIHtcbiAgICAgICAgICAgIHJldC5vcGVuICs9IFwiZm9yKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiZm9yXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGxldCBtYXRjaGVzID0gYXR0ci5uYW1lLm1hdGNoKC9eb24oLispLyk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHJldC5oYW5kbGVyW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtOb2RlfVxuICAgICAqIEBwYXJhbSBwYXRoIHtTdHJpbmd9XG4gICAgICogQHBhcmFtIGRlcHRoXG4gICAgICovXG4gICAgX3JlbmRlcihkb21ub2RlLCBwYXRoLCBkZXB0aCkge1xuICAgICAgICBsZXQgb3V0ID0gXCJcIjtcblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG5cbiAgICAgICAgICAgIGxldCBsb2dpYyA9IHRoaXMuX2dldExvZ2ljKGRvbW5vZGUpO1xuICAgICAgICAgICAgbGV0IGF0dHJTdHIgPSB0aGlzLl9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+IFwiICsgZG9tbm9kZS50YWdOYW1lICsgYXR0clN0cjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcblwiICsgbG9naWMub3BlbjtcblxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgaWYgKGRvbW5vZGUudGFnTmFtZSA9PT0gXCJTQ1JJUFRcIikge1xuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbmV2YWwoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCk7XCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKFwiaXNcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCInLCB7aXM6ICdcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKFwiaXNcIikgKyBcIid9KTtcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicpO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgodGhpcy5fYXR0clByZWZpeCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXS5zZXRBdHRyaWJ1dGUoJ1wiICsgYXR0ci5uYW1lICsgXCInLCBgXCIgKyBhdHRyLnZhbHVlICsgXCJgKTtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaGFuZGxlck5hbWUgaW4gbG9naWMuaGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLlwiICsgaGFuZGxlck5hbWUgKyBcIiA9IGZ1bmN0aW9uKGUpeyBcIiArIGxvZ2ljLmhhbmRsZXJbaGFuZGxlck5hbWVdICsgXCIgfTtcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIChkZXB0aCAtIDEpICsgXCJdLmFwcGVuZENoaWxkKF9lW1wiICsgZGVwdGggKyBcIl0pO1wiO1xuICAgICAgICAgICAgICAgIC8vIG91dCArPSBcIlxcbl9faHRtbF9fICs9IGA8XCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyICsgXCI+YDtcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZCBvZiBkb21ub2RlLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihjaGlsZCwgY3VyUGF0aCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL291dCArPSBcIlxcbl9faHRtbF9fICs9IGA8L1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCI+YDtcIlxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5jbG9zZTtcbiAgICAgICAgfSBlbHNlIGlmIChkb21ub2RlIGluc3RhbmNlb2YgVGV4dCkge1xuICAgICAgICAgICAgbGV0IGN1clBhdGggPSBwYXRoICsgXCIgPiAodGV4dClcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9fZGVidWdfcGF0aF9fID0gJ1wiICsgdGhpcy5fYWRkc2xhc2hlcyhjdXJQYXRoKSArIFwiJztcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoLTEpICtcIl0uYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCkpO1wiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IG91dCA9IFwidmFyIF9fZGVidWdfcGF0aF9fID0gJyhyb290KSc7XCI7XG4gICAgICAgIG91dCArPSBcIlxcbnZhciBfZSA9IFtkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKV07XCI7XG5cblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcblxuICAgICAgICAgICAgZm9yIChsZXQgY3VyQ2hpbGQgb2YgZG9tbm9kZS5jb250ZW50LmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGN1ckNoaWxkLCAgXCIocm9vdClcIiwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGRvbW5vZGUsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgbGV0IHhvdXQgPSBgXG4gICAgICAgICAgICBmbiA9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICAgICAgICAgICBsZXQgZm5zID0gW107XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHtvdXR9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRXJyb3IgaW4gJyArIF9fZGVidWdfcGF0aF9fICsgJzogJyArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBfZVswXTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIGA7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coeG91dCk7XG4gICAgICAgIGxldCBmbiA7XG4gICAgICAgIGV2YWwoeG91dCk7XG4gICAgICAgIHJldHVybiBuZXcgS2FzaW1pclRlbXBsYXRlKGZuKTtcbiAgICB9XG5cbn1cblxuIiwiY2xhc3MgS2FzaW1pclRlbXBsYXRlIHtcblxuICAgIGNvbnN0cnVjdG9yKHRwbEZuKSB7XG4gICAgICAgIHRoaXMuX3RwbEZuID0gdHBsRm47XG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9yZW5kZXJJbkVsZW1lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLl9iaW5kZXIgPSBuZXcgS2FzaW1pckJpbmRlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbVNlbGVjdG9yIHtzdHJpbmd8SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVybiBLYXNpbWlyVGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXJJbihkb21TZWxlY3Rvcikge1xuICAgICAgICBsZXQgbm9kZSA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgZG9tU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGRvbVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgZG9tU2VsZWN0b3IgKyBcIidcIjtcbiAgICAgICAgfSBlbHNlIGlmIChkb21TZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBub2RlID0gZG9tU2VsZWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBcImJpbmQoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudCA9IG5vZGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKHNjb3BlKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudC5yZXBsYWNlQ2hpbGQodGhpcy5fdHBsRm4oc2NvcGUpLCB0aGlzLl9yZW5kZXJJbkVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIG9ic2VydmUoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICB0aGlzLl9iaW5kZXIuYmluZChzY29wZSkuc2V0T25DaGFuZ2UoKCk9PnRoaXMucmVuZGVyKHNjb3BlKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxufVxuXG4iLCJcblxuXG5jbGFzcyBLbVRwbEVsZW0gZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50cGwgPSBudWxsO1xuICAgIH1cblxuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbXCJiaW5kXCIsIFwib2JzZXJ2ZVwiLCBcInNjb3BlXCJdOyB9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sobmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2F0dHJzW25hbWVdID0gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoXCJ0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIjxrbS10cGw+IGhhcyBubyB0ZW1wbGF0ZSBjaGlsZC5cIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiPGttLXRwbD4gcmVxdWlyZXMgPHRlbXBsYXRlPiBjaGlsZC5cIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnRwbCA9IGthc2ltaXJfdHBsKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRwbC5yZW5kZXJJbih0aGlzKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5zY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBldmFsKFwic2NvcGUgPSBcIiArIHRoaXMuX2F0dHJzLnNjb3BlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLmJpbmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cGwuYmluZChldmFsKHRoaXMuX2F0dHJzLmJpbmQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLm9ic2VydmUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9ic2VydmVkID0gZXZhbCh0aGlzLl9hdHRycy5vYnNlcnZlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9ic2VydmVkICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJvYnNlcnZlZCB2YXJpYWJsZSAnXCIgKyB0aGlzLl9hdHRycy5vYnNlcnZlICsgXCInIGlzIHR5cGVvZiBcIiArICh0eXBlb2Ygb2JzZXJ2ZWQpICsgXCIgYnV0IG9iamVjdCByZXF1aXJlZFwiO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRwbC5vYnNlcnZlKG9ic2VydmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlICsgXCIgaW4gZWxlbWVudCBcIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMSk7XG5cblxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RDYWxsYmFjaygpIHtcblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS10cGxcIiwgS21UcGxFbGVtKTtcblxuIl19
