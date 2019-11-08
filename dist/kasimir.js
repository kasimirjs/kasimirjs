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


var KASIMIR_HTTP_BLOCK_LIST = {};


class KasimirHttpRequest {

    constructor(url, params={}) {

        url = url.replace(/(\{|\:)([a-zA-Z0-9_\-]+)(\}|)/, (match, p1, p2) => {
            if ( ! params.hasOwnProperty(p2))
                throw "parameter '" + p2 + "' missing in url '" + url + "'";
            return encodeURIComponent(params[p2]);
        });

        this.request = {
            url: url,
            method: "GET",
            body: null,
            headers: {},
            dataType: "text",
            onError: null,
            data: null,
            blockerName: null
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
        this.withHeaders({"authorization": "bearer " + token});
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
     * @param name
     * @return {KasimirHttpRequest}
     */
    withBlocker(name) {
        this.request.blockerName = name;
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

        if (this.request.blockerName !== null) {
            if (KASIMIR_HTTP_BLOCK_LIST[this.request.blockerName] === true) {
                console.warn("Blocking request " + this.request.blockerName + " / blocking request still in process");
                return false;
            }
            KASIMIR_HTTP_BLOCK_LIST[this.request.blockerName] = true;
        }

        xhttp.open(this.request.method, this.request.url);
        for (let headerName in this.request.headers) {
            xhttp.setRequestHeader(headerName, this.request.headers[headerName]);
        }
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === 4) {
                if (this.request.blockerName !== null) {
                    KASIMIR_HTTP_BLOCK_LIST[this.request.blockerName] = false;
                }
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUva2FzaW1pcl9lbGVtLmpzIiwiY29yZS9rYXNpbWlyLmpzIiwiY29yZS9LYXNpbWlyQmluZGVyLmpzIiwiY29yZS9LYXNpbWlyRGVib3VuY2VyLmpzIiwiZm9ybS9rYXNpbWlyX2Zvcm0uanMiLCJmb3JtL2thc2ltaXItZm9ybS1zZXJpYWxpemVyLmpzIiwiZm9ybS9LYXNpbWlyRm9ybS5qcyIsImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Imthc2ltaXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHN0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8dm9pZH0gcGFyZW50XG4gKiBAcmV0dXJuIHtIVE1MRWxlbWVudH1cbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9lbGVtKHNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICBpZiAodHlwZW9mIHBhcmVudCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQ7XG5cbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSh1bmRlZmluZWQpOiB1bmRlZmluZWQgdmFsdWUgaW4gcGFyYW1ldGVyIDFcIjtcblxuICAgIGxldCBlbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGVsZW0gPSBwYXJlbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIGlmIChlbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgc2VsZWN0b3IgKyBcIicpOiBjYW4ndCBmaW5kIGVsZW1lbnQuXCI7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cblxuICAgIGlmICggISBzZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSgnXCIgKyB0eXBlb2Ygc2VsZWN0b3IgKyBcIicgaXMgbm8gdmFsaWQgSFRNTEVsZW1lbnRcIjtcbiAgICByZXR1cm4gc2VsZWN0b3I7XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8c3RyaW5nfSBzZWxlY3RvclxuICogQHBhcmFtIHtIVE1MRWxlbWVudHx2b2lkfSBwYXJlbnRcbiAqIEByZXR1cm4ge0hUTUxFbGVtZW50W119XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZWxlbV9hbGwoc2VsZWN0b3IsIHBhcmVudCkge1xuICAgIGlmICh0eXBlb2YgcGFyZW50ID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBwYXJlbnQgPSBkb2N1bWVudDtcblxuICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKHVuZGVmaW5lZCk6IHVuZGVmaW5lZCB2YWx1ZSBpbiBwYXJhbWV0ZXIgMVwiO1xuXG4gICAgbGV0IGVsZW0gPSBudWxsO1xuICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgZWxlbSA9IHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKGVsZW0gPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSgnXCIgKyBzZWxlY3RvciArIFwiJyk6IGNhbid0IGZpbmQgZWxlbWVudC5cIjtcbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuXG4gICAgaWYgKCAhIEFycmF5LmlzQXJyYXkoIHNlbGVjdG9yKSlcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgdHlwZW9mIHNlbGVjdG9yICsgXCInIGlzIG5vIHZhbGlkIEhUTUxFbGVtZW50W11cIjtcbiAgICByZXR1cm4gc2VsZWN0b3I7XG59IiwiXG5cbmZ1bmN0aW9uIGthc2ltaXIobG9hZGZuKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGxvYWRmbik7XG59IiwiXG5jbGFzcyBLYXNpbWlyQmluZGVyIHtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBudWxsO1xuICAgICAgICB0aGlzLl9vbmNoYW5nZSA9IG51bGw7XG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRPYmogPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG9ialxuICAgICAqIEByZXR1cm4ge0thc2ltaXJCaW5kZXJ9XG4gICAgICovXG4gICAgYmluZChvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJiaW5kKFwiICsgdHlwZW9mIG9iaiArIFwiKTogcGFyYW1ldGVyIG11c3QgYmUgb2JqZWN0LlwiKTtcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsICE9PSBudWxsKVxuICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWwpO1xuXG4gICAgICAgIHRoaXMuX29ic2VydmVkT2JqID0gb2JqO1xuICAgICAgICBjb25zb2xlLmxvZyhcInNldFwiKTtcbiAgICAgICAgdGhpcy5faW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoZSA9PiB7XG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkob2JqKSAhPT0gdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSA9IEpTT04uc3RyaW5naWZ5KG9iaik7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX29uY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbmNoYW5nZShvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAyMDApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1ZhbHVlXG4gICAgICogQHJldHVybiB7S2FzaW1pckJpbmRlcn1cbiAgICAgKi9cbiAgICBzZXREYXRhV2l0aG91dFRyaWdnZXIobmV3VmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX29ic2VydmVkT2JqID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJubyBvYmplY3QgaXMgYmluZCgpLiBjYWxsIGJpbmQoKSBiZWZvcmUgc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKClcIjtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLl9vYnNlcnZlZE9iaiwgbmV3VmFsdWUpO1xuICAgICAgICB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSA9IEpTT04uc3RyaW5naWZ5KHRoaXMuX29ic2VydmVkT2JqKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJCaW5kZXJ9XG4gICAgICovXG4gICAgc2V0T25DaGFuZ2UoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5fb25jaGFuZ2UgPSBjYWxsYmFjaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cblxufSIsIlxuXG5cbmNsYXNzIEthc2ltaXJEZWJvdW5jZXIge1xuXG5cbiAgICBjb25zdHJ1Y3RvcihjYWxsYmFjaywgdGltZW91dD0zMDApIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB0aGlzLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgICAgICB0aGlzLl90aW1lb3V0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3RpbWVvdXQgIT09IG51bGwpXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpXG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCh0aGlzLmNhbGxiYWNrLCB0aGlzLnRpbWVvdXQpO1xuICAgIH1cblxuICAgIHRyaWdnZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLl90aW1lb3V0ICE9PSBudWxsKVxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0KVxuICAgICAgICB0aGlzLmNhbGxiYWNrKCk7XG4gICAgfVxuXG59IiwiLyoqXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtLYXNpbWlyRm9ybX1cbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9mb3JtKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIG5ldyBLYXNpbWlyRm9ybShzZWxlY3Rvcik7XG59IiwiXG5jbGFzcyBLYXNpbWlyRm9ybVNlcmlhbGl6ZXIge1xuXG4gICAgc3RhdGljIEVsZW1HZXRWYWx1ZSAoZm9ybVNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yLCBwYXJlbnQpO1xuXG4gICAgICAgIHN3aXRjaCAoZm9ybS50YWdOYW1lKSB7XG4gICAgICAgICAgICBjYXNlIFwiSU5QVVRcIjpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGZvcm0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2hlY2tib3hcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJhZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9ybS5jaGVja2VkID09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm0udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFwiU0VMRUNUXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm0udmFsdWU7XG5cbiAgICAgICAgICAgIGNhc2UgXCJURVhUQVJFQVwiOlxuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgRWxlbVNldFZhbHVlIChmb3JtU2VsZWN0b3IsIG5ld1ZhbHVlLCBwYXJlbnQpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yLCBwYXJlbnQpO1xuICAgICAgICBzd2l0Y2ggKGZvcm0udGFnTmFtZSkge1xuICAgICAgICAgICAgY2FzZSBcIklOUFVUXCI6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChmb3JtLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNoZWNrYm94XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJyYWRpb1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlID09IGZvcm0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9ybS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlNFTEVDVFwiOlxuICAgICAgICAgICAgICAgIGZvcm0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJURVhUQVJFQVwiOlxuICAgICAgICAgICAgICAgIGZvcm0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXRpYyBHZXREYXRhKGZvcm1TZWxlY3Rvcikge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IpO1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuXG4gICAgICAgIGZvcihsZXQgZWxlbSBvZiBrYXNpbWlyX2VsZW1fYWxsKFwiaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWFcIiwgZm9ybSkpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSB0aGlzLkVsZW1HZXRWYWx1ZShlbGVtKTtcbiAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBsZXQgbmFtZSA9IGVsZW0ubmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09IFwiXCIpXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsZW0uaWQ7XG5cbiAgICAgICAgICAgIGRhdGFbbmFtZV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgc3RhdGljIFNldERhdGEoZm9ybVNlbGVjdG9yLCBuZXdWYWx1ZSkge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IpO1xuICAgICAgICBmb3IobGV0IGVsZW0gb2Yga2FzaW1pcl9lbGVtX2FsbChcImlucHV0LCBzZWxlY3QsIHRleHRhcmVhXCIsIGZvcm0pKSB7XG4gICAgICAgICAgICBsZXQgbmFtZSA9IGVsZW0ubmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09IFwiXCIpXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsZW0uaWQ7XG5cbiAgICAgICAgICAgIGxldCB2YWwgPSBuZXdWYWx1ZVtuYW1lXTtcbiAgICAgICAgICAgIHRoaXMuRWxlbVNldFZhbHVlKGVsZW0sIHZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCJcblxuY2xhc3MgS2FzaW1pckZvcm0ge1xuXG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3IpIHtcbiAgICAgICAgdGhpcy5mb3JtID0ga2FzaW1pcl9lbGVtKHNlbGVjdG9yKTtcbiAgICAgICAgdGhpcy5fZGVib3VuY2VyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYmluZGVyID0gbmV3IEthc2ltaXJCaW5kZXIoKTtcbiAgICB9XG5cbiAgICBnZXQgZGF0YSAoKSB7XG4gICAgICAgIHJldHVybiBLYXNpbWlyRm9ybVNlcmlhbGl6ZXIuR2V0RGF0YSh0aGlzLmZvcm0pO1xuICAgIH1cblxuICAgIHNldCBkYXRhKHZhbHVlKSB7XG4gICAgICAgIEthc2ltaXJGb3JtU2VyaWFsaXplci5TZXREYXRhKHRoaXMuZm9ybSwgdmFsdWUpO1xuICAgICAgICB0aGlzLl9iaW5kZXIuc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyRm9ybX1cbiAgICAgKi9cbiAgICBiaW5kKG9iamVjdCkge1xuICAgICAgICB0aGlzLl9iaW5kZXIuYmluZChvYmplY3QpLnNldERhdGFXaXRob3V0VHJpZ2dlcihvYmplY3QpLnNldE9uQ2hhbmdlKChvYmopID0+IHtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IG9iajtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGRlYm91bmNlciA9IHRoaXMuX2RlYm91bmNlciA9IG5ldyBLYXNpbWlyRGVib3VuY2VyKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRlci5zZXREYXRhV2l0aG91dFRyaWdnZXIodGhpcy5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIChlKSA9PiBkZWJvdW5jZXIudHJpZ2dlcigpKTtcbiAgICAgICAgdGhpcy5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4gZGVib3VuY2VyLmRlYm91bmNlKCkpO1xuICAgICAgICB0aGlzLmRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckZvcm19XG4gICAgICovXG4gICAgb25zdWJtaXQoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJzdWJtaXRcIiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxufSIsIi8qKlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9odHRwKHVybCwgcGFyYW1zPXt9KSB7XG4gICAgcmV0dXJuIG5ldyBLYXNpbWlySHR0cFJlcXVlc3QodXJsLCBwYXJhbXMpO1xufSIsIlxuXG52YXIgS0FTSU1JUl9IVFRQX0JMT0NLX0xJU1QgPSB7fTtcblxuXG5jbGFzcyBLYXNpbWlySHR0cFJlcXVlc3Qge1xuXG4gICAgY29uc3RydWN0b3IodXJsLCBwYXJhbXM9e30pIHtcblxuICAgICAgICB1cmwgPSB1cmwucmVwbGFjZSgvKFxce3xcXDopKFthLXpBLVowLTlfXFwtXSspKFxcfXwpLywgKG1hdGNoLCBwMSwgcDIpID0+IHtcbiAgICAgICAgICAgIGlmICggISBwYXJhbXMuaGFzT3duUHJvcGVydHkocDIpKVxuICAgICAgICAgICAgICAgIHRocm93IFwicGFyYW1ldGVyICdcIiArIHAyICsgXCInIG1pc3NpbmcgaW4gdXJsICdcIiArIHVybCArIFwiJ1wiO1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNbcDJdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXG4gICAgICAgICAgICBib2R5OiBudWxsLFxuICAgICAgICAgICAgaGVhZGVyczoge30sXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICBvbkVycm9yOiBudWxsLFxuICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgIGJsb2NrZXJOYW1lOiBudWxsXG4gICAgICAgIH07XG5cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBhZGRpdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdXJsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhQYXJhbXMocGFyYW1zKSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QudXJsLmluZGV4T2YoXCI/XCIpID09PSAtMSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBcIj9cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0ciA9IFtdO1xuICAgICAgICBmb3IgKGxldCBuYW1lIGluIHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChuYW1lKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1tuYW1lXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gc3RyLmpvaW4oXCImXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE1ldGhvZChtZXRob2QpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5cbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJlYXJlclRva2VuKHRva2VuKSB7XG4gICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiYXV0aG9yaXphdGlvblwiOiBcImJlYXJlciBcIiArIHRva2VufSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVhZGVyc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5yZXF1ZXN0LmhlYWRlcnMsIGhlYWRlcnMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCbG9ja2VyKG5hbWUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lID0gbmFtZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYm9keVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQm9keShib2R5KSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QubWV0aG9kID09PSBcIkdFVFwiKVxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IFwiUE9TVFwiO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShib2R5KSB8fCB0eXBlb2YgYm9keSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgYm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgICAgICAgICAgdGhpcy53aXRoSGVhZGVycyh7XCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVxdWVzdC5ib2R5ID0gYm9keTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE9uRXJyb3IoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IgPSBjYWxsYmFjaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0IGpzb24oZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kKChyZXMpID0+IHtcbiAgICAgICAgICAgIGZuKHJlcy5nZXRCb2R5SnNvbigpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0IHBsYWluKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keSgpKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBzZW5kKG9uU3VjY2Vzc0ZuKSB7XG4gICAgICAgIGxldCB4aHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChLQVNJTUlSX0hUVFBfQkxPQ0tfTElTVFt0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWVdID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQmxvY2tpbmcgcmVxdWVzdCBcIiArIHRoaXMucmVxdWVzdC5ibG9ja2VyTmFtZSArIFwiIC8gYmxvY2tpbmcgcmVxdWVzdCBzdGlsbCBpbiBwcm9jZXNzXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtBU0lNSVJfSFRUUF9CTE9DS19MSVNUW3RoaXMucmVxdWVzdC5ibG9ja2VyTmFtZV0gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgeGh0dHAub3Blbih0aGlzLnJlcXVlc3QubWV0aG9kLCB0aGlzLnJlcXVlc3QudXJsKTtcbiAgICAgICAgZm9yIChsZXQgaGVhZGVyTmFtZSBpbiB0aGlzLnJlcXVlc3QuaGVhZGVycykge1xuICAgICAgICAgICAgeGh0dHAuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXJOYW1lLCB0aGlzLnJlcXVlc3QuaGVhZGVyc1toZWFkZXJOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgeGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHhodHRwLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIEtBU0lNSVJfSFRUUF9CTE9DS19MSVNUW3RoaXMucmVxdWVzdC5ibG9ja2VyTmFtZV0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5vbkVycm9yICE9PSBudWxsICYmIHhodHRwLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IobmV3IEthc2ltaXJIdHRwUmVzcG9uc2UoeGh0dHAucmVzcG9uc2UsIHhodHRwLnN0YXR1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9uU3VjY2Vzc0ZuKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcblxuICAgICAgICB4aHR0cC5zZW5kKHRoaXMucmVxdWVzdC5ib2R5KTtcbiAgICB9XG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVzcG9uc2Uge1xuXG5cbiAgICBjb25zdHJ1Y3RvciAoYm9keSwgc3RhdHVzLCByZXF1ZXN0KSB7XG4gICAgICAgIHRoaXMuYm9keSA9IGJvZHk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldEJvZHlKc29uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmJvZHkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0Qm9keSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNPaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzID09PSAyMDA7XG4gICAgfVxuXG59IiwiXG5cblxuY2xhc3MgS21JbnB1dEVsZW0gZXh0ZW5kcyBIVE1MSW5wdXRFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWQhISFcIiwgdGhpcyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHdpbmRvdy5zdGF0dXMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZXZhbCh0aGlzLl9hdHRycy5iaW5kKTtcblxuICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYW5nZVwiLCB0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuX2F0dHJzLmJpbmQgKyBcIiA9IHRoaXMudmFsdWVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLWlucHV0XCIsIEttSW5wdXRFbGVtLCB7ZXh0ZW5kczogXCJpbnB1dFwifSk7XG5cbiIsIlxuXG4vKipcbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX3RwbCh0ZW1wbGF0ZVNlbGVjdG9yKSB7XG4gICAgbGV0IHRwbEVsZW0gPSBrYXNpbWlyX2VsZW0odGVtcGxhdGVTZWxlY3Rvcik7XG4gICAgbGV0IHJlbmRlcmVyID0gbmV3IEthc2ltaXJSZW5kZXJlcigpO1xuICAgIHJldHVybiByZW5kZXJlci5yZW5kZXIodHBsRWxlbSk7XG59XG5cbiIsIlxuXG5jbGFzcyBLYXNpbWlyUmVuZGVyZXIge1xuXG4gICAgY29uc3RydWN0b3IoYXR0clByZWZpeD1cIipcIikge1xuICAgICAgICB0aGlzLl9hdHRyUHJlZml4ID0gYXR0clByZWZpeFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIF9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0gXCJcIjtcbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpXG4gICAgICAgICAgICByZXQgKz0gXCIgXCIgKyBhdHRyLm5hbWUgKyBcIj1cXFwiXCIgKyBhdHRyLnZhbHVlICsgXCJcXFwiXCI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG5cbiAgICBfYWRkc2xhc2hlcyhzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx1MDAwOC9nLCAnXFxcXGInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcci9nLCAnXFxcXHInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoLycvZywgJ1xcXFxcXCcnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgX2dldExvZ2ljKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IHJldCA9IHtvcGVuOlwiXCIsIGNsb3NlOlwiXCIsIGhhbmRsZXI6e319O1xuXG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJpZlwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJpZihcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikpIHtcbiAgICAgICAgICAgIHJldC5vcGVuICs9IFwiZm9yKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiZm9yXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGxldCBtYXRjaGVzID0gYXR0ci5uYW1lLm1hdGNoKC9eb24oLispLyk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHJldC5oYW5kbGVyW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtOb2RlfVxuICAgICAqIEBwYXJhbSBwYXRoIHtTdHJpbmd9XG4gICAgICogQHBhcmFtIGRlcHRoXG4gICAgICovXG4gICAgX3JlbmRlcihkb21ub2RlLCBwYXRoLCBkZXB0aCkge1xuICAgICAgICBsZXQgb3V0ID0gXCJcIjtcblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG5cbiAgICAgICAgICAgIGxldCBsb2dpYyA9IHRoaXMuX2dldExvZ2ljKGRvbW5vZGUpO1xuICAgICAgICAgICAgbGV0IGF0dHJTdHIgPSB0aGlzLl9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+IFwiICsgZG9tbm9kZS50YWdOYW1lICsgYXR0clN0cjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcblwiICsgbG9naWMub3BlbjtcblxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgaWYgKGRvbW5vZGUudGFnTmFtZSA9PT0gXCJTQ1JJUFRcIikge1xuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbmV2YWwoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCk7XCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKFwiaXNcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCInLCB7aXM6ICdcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKFwiaXNcIikgKyBcIid9KTtcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicpO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgodGhpcy5fYXR0clByZWZpeCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXS5zZXRBdHRyaWJ1dGUoJ1wiICsgYXR0ci5uYW1lICsgXCInLCBgXCIgKyBhdHRyLnZhbHVlICsgXCJgKTtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaGFuZGxlck5hbWUgaW4gbG9naWMuaGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLlwiICsgaGFuZGxlck5hbWUgKyBcIiA9IGZ1bmN0aW9uKGUpeyBcIiArIGxvZ2ljLmhhbmRsZXJbaGFuZGxlck5hbWVdICsgXCIgfTtcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIChkZXB0aCAtIDEpICsgXCJdLmFwcGVuZENoaWxkKF9lW1wiICsgZGVwdGggKyBcIl0pO1wiO1xuICAgICAgICAgICAgICAgIC8vIG91dCArPSBcIlxcbl9faHRtbF9fICs9IGA8XCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyICsgXCI+YDtcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZCBvZiBkb21ub2RlLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihjaGlsZCwgY3VyUGF0aCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL291dCArPSBcIlxcbl9faHRtbF9fICs9IGA8L1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCI+YDtcIlxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5jbG9zZTtcbiAgICAgICAgfSBlbHNlIGlmIChkb21ub2RlIGluc3RhbmNlb2YgVGV4dCkge1xuICAgICAgICAgICAgbGV0IGN1clBhdGggPSBwYXRoICsgXCIgPiAodGV4dClcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9fZGVidWdfcGF0aF9fID0gJ1wiICsgdGhpcy5fYWRkc2xhc2hlcyhjdXJQYXRoKSArIFwiJztcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoLTEpICtcIl0uYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCkpO1wiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IG91dCA9IFwidmFyIF9fZGVidWdfcGF0aF9fID0gJyhyb290KSc7XCI7XG4gICAgICAgIG91dCArPSBcIlxcbnZhciBfZSA9IFtkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKV07XCI7XG5cblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcblxuICAgICAgICAgICAgZm9yIChsZXQgY3VyQ2hpbGQgb2YgZG9tbm9kZS5jb250ZW50LmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGN1ckNoaWxkLCAgXCIocm9vdClcIiwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGRvbW5vZGUsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgbGV0IHhvdXQgPSBgXG4gICAgICAgICAgICBmbiA9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICAgICAgICAgICBsZXQgZm5zID0gW107XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHtvdXR9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRXJyb3IgaW4gJyArIF9fZGVidWdfcGF0aF9fICsgJzogJyArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBfZVswXTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIGA7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coeG91dCk7XG4gICAgICAgIGxldCBmbiA7XG4gICAgICAgIGV2YWwoeG91dCk7XG4gICAgICAgIHJldHVybiBuZXcgS2FzaW1pclRlbXBsYXRlKGZuKTtcbiAgICB9XG5cbn1cblxuIiwiY2xhc3MgS2FzaW1pclRlbXBsYXRlIHtcblxuICAgIGNvbnN0cnVjdG9yKHRwbEZuKSB7XG4gICAgICAgIHRoaXMuX3RwbEZuID0gdHBsRm47XG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9yZW5kZXJJbkVsZW1lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLl9iaW5kZXIgPSBuZXcgS2FzaW1pckJpbmRlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbVNlbGVjdG9yIHtzdHJpbmd8SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVybiBLYXNpbWlyVGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXJJbihkb21TZWxlY3Rvcikge1xuICAgICAgICBsZXQgbm9kZSA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgZG9tU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGRvbVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgZG9tU2VsZWN0b3IgKyBcIidcIjtcbiAgICAgICAgfSBlbHNlIGlmIChkb21TZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBub2RlID0gZG9tU2VsZWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBcImJpbmQoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudCA9IG5vZGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKHNjb3BlKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudC5yZXBsYWNlQ2hpbGQodGhpcy5fdHBsRm4oc2NvcGUpLCB0aGlzLl9yZW5kZXJJbkVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIG9ic2VydmUoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICB0aGlzLl9iaW5kZXIuYmluZChzY29wZSkuc2V0T25DaGFuZ2UoKCk9PnRoaXMucmVuZGVyKHNjb3BlKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxufVxuXG4iLCJcblxuXG5jbGFzcyBLbVRwbEVsZW0gZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50cGwgPSBudWxsO1xuICAgIH1cblxuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbXCJiaW5kXCIsIFwib2JzZXJ2ZVwiLCBcInNjb3BlXCJdOyB9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sobmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2F0dHJzW25hbWVdID0gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoXCJ0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIjxrbS10cGw+IGhhcyBubyB0ZW1wbGF0ZSBjaGlsZC5cIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiPGttLXRwbD4gcmVxdWlyZXMgPHRlbXBsYXRlPiBjaGlsZC5cIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnRwbCA9IGthc2ltaXJfdHBsKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRwbC5yZW5kZXJJbih0aGlzKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5zY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBldmFsKFwic2NvcGUgPSBcIiArIHRoaXMuX2F0dHJzLnNjb3BlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLmJpbmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cGwuYmluZChldmFsKHRoaXMuX2F0dHJzLmJpbmQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLm9ic2VydmUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9ic2VydmVkID0gZXZhbCh0aGlzLl9hdHRycy5vYnNlcnZlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9ic2VydmVkICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJvYnNlcnZlZCB2YXJpYWJsZSAnXCIgKyB0aGlzLl9hdHRycy5vYnNlcnZlICsgXCInIGlzIHR5cGVvZiBcIiArICh0eXBlb2Ygb2JzZXJ2ZWQpICsgXCIgYnV0IG9iamVjdCByZXF1aXJlZFwiO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRwbC5vYnNlcnZlKG9ic2VydmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlICsgXCIgaW4gZWxlbWVudCBcIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMSk7XG5cblxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RDYWxsYmFjaygpIHtcblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS10cGxcIiwgS21UcGxFbGVtKTtcblxuIl19
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUva2FzaW1pcl9lbGVtLmpzIiwiY29yZS9rYXNpbWlyLmpzIiwiY29yZS9LYXNpbWlyQmluZGVyLmpzIiwiY29yZS9LYXNpbWlyRGVib3VuY2VyLmpzIiwiZm9ybS9rYXNpbWlyX2Zvcm0uanMiLCJmb3JtL2thc2ltaXItZm9ybS1zZXJpYWxpemVyLmpzIiwiZm9ybS9LYXNpbWlyRm9ybS5qcyIsImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Imthc2ltaXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fHN0cmluZ30gc2VsZWN0b3JcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8dm9pZH0gcGFyZW50XG4gKiBAcmV0dXJuIHtIVE1MRWxlbWVudH1cbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9lbGVtKHNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICBpZiAodHlwZW9mIHBhcmVudCA9PT0gXCJ1bmRlZmluZWRcIilcbiAgICAgICAgcGFyZW50ID0gZG9jdW1lbnQ7XG5cbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSh1bmRlZmluZWQpOiB1bmRlZmluZWQgdmFsdWUgaW4gcGFyYW1ldGVyIDFcIjtcblxuICAgIGxldCBlbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIGVsZW0gPSBwYXJlbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIGlmIChlbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgc2VsZWN0b3IgKyBcIicpOiBjYW4ndCBmaW5kIGVsZW1lbnQuXCI7XG4gICAgICAgIHJldHVybiBlbGVtO1xuICAgIH1cblxuICAgIGlmICggISBzZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KVxuICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSgnXCIgKyB0eXBlb2Ygc2VsZWN0b3IgKyBcIicgaXMgbm8gdmFsaWQgSFRNTEVsZW1lbnRcIjtcbiAgICByZXR1cm4gc2VsZWN0b3I7XG59XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR8c3RyaW5nfSBzZWxlY3RvclxuICogQHBhcmFtIHtIVE1MRWxlbWVudHx2b2lkfSBwYXJlbnRcbiAqIEByZXR1cm4ge0hUTUxFbGVtZW50W119XG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfZWxlbV9hbGwoc2VsZWN0b3IsIHBhcmVudCkge1xuICAgIGlmICh0eXBlb2YgcGFyZW50ID09PSBcInVuZGVmaW5lZFwiKVxuICAgICAgICBwYXJlbnQgPSBkb2N1bWVudDtcblxuICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFwidW5kZWZpbmVkXCIpXG4gICAgICAgIHRocm93IFwia2FzaW1pcl9lbGVtKHVuZGVmaW5lZCk6IHVuZGVmaW5lZCB2YWx1ZSBpbiBwYXJhbWV0ZXIgMVwiO1xuXG4gICAgbGV0IGVsZW0gPSBudWxsO1xuICAgIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgZWxlbSA9IHBhcmVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKGVsZW0gPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvdyBcImthc2ltaXJfZWxlbSgnXCIgKyBzZWxlY3RvciArIFwiJyk6IGNhbid0IGZpbmQgZWxlbWVudC5cIjtcbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuXG4gICAgaWYgKCAhIEFycmF5LmlzQXJyYXkoIHNlbGVjdG9yKSlcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX2VsZW0oJ1wiICsgdHlwZW9mIHNlbGVjdG9yICsgXCInIGlzIG5vIHZhbGlkIEhUTUxFbGVtZW50W11cIjtcbiAgICByZXR1cm4gc2VsZWN0b3I7XG59IiwiXG5cbmZ1bmN0aW9uIGthc2ltaXIobG9hZGZuKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGxvYWRmbik7XG59IiwiXG5jbGFzcyBLYXNpbWlyQmluZGVyIHtcblxuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHRoaXMuX2ludGVydmFsID0gbnVsbDtcbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBudWxsO1xuICAgICAgICB0aGlzLl9vbmNoYW5nZSA9IG51bGw7XG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fb2JzZXJ2ZWRPYmogPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG9ialxuICAgICAqIEByZXR1cm4ge0thc2ltaXJCaW5kZXJ9XG4gICAgICovXG4gICAgYmluZChvYmopIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvYmogIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJiaW5kKFwiICsgdHlwZW9mIG9iaiArIFwiKTogcGFyYW1ldGVyIG11c3QgYmUgb2JqZWN0LlwiKTtcbiAgICAgICAgaWYgKHRoaXMuX2ludGVydmFsICE9PSBudWxsKVxuICAgICAgICAgICAgd2luZG93LmNsZWFySW50ZXJ2YWwodGhpcy5faW50ZXJ2YWwpO1xuXG4gICAgICAgIHRoaXMuX29ic2VydmVkT2JqID0gb2JqO1xuICAgICAgICBjb25zb2xlLmxvZyhcInNldFwiKTtcbiAgICAgICAgdGhpcy5faW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoZSA9PiB7XG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkob2JqKSAhPT0gdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSA9IEpTT04uc3RyaW5naWZ5KG9iaik7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX29uY2hhbmdlICE9PSBudWxsKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9vbmNoYW5nZShvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAyMDApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIG5ld1ZhbHVlXG4gICAgICogQHJldHVybiB7S2FzaW1pckJpbmRlcn1cbiAgICAgKi9cbiAgICBzZXREYXRhV2l0aG91dFRyaWdnZXIobmV3VmFsdWUpIHtcbiAgICAgICAgaWYgKHRoaXMuX29ic2VydmVkT2JqID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJubyBvYmplY3QgaXMgYmluZCgpLiBjYWxsIGJpbmQoKSBiZWZvcmUgc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKClcIjtcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLl9vYnNlcnZlZE9iaiwgbmV3VmFsdWUpO1xuICAgICAgICB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSA9IEpTT04uc3RyaW5naWZ5KHRoaXMuX29ic2VydmVkT2JqKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJCaW5kZXJ9XG4gICAgICovXG4gICAgc2V0T25DaGFuZ2UoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5fb25jaGFuZ2UgPSBjYWxsYmFjaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cblxufSIsIlxuXG5cbmNsYXNzIEthc2ltaXJEZWJvdW5jZXIge1xuXG5cbiAgICBjb25zdHJ1Y3RvcihjYWxsYmFjaywgdGltZW91dD0zMDApIHtcbiAgICAgICAgdGhpcy5jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICB0aGlzLnRpbWVvdXQgPSB0aW1lb3V0O1xuICAgICAgICB0aGlzLl90aW1lb3V0ID0gbnVsbDtcbiAgICB9XG5cbiAgICBkZWJvdW5jZSgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3RpbWVvdXQgIT09IG51bGwpXG4gICAgICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuX3RpbWVvdXQpXG4gICAgICAgIHRoaXMuX3RpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCh0aGlzLmNhbGxiYWNrLCB0aGlzLnRpbWVvdXQpO1xuICAgIH1cblxuICAgIHRyaWdnZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLl90aW1lb3V0ICE9PSBudWxsKVxuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLl90aW1lb3V0KVxuICAgICAgICB0aGlzLmNhbGxiYWNrKCk7XG4gICAgfVxuXG59IiwiLyoqXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yXG4gKiBAcmV0dXJuIHtLYXNpbWlyRm9ybX1cbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9mb3JtKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIG5ldyBLYXNpbWlyRm9ybShzZWxlY3Rvcik7XG59IiwiXG5jbGFzcyBLYXNpbWlyRm9ybVNlcmlhbGl6ZXIge1xuXG4gICAgc3RhdGljIEVsZW1HZXRWYWx1ZSAoZm9ybVNlbGVjdG9yLCBwYXJlbnQpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yLCBwYXJlbnQpO1xuXG4gICAgICAgIHN3aXRjaCAoZm9ybS50YWdOYW1lKSB7XG4gICAgICAgICAgICBjYXNlIFwiSU5QVVRcIjpcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGZvcm0udHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2hlY2tib3hcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJhZGlvXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm9ybS5jaGVja2VkID09IHRydWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZvcm0udmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBjYXNlIFwiU0VMRUNUXCI6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZvcm0udmFsdWU7XG5cbiAgICAgICAgICAgIGNhc2UgXCJURVhUQVJFQVwiOlxuICAgICAgICAgICAgICAgIHJldHVybiBmb3JtLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICBzdGF0aWMgRWxlbVNldFZhbHVlIChmb3JtU2VsZWN0b3IsIG5ld1ZhbHVlLCBwYXJlbnQpIHtcbiAgICAgICAgbGV0IGZvcm0gPSBrYXNpbWlyX2VsZW0oZm9ybVNlbGVjdG9yLCBwYXJlbnQpO1xuICAgICAgICBzd2l0Y2ggKGZvcm0udGFnTmFtZSkge1xuICAgICAgICAgICAgY2FzZSBcIklOUFVUXCI6XG4gICAgICAgICAgICAgICAgc3dpdGNoIChmb3JtLnR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNoZWNrYm94XCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJyYWRpb1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld1ZhbHVlID09IGZvcm0udmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtLmNoZWNrZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JtLmNoZWNrZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9ybS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBcIlNFTEVDVFwiOlxuICAgICAgICAgICAgICAgIGZvcm0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgXCJURVhUQVJFQVwiOlxuICAgICAgICAgICAgICAgIGZvcm0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHN0YXRpYyBHZXREYXRhKGZvcm1TZWxlY3Rvcikge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IpO1xuICAgICAgICBsZXQgZGF0YSA9IHt9O1xuXG4gICAgICAgIGZvcihsZXQgZWxlbSBvZiBrYXNpbWlyX2VsZW1fYWxsKFwiaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWFcIiwgZm9ybSkpIHtcbiAgICAgICAgICAgIGxldCB2YWwgPSB0aGlzLkVsZW1HZXRWYWx1ZShlbGVtKTtcbiAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICBsZXQgbmFtZSA9IGVsZW0ubmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09IFwiXCIpXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsZW0uaWQ7XG5cbiAgICAgICAgICAgIGRhdGFbbmFtZV0gPSB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgc3RhdGljIFNldERhdGEoZm9ybVNlbGVjdG9yLCBuZXdWYWx1ZSkge1xuICAgICAgICBsZXQgZm9ybSA9IGthc2ltaXJfZWxlbShmb3JtU2VsZWN0b3IpO1xuICAgICAgICBmb3IobGV0IGVsZW0gb2Yga2FzaW1pcl9lbGVtX2FsbChcImlucHV0LCBzZWxlY3QsIHRleHRhcmVhXCIsIGZvcm0pKSB7XG4gICAgICAgICAgICBsZXQgbmFtZSA9IGVsZW0ubmFtZTtcbiAgICAgICAgICAgIGlmIChuYW1lID09IFwiXCIpXG4gICAgICAgICAgICAgICAgbmFtZSA9IGVsZW0uaWQ7XG5cbiAgICAgICAgICAgIGxldCB2YWwgPSBuZXdWYWx1ZVtuYW1lXTtcbiAgICAgICAgICAgIHRoaXMuRWxlbVNldFZhbHVlKGVsZW0sIHZhbCk7XG4gICAgICAgIH1cbiAgICB9XG5cbn0iLCJcblxuY2xhc3MgS2FzaW1pckZvcm0ge1xuXG4gICAgY29uc3RydWN0b3Ioc2VsZWN0b3IpIHtcbiAgICAgICAgdGhpcy5mb3JtID0ga2FzaW1pcl9lbGVtKHNlbGVjdG9yKTtcbiAgICAgICAgdGhpcy5fZGVib3VuY2VyID0gbnVsbDtcbiAgICAgICAgdGhpcy5fYmluZGVyID0gbmV3IEthc2ltaXJCaW5kZXIoKTtcbiAgICB9XG5cbiAgICBnZXQgZGF0YSAoKSB7XG4gICAgICAgIHJldHVybiBLYXNpbWlyRm9ybVNlcmlhbGl6ZXIuR2V0RGF0YSh0aGlzLmZvcm0pO1xuICAgIH1cblxuICAgIHNldCBkYXRhKHZhbHVlKSB7XG4gICAgICAgIEthc2ltaXJGb3JtU2VyaWFsaXplci5TZXREYXRhKHRoaXMuZm9ybSwgdmFsdWUpO1xuICAgICAgICB0aGlzLl9iaW5kZXIuc2V0RGF0YVdpdGhvdXRUcmlnZ2VyKHZhbHVlKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBvYmplY3RcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyRm9ybX1cbiAgICAgKi9cbiAgICBiaW5kKG9iamVjdCkge1xuICAgICAgICB0aGlzLl9iaW5kZXIuYmluZChvYmplY3QpLnNldERhdGFXaXRob3V0VHJpZ2dlcihvYmplY3QpLnNldE9uQ2hhbmdlKChvYmopID0+IHtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IG9iajtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IGRlYm91bmNlciA9IHRoaXMuX2RlYm91bmNlciA9IG5ldyBLYXNpbWlyRGVib3VuY2VyKCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2JpbmRlci5zZXREYXRhV2l0aG91dFRyaWdnZXIodGhpcy5kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZm9ybS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIChlKSA9PiBkZWJvdW5jZXIudHJpZ2dlcigpKTtcbiAgICAgICAgdGhpcy5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4gZGVib3VuY2VyLmRlYm91bmNlKCkpO1xuICAgICAgICB0aGlzLmRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckZvcm19XG4gICAgICovXG4gICAgb25zdWJtaXQoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5mb3JtLmFkZEV2ZW50TGlzdGVuZXIoXCJzdWJtaXRcIiwgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxufSIsIi8qKlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9odHRwKHVybCwgcGFyYW1zPXt9KSB7XG4gICAgcmV0dXJuIG5ldyBLYXNpbWlySHR0cFJlcXVlc3QodXJsLCBwYXJhbXMpO1xufSIsIlxuXG52YXIgS0FTSU1JUl9IVFRQX0JMT0NLX0xJU1QgPSB7fTtcblxuXG5jbGFzcyBLYXNpbWlySHR0cFJlcXVlc3Qge1xuXG4gICAgY29uc3RydWN0b3IodXJsLCBwYXJhbXM9e30pIHtcblxuICAgICAgICB1cmwgPSB1cmwucmVwbGFjZSgvKFxce3xcXDopKFthLXpBLVowLTlfXFwtXSspKFxcfXwpLywgKG1hdGNoLCBwMSwgcDIpID0+IHtcbiAgICAgICAgICAgIGlmICggISBwYXJhbXMuaGFzT3duUHJvcGVydHkocDIpKVxuICAgICAgICAgICAgICAgIHRocm93IFwicGFyYW1ldGVyICdcIiArIHAyICsgXCInIG1pc3NpbmcgaW4gdXJsICdcIiArIHVybCArIFwiJ1wiO1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNbcDJdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXG4gICAgICAgICAgICBib2R5OiBudWxsLFxuICAgICAgICAgICAgaGVhZGVyczoge30sXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICBvbkVycm9yOiBudWxsLFxuICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgIGJsb2NrZXJOYW1lOiBudWxsXG4gICAgICAgIH07XG5cblxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEFkZCBhZGRpdGlvbmFsIHF1ZXJ5IHBhcmFtZXRlcnMgdG8gdXJsXG4gICAgICpcbiAgICAgKiBAcGFyYW0gcGFyYW1zXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhQYXJhbXMocGFyYW1zKSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QudXJsLmluZGV4T2YoXCI/XCIpID09PSAtMSkge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnVybCArPSBcIj9cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCImXCI7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IHN0ciA9IFtdO1xuICAgICAgICBmb3IgKGxldCBuYW1lIGluIHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKHBhcmFtcy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICAgICAgICAgIHN0ci5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChuYW1lKSArIFwiPVwiICsgZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtc1tuYW1lXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gc3RyLmpvaW4oXCImXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBtZXRob2RcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE1ldGhvZChtZXRob2QpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IG1ldGhvZDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdG9rZW5cbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJlYXJlclRva2VuKHRva2VuKSB7XG4gICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiYXV0aG9yaXphdGlvblwiOiBcImJlYXJlciBcIiArIHRva2VufSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gaGVhZGVyc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoSGVhZGVycyhoZWFkZXJzKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24odGhpcy5yZXF1ZXN0LmhlYWRlcnMsIGhlYWRlcnMpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBuYW1lXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCbG9ja2VyKG5hbWUpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lID0gbmFtZTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gYm9keVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQm9keShib2R5KSB7XG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QubWV0aG9kID09PSBcIkdFVFwiKVxuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm1ldGhvZCA9IFwiUE9TVFwiO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShib2R5KSB8fCB0eXBlb2YgYm9keSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgICAgYm9keSA9IEpTT04uc3RyaW5naWZ5KGJvZHkpO1xuICAgICAgICAgICAgdGhpcy53aXRoSGVhZGVycyh7XCJjb250ZW50LXR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJ9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMucmVxdWVzdC5ib2R5ID0gYm9keTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aE9uRXJyb3IoY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IgPSBjYWxsYmFjaztcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgc2V0IGpzb24oZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kKChyZXMpID0+IHtcbiAgICAgICAgICAgIGZuKHJlcy5nZXRCb2R5SnNvbigpKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc2V0IHBsYWluKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keSgpKTtcbiAgICAgICAgfSlcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGZuXG4gICAgICogQHBhcmFtIGZpbHRlclxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBzZW5kKG9uU3VjY2Vzc0ZuKSB7XG4gICAgICAgIGxldCB4aHR0cCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWUgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChLQVNJTUlSX0hUVFBfQkxPQ0tfTElTVFt0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWVdID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiQmxvY2tpbmcgcmVxdWVzdCBcIiArIHRoaXMucmVxdWVzdC5ibG9ja2VyTmFtZSArIFwiIC8gYmxvY2tpbmcgcmVxdWVzdCBzdGlsbCBpbiBwcm9jZXNzXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEtBU0lNSVJfSFRUUF9CTE9DS19MSVNUW3RoaXMucmVxdWVzdC5ibG9ja2VyTmFtZV0gPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgeGh0dHAub3Blbih0aGlzLnJlcXVlc3QubWV0aG9kLCB0aGlzLnJlcXVlc3QudXJsKTtcbiAgICAgICAgZm9yIChsZXQgaGVhZGVyTmFtZSBpbiB0aGlzLnJlcXVlc3QuaGVhZGVycykge1xuICAgICAgICAgICAgeGh0dHAuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXJOYW1lLCB0aGlzLnJlcXVlc3QuaGVhZGVyc1toZWFkZXJOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgeGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHhodHRwLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIEtBU0lNSVJfSFRUUF9CTE9DS19MSVNUW3RoaXMucmVxdWVzdC5ibG9ja2VyTmFtZV0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5vbkVycm9yICE9PSBudWxsICYmIHhodHRwLnN0YXR1cyA+PSA0MDApIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Lm9uRXJyb3IobmV3IEthc2ltaXJIdHRwUmVzcG9uc2UoeGh0dHAucmVzcG9uc2UsIHhodHRwLnN0YXR1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9uU3VjY2Vzc0ZuKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcblxuICAgICAgICB4aHR0cC5zZW5kKHRoaXMucmVxdWVzdC5ib2R5KTtcbiAgICB9XG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVzcG9uc2Uge1xuXG5cbiAgICBjb25zdHJ1Y3RvciAoYm9keSwgc3RhdHVzLCByZXF1ZXN0KSB7XG4gICAgICAgIHRoaXMuYm9keSA9IGJvZHk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldEJvZHlKc29uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmJvZHkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0Qm9keSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNPaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzID09PSAyMDA7XG4gICAgfVxuXG59IiwiXG5cblxuY2xhc3MgS21JbnB1dEVsZW0gZXh0ZW5kcyBIVE1MSW5wdXRFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWQhISFcIiwgdGhpcyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHdpbmRvdy5zdGF0dXMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZXZhbCh0aGlzLl9hdHRycy5iaW5kKTtcblxuICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYW5nZVwiLCB0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuX2F0dHJzLmJpbmQgKyBcIiA9IHRoaXMudmFsdWVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLWlucHV0XCIsIEttSW5wdXRFbGVtLCB7ZXh0ZW5kczogXCJpbnB1dFwifSk7XG5cbiIsIlxuXG4vKipcbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX3RwbCh0ZW1wbGF0ZVNlbGVjdG9yKSB7XG4gICAgbGV0IHRwbEVsZW0gPSBrYXNpbWlyX2VsZW0odGVtcGxhdGVTZWxlY3Rvcik7XG4gICAgbGV0IHJlbmRlcmVyID0gbmV3IEthc2ltaXJSZW5kZXJlcigpO1xuICAgIHJldHVybiByZW5kZXJlci5yZW5kZXIodHBsRWxlbSk7XG59XG5cbiIsIlxuXG5jbGFzcyBLYXNpbWlyUmVuZGVyZXIge1xuXG4gICAgY29uc3RydWN0b3IoYXR0clByZWZpeD1cIipcIikge1xuICAgICAgICB0aGlzLl9hdHRyUHJlZml4ID0gYXR0clByZWZpeFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqL1xuICAgIF9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0gXCJcIjtcbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpXG4gICAgICAgICAgICByZXQgKz0gXCIgXCIgKyBhdHRyLm5hbWUgKyBcIj1cXFwiXCIgKyBhdHRyLnZhbHVlICsgXCJcXFwiXCI7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG5cbiAgICBfYWRkc2xhc2hlcyhzdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx1MDAwOC9nLCAnXFxcXGInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcZi9nLCAnXFxcXGYnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcci9nLCAnXFxcXHInKS5cbiAgICAgICAgICAgIHJlcGxhY2UoLycvZywgJ1xcXFxcXCcnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1wiL2csICdcXFxcXCInKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgX2dldExvZ2ljKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IHJldCA9IHtvcGVuOlwiXCIsIGNsb3NlOlwiXCIsIGhhbmRsZXI6e319O1xuXG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJpZlwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJpZihcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikpIHtcbiAgICAgICAgICAgIHJldC5vcGVuICs9IFwiZm9yKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiZm9yXCIpICsgXCIpe1wiO1xuICAgICAgICAgICAgcmV0LmNsb3NlICs9IFwifVwiO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgIGxldCBtYXRjaGVzID0gYXR0ci5uYW1lLm1hdGNoKC9eb24oLispLyk7XG4gICAgICAgICAgICBpZiAobWF0Y2hlcyA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIHJldC5oYW5kbGVyW2F0dHIubmFtZV0gPSBhdHRyLnZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtOb2RlfVxuICAgICAqIEBwYXJhbSBwYXRoIHtTdHJpbmd9XG4gICAgICogQHBhcmFtIGRlcHRoXG4gICAgICovXG4gICAgX3JlbmRlcihkb21ub2RlLCBwYXRoLCBkZXB0aCkge1xuICAgICAgICBsZXQgb3V0ID0gXCJcIjtcblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG5cbiAgICAgICAgICAgIGxldCBsb2dpYyA9IHRoaXMuX2dldExvZ2ljKGRvbW5vZGUpO1xuICAgICAgICAgICAgbGV0IGF0dHJTdHIgPSB0aGlzLl9nZXRBdHRyaWJ1dGVTdHIoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+IFwiICsgZG9tbm9kZS50YWdOYW1lICsgYXR0clN0cjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcblwiICsgbG9naWMub3BlbjtcblxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgaWYgKGRvbW5vZGUudGFnTmFtZSA9PT0gXCJTQ1JJUFRcIikge1xuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbmV2YWwoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCk7XCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKFwiaXNcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCInLCB7aXM6ICdcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKFwiaXNcIikgKyBcIid9KTtcIjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicpO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ci5uYW1lLnN0YXJ0c1dpdGgodGhpcy5fYXR0clByZWZpeCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXS5zZXRBdHRyaWJ1dGUoJ1wiICsgYXR0ci5uYW1lICsgXCInLCBgXCIgKyBhdHRyLnZhbHVlICsgXCJgKTtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaGFuZGxlck5hbWUgaW4gbG9naWMuaGFuZGxlcikge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLlwiICsgaGFuZGxlck5hbWUgKyBcIiA9IGZ1bmN0aW9uKGUpeyBcIiArIGxvZ2ljLmhhbmRsZXJbaGFuZGxlck5hbWVdICsgXCIgfTtcIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIChkZXB0aCAtIDEpICsgXCJdLmFwcGVuZENoaWxkKF9lW1wiICsgZGVwdGggKyBcIl0pO1wiO1xuICAgICAgICAgICAgICAgIC8vIG91dCArPSBcIlxcbl9faHRtbF9fICs9IGA8XCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyICsgXCI+YDtcIjtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjaGlsZCBvZiBkb21ub2RlLmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihjaGlsZCwgY3VyUGF0aCwgZGVwdGggKyAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvL291dCArPSBcIlxcbl9faHRtbF9fICs9IGA8L1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCI+YDtcIlxuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5jbG9zZTtcbiAgICAgICAgfSBlbHNlIGlmIChkb21ub2RlIGluc3RhbmNlb2YgVGV4dCkge1xuICAgICAgICAgICAgbGV0IGN1clBhdGggPSBwYXRoICsgXCIgPiAodGV4dClcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9fZGVidWdfcGF0aF9fID0gJ1wiICsgdGhpcy5fYWRkc2xhc2hlcyhjdXJQYXRoKSArIFwiJztcIjtcbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoLTEpICtcIl0uYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoYFwiICsgZG9tbm9kZS50ZXh0Q29udGVudCArIFwiYCkpO1wiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IG91dCA9IFwidmFyIF9fZGVidWdfcGF0aF9fID0gJyhyb290KSc7XCI7XG4gICAgICAgIG91dCArPSBcIlxcbnZhciBfZSA9IFtkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKV07XCI7XG5cblxuICAgICAgICBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIEhUTUxUZW1wbGF0ZUVsZW1lbnQpIHtcblxuICAgICAgICAgICAgZm9yIChsZXQgY3VyQ2hpbGQgb2YgZG9tbm9kZS5jb250ZW50LmNoaWxkTm9kZXMpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGN1ckNoaWxkLCAgXCIocm9vdClcIiwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGRvbW5vZGUsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgfVxuXG5cbiAgICAgICAgbGV0IHhvdXQgPSBgXG4gICAgICAgICAgICBmbiA9IGZ1bmN0aW9uKHNjb3BlKXtcbiAgICAgICAgICAgICAgICBsZXQgZm5zID0gW107XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgJHtvdXR9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyAnRXJyb3IgaW4gJyArIF9fZGVidWdfcGF0aF9fICsgJzogJyArIGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBfZVswXTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIGA7XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coeG91dCk7XG4gICAgICAgIGxldCBmbiA7XG4gICAgICAgIGV2YWwoeG91dCk7XG4gICAgICAgIHJldHVybiBuZXcgS2FzaW1pclRlbXBsYXRlKGZuKTtcbiAgICB9XG5cbn1cblxuIiwiY2xhc3MgS2FzaW1pclRlbXBsYXRlIHtcblxuICAgIGNvbnN0cnVjdG9yKHRwbEZuKSB7XG4gICAgICAgIHRoaXMuX3RwbEZuID0gdHBsRm47XG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7SFRNTEVsZW1lbnR9XG4gICAgICAgICAqIEBwcml2YXRlXG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLl9yZW5kZXJJbkVsZW1lbnQgPSBudWxsO1xuICAgICAgICB0aGlzLl9iaW5kZXIgPSBuZXcgS2FzaW1pckJpbmRlcigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbVNlbGVjdG9yIHtzdHJpbmd8SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVybiBLYXNpbWlyVGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXJJbihkb21TZWxlY3Rvcikge1xuICAgICAgICBsZXQgbm9kZSA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgZG9tU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGRvbVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgZG9tU2VsZWN0b3IgKyBcIidcIjtcbiAgICAgICAgfSBlbHNlIGlmIChkb21TZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBub2RlID0gZG9tU2VsZWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBcImJpbmQoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudCA9IG5vZGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKHNjb3BlKSB7XG4gICAgICAgIHRoaXMuX3JlbmRlckluRWxlbWVudC5yZXBsYWNlQ2hpbGQodGhpcy5fdHBsRm4oc2NvcGUpLCB0aGlzLl9yZW5kZXJJbkVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIG9ic2VydmUoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICB0aGlzLl9iaW5kZXIuYmluZChzY29wZSkuc2V0T25DaGFuZ2UoKCk9PnRoaXMucmVuZGVyKHNjb3BlKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxufVxuXG4iLCJcblxuXG5jbGFzcyBLbVRwbEVsZW0gZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcblxuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKlxuICAgICAgICAgKiBAdHlwZSB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy50cGwgPSBudWxsO1xuICAgIH1cblxuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbXCJiaW5kXCIsIFwib2JzZXJ2ZVwiLCBcInNjb3BlXCJdOyB9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sobmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2F0dHJzW25hbWVdID0gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KCgpPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoXCJ0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIjxrbS10cGw+IGhhcyBubyB0ZW1wbGF0ZSBjaGlsZC5cIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IFwiPGttLXRwbD4gcmVxdWlyZXMgPHRlbXBsYXRlPiBjaGlsZC5cIjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnRwbCA9IGthc2ltaXJfdHBsKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRwbC5yZW5kZXJJbih0aGlzKTtcblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5zY29wZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBldmFsKFwic2NvcGUgPSBcIiArIHRoaXMuX2F0dHJzLnNjb3BlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLmJpbmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50cGwuYmluZChldmFsKHRoaXMuX2F0dHJzLmJpbmQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLm9ic2VydmUpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG9ic2VydmVkID0gZXZhbCh0aGlzLl9hdHRycy5vYnNlcnZlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2cob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9ic2VydmVkICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJvYnNlcnZlZCB2YXJpYWJsZSAnXCIgKyB0aGlzLl9hdHRycy5vYnNlcnZlICsgXCInIGlzIHR5cGVvZiBcIiArICh0eXBlb2Ygb2JzZXJ2ZWQpICsgXCIgYnV0IG9iamVjdCByZXF1aXJlZFwiO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRwbC5vYnNlcnZlKG9ic2VydmVkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlICsgXCIgaW4gZWxlbWVudCBcIiwgdGhpcyk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMSk7XG5cblxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RDYWxsYmFjaygpIHtcblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS10cGxcIiwgS21UcGxFbGVtKTtcblxuIl19
