/**
 * Infracamp's KasimirJS
 *
 * A no-dependency render on request
 *
 * @author Matthias Leuffen <m@tth.es>
 */
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
    let tplElem = null;
    if (typeof templateSelector === "string") {
        tplElem = document.querySelector(templateSelector);
        if (tplElem === null)
            throw "kasimir_tpl(): can't find element '" + templateSelector + "'";
    } else if (templateSelector instanceof HTMLElement) {
        tplElem = templateSelector;
    } else {
        throw "kasimir_tpl(): parameter1 is not a HtmlElement";
    }
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

        console.log(xout);
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
        this._bind = null;
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
        this._bind = node;
        return this;
    }


    /**
     *
     * @param scope
     * @return {KasimirTemplate}
     */
    render(scope) {
        console.log(this._tplFn(scope));
        this._bind.replaceChild(this._tplFn(scope), this._bind.firstChild);
        return this;
    }

    /**
     *
     * @param scope
     * @return {KasimirTemplate}
     */
    observe(scope) {
        this.render(scope);
        window.setInterval(e => {
            if (JSON.stringify(scope) !== this._observedLastValue) {
                this._observedLastValue = JSON.stringify(scope);
                this.render(scope);
            }
        }, 200);
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

        try {
            console.log("load", window["data"]);
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

    }

    disconnectCallback() {

    }

}

customElements.define("km-tpl", KmTplElem);

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Imthc2ltaXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gcGFyYW1zXG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfaHR0cCh1cmwsIHBhcmFtcz17fSkge1xuICAgIHJldHVybiBuZXcgS2FzaW1pckh0dHBSZXF1ZXN0KHVybCwgcGFyYW1zKTtcbn0iLCJcblxudmFyIEtBU0lNSVJfSFRUUF9CTE9DS19MSVNUID0ge307XG5cblxuY2xhc3MgS2FzaW1pckh0dHBSZXF1ZXN0IHtcblxuICAgIGNvbnN0cnVjdG9yKHVybCwgcGFyYW1zPXt9KSB7XG5cbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXHt8XFw6KShbYS16QS1aMC05X1xcLV0rKShcXH18KS8sIChtYXRjaCwgcDEsIHAyKSA9PiB7XG4gICAgICAgICAgICBpZiAoICEgcGFyYW1zLmhhc093blByb3BlcnR5KHAyKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBcInBhcmFtZXRlciAnXCIgKyBwMiArIFwiJyBtaXNzaW5nIGluIHVybCAnXCIgKyB1cmwgKyBcIidcIjtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQocGFyYW1zW3AyXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgICAgICAgYm9keTogbnVsbCxcbiAgICAgICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgb25FcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBibG9ja2VyTmFtZTogbnVsbFxuICAgICAgICB9O1xuXG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYWRkaXRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIHVybFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoUGFyYW1zKHBhcmFtcykge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LnVybC5pbmRleE9mKFwiP1wiKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCI/XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdHIgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQobmFtZSkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNbbmFtZV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IHN0ci5qb2luKFwiJlwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhNZXRob2QobWV0aG9kKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBtZXRob2Q7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VuXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCZWFyZXJUb2tlbih0b2tlbikge1xuICAgICAgICB0aGlzLndpdGhIZWFkZXJzKHtcImF1dGhvcml6YXRpb25cIjogXCJiYWVyZXIgXCIgKyB0b2tlbn0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGhlYWRlcnNcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEhlYWRlcnMoaGVhZGVycykge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucmVxdWVzdC5oZWFkZXJzLCBoZWFkZXJzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQmxvY2tlcihuYW1lKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5ibG9ja2VyTmFtZSA9IG5hbWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGJvZHlcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJvZHkoYm9keSkge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0Lm1ldGhvZCA9PT0gXCJHRVRcIilcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBcIlBPU1RcIjtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYm9keSkgfHwgdHlwZW9mIGJvZHkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShib2R5KTtcbiAgICAgICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiY29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwifSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlcXVlc3QuYm9keSA9IGJvZHk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhPbkVycm9yKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yID0gY2FsbGJhY2s7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNldCBqc29uKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keUpzb24oKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNldCBwbGFpbihmbikge1xuICAgICAgICB0aGlzLnNlbmQoKHJlcykgPT4ge1xuICAgICAgICAgICAgZm4ocmVzLmdldEJvZHkoKSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgc2VuZChvblN1Y2Nlc3NGbikge1xuICAgICAgICBsZXQgeGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoS0FTSU1JUl9IVFRQX0JMT0NLX0xJU1RbdGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkJsb2NraW5nIHJlcXVlc3QgXCIgKyB0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWUgKyBcIiAvIGJsb2NraW5nIHJlcXVlc3Qgc3RpbGwgaW4gcHJvY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLQVNJTUlSX0hUVFBfQkxPQ0tfTElTVFt0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWVdID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhodHRwLm9wZW4odGhpcy5yZXF1ZXN0Lm1ldGhvZCwgdGhpcy5yZXF1ZXN0LnVybCk7XG4gICAgICAgIGZvciAobGV0IGhlYWRlck5hbWUgaW4gdGhpcy5yZXF1ZXN0LmhlYWRlcnMpIHtcbiAgICAgICAgICAgIHhodHRwLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyTmFtZSwgdGhpcy5yZXF1ZXN0LmhlYWRlcnNbaGVhZGVyTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHhodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHR0cC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5ibG9ja2VyTmFtZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBLQVNJTUlSX0hUVFBfQkxPQ0tfTElTVFt0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWVdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlcXVlc3Qub25FcnJvciAhPT0gbnVsbCAmJiB4aHR0cC5zdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3NGbihuZXcgS2FzaW1pckh0dHBSZXNwb25zZSh4aHR0cC5yZXNwb25zZSwgeGh0dHAuc3RhdHVzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG5cbiAgICAgICAgeGh0dHAuc2VuZCh0aGlzLnJlcXVlc3QuYm9keSk7XG4gICAgfVxuXG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVzcG9uc2Uge1xuXG5cbiAgICBjb25zdHJ1Y3RvciAoYm9keSwgc3RhdHVzLCByZXF1ZXN0KSB7XG4gICAgICAgIHRoaXMuYm9keSA9IGJvZHk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldEJvZHlKc29uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmJvZHkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0Qm9keSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNPaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzID09PSAyMDA7XG4gICAgfVxuXG59IiwiXG5cblxuY2xhc3MgS21JbnB1dEVsZW0gZXh0ZW5kcyBIVE1MSW5wdXRFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWQhISFcIiwgdGhpcyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHdpbmRvdy5zdGF0dXMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZXZhbCh0aGlzLl9hdHRycy5iaW5kKTtcblxuICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYW5nZVwiLCB0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuX2F0dHJzLmJpbmQgKyBcIiA9IHRoaXMudmFsdWVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLWlucHV0XCIsIEttSW5wdXRFbGVtLCB7ZXh0ZW5kczogXCJpbnB1dFwifSk7XG5cbiIsIlxuXG4vKipcbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX3RwbCh0ZW1wbGF0ZVNlbGVjdG9yKSB7XG4gICAgbGV0IHRwbEVsZW0gPSBudWxsO1xuICAgIGlmICh0eXBlb2YgdGVtcGxhdGVTZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB0cGxFbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0ZW1wbGF0ZVNlbGVjdG9yKTtcbiAgICAgICAgaWYgKHRwbEVsZW0gPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvdyBcImthc2ltaXJfdHBsKCk6IGNhbid0IGZpbmQgZWxlbWVudCAnXCIgKyB0ZW1wbGF0ZVNlbGVjdG9yICsgXCInXCI7XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVNlbGVjdG9yIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgdHBsRWxlbSA9IHRlbXBsYXRlU2VsZWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX3RwbCgpOiBwYXJhbWV0ZXIxIGlzIG5vdCBhIEh0bWxFbGVtZW50XCI7XG4gICAgfVxuICAgIGxldCByZW5kZXJlciA9IG5ldyBLYXNpbWlyUmVuZGVyZXIoKTtcbiAgICByZXR1cm4gcmVuZGVyZXIucmVuZGVyKHRwbEVsZW0pO1xufVxuXG4iLCJcblxuY2xhc3MgS2FzaW1pclJlbmRlcmVyIHtcblxuICAgIGNvbnN0cnVjdG9yKGF0dHJQcmVmaXg9XCIqXCIpIHtcbiAgICAgICAgdGhpcy5fYXR0clByZWZpeCA9IGF0dHJQcmVmaXhcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBfZ2V0QXR0cmlidXRlU3RyKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IHJldCA9IFwiXCI7XG4gICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKVxuICAgICAgICAgICAgcmV0ICs9IFwiIFwiICsgYXR0ci5uYW1lICsgXCI9XFxcIlwiICsgYXR0ci52YWx1ZSArIFwiXFxcIlwiO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuXG4gICAgX2FkZHNsYXNoZXMoc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcdTAwMDgvZywgJ1xcXFxiJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHQvZywgJ1xcXFx0JykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXG4vZywgJ1xcXFxuJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXGYvZywgJ1xcXFxmJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHIvZywgJ1xcXFxyJykuXG4gICAgICAgICAgICByZXBsYWNlKC8nL2csICdcXFxcXFwnJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVyblxuICAgICAqL1xuICAgIF9nZXRMb2dpYyhkb21ub2RlKSB7XG4gICAgICAgIGxldCByZXQgPSB7b3BlbjpcIlwiLCBjbG9zZTpcIlwiLCBoYW5kbGVyOnt9fTtcblxuICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiaWZcIikpIHtcbiAgICAgICAgICAgIHJldC5vcGVuICs9IFwiaWYoXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJpZlwiKSArIFwiKXtcIjtcbiAgICAgICAgICAgIHJldC5jbG9zZSArPSBcIn1cIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiZm9yXCIpKSB7XG4gICAgICAgICAgICByZXQub3BlbiArPSBcImZvcihcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImZvclwiKSArIFwiKXtcIjtcbiAgICAgICAgICAgIHJldC5jbG9zZSArPSBcIn1cIjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBsZXQgbWF0Y2hlcyA9IGF0dHIubmFtZS5tYXRjaCgvXm9uKC4rKS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoZXMgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICByZXQuaGFuZGxlclthdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7Tm9kZX1cbiAgICAgKiBAcGFyYW0gcGF0aCB7U3RyaW5nfVxuICAgICAqIEBwYXJhbSBkZXB0aFxuICAgICAqL1xuICAgIF9yZW5kZXIoZG9tbm9kZSwgcGF0aCwgZGVwdGgpIHtcbiAgICAgICAgbGV0IG91dCA9IFwiXCI7XG5cbiAgICAgICAgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuXG4gICAgICAgICAgICBsZXQgbG9naWMgPSB0aGlzLl9nZXRMb2dpYyhkb21ub2RlKTtcbiAgICAgICAgICAgIGxldCBhdHRyU3RyID0gdGhpcy5fZ2V0QXR0cmlidXRlU3RyKGRvbW5vZGUpO1xuICAgICAgICAgICAgbGV0IGN1clBhdGggPSBwYXRoICsgXCIgPiBcIiArIGRvbW5vZGUudGFnTmFtZSArIGF0dHJTdHI7XG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5cIiArIGxvZ2ljLm9wZW47XG5cbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9fZGVidWdfcGF0aF9fID0gJ1wiICsgdGhpcy5fYWRkc2xhc2hlcyhjdXJQYXRoKSArIFwiJztcIjtcbiAgICAgICAgICAgIGlmIChkb21ub2RlLnRhZ05hbWUgPT09IFwiU0NSSVBUXCIpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5ldmFsKGBcIiArIGRvbW5vZGUudGV4dENvbnRlbnQgKyBcImApO1wiXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZShcImlzXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdcIiArIGRvbW5vZGUudGFnTmFtZSArIFwiJywge2lzOiAnXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZShcImlzXCIpICsgXCInfSk7XCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCInKTtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHIubmFtZS5zdGFydHNXaXRoKHRoaXMuX2F0dHJQcmVmaXgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0uc2V0QXR0cmlidXRlKCdcIiArIGF0dHIubmFtZSArIFwiJywgYFwiICsgYXR0ci52YWx1ZSArIFwiYCk7XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGhhbmRsZXJOYW1lIGluIGxvZ2ljLmhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXS5cIiArIGhhbmRsZXJOYW1lICsgXCIgPSBmdW5jdGlvbihlKXsgXCIgKyBsb2dpYy5oYW5kbGVyW2hhbmRsZXJOYW1lXSArIFwiIH07XCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyAoZGVwdGggLSAxKSArIFwiXS5hcHBlbmRDaGlsZChfZVtcIiArIGRlcHRoICsgXCJdKTtcIjtcbiAgICAgICAgICAgICAgICAvLyBvdXQgKz0gXCJcXG5fX2h0bWxfXyArPSBgPFwiICsgZG9tbm9kZS50YWdOYW1lICsgYXR0clN0ciArIFwiPmA7XCI7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2hpbGQgb2YgZG9tbm9kZS5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoY2hpbGQsIGN1clBhdGgsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9vdXQgKz0gXCJcXG5fX2h0bWxfXyArPSBgPC9cIiArIGRvbW5vZGUudGFnTmFtZSArIFwiPmA7XCJcbiAgICAgICAgICAgIG91dCArPSBcIlxcblwiICsgbG9naWMuY2xvc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIFRleHQpIHtcbiAgICAgICAgICAgIGxldCBjdXJQYXRoID0gcGF0aCArIFwiID4gKHRleHQpXCI7XG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fX2RlYnVnX3BhdGhfXyA9ICdcIiArIHRoaXMuX2FkZHNsYXNoZXMoY3VyUGF0aCkgKyBcIic7XCI7XG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIChkZXB0aC0xKSArXCJdLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGBcIiArIGRvbW5vZGUudGV4dENvbnRlbnQgKyBcImApKTtcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIHJlbmRlcihkb21ub2RlKSB7XG4gICAgICAgIGxldCBvdXQgPSBcInZhciBfX2RlYnVnX3BhdGhfXyA9ICcocm9vdCknO1wiO1xuICAgICAgICBvdXQgKz0gXCJcXG52YXIgX2UgPSBbZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyldO1wiO1xuXG5cbiAgICAgICAgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGN1ckNoaWxkIG9mIGRvbW5vZGUuY29udGVudC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihjdXJDaGlsZCwgIFwiKHJvb3QpXCIsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihkb21ub2RlLCAgXCIocm9vdClcIiwgMSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGxldCB4b3V0ID0gYFxuICAgICAgICAgICAgZm4gPSBmdW5jdGlvbihzY29wZSl7XG4gICAgICAgICAgICAgICAgbGV0IGZucyA9IFtdO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICR7b3V0fVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgJ0Vycm9yIGluICcgKyBfX2RlYnVnX3BhdGhfXyArICc6ICcgKyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gX2VbMF07XG4gICAgICAgICAgICB9O1xuICAgICAgICBgO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKHhvdXQpO1xuICAgICAgICBsZXQgZm4gO1xuICAgICAgICBldmFsKHhvdXQpO1xuICAgICAgICByZXR1cm4gbmV3IEthc2ltaXJUZW1wbGF0ZShmbik7XG4gICAgfVxuXG59XG5cbiIsImNsYXNzIEthc2ltaXJUZW1wbGF0ZSB7XG5cbiAgICBjb25zdHJ1Y3Rvcih0cGxGbikge1xuICAgICAgICB0aGlzLl90cGxGbiA9IHRwbEZuO1xuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge0hUTUxFbGVtZW50fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fYmluZCA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tU2VsZWN0b3Ige3N0cmluZ3xIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuIEthc2ltaXJUZW1wbGF0ZVxuICAgICAqL1xuICAgIHJlbmRlckluKGRvbVNlbGVjdG9yKSB7XG4gICAgICAgIGxldCBub2RlID0gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBkb21TZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZG9tU2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJiaW5kKCk6IGNhbid0IGZpbmQgZWxlbWVudCAnXCIgKyBkb21TZWxlY3RvciArIFwiJ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbVNlbGVjdG9yIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb21TZWxlY3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBwYXJhbWV0ZXIxIGlzIG5vdCBhIEh0bWxFbGVtZW50XCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fYmluZCA9IG5vZGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKHNjb3BlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuX3RwbEZuKHNjb3BlKSk7XG4gICAgICAgIHRoaXMuX2JpbmQucmVwbGFjZUNoaWxkKHRoaXMuX3RwbEZuKHNjb3BlKSwgdGhpcy5fYmluZC5maXJzdENoaWxkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgb2JzZXJ2ZShzY29wZSkge1xuICAgICAgICB0aGlzLnJlbmRlcihzY29wZSk7XG4gICAgICAgIHdpbmRvdy5zZXRJbnRlcnZhbChlID0+IHtcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShzY29wZSkgIT09IHRoaXMuX29ic2VydmVkTGFzdFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBKU09OLnN0cmluZ2lmeShzY29wZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAyMDApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbn1cblxuIiwiXG5cblxuY2xhc3MgS21UcGxFbGVtIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgdGhpcy5fYXR0cnMgPSB7XG4gICAgICAgICAgICBiaW5kOiBudWxsLFxuICAgICAgICAgICAgb2JzZXJ2ZTogbnVsbCxcbiAgICAgICAgICAgIHNjb3BlOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHBsID0gbnVsbDtcbiAgICB9XG5cblxuICAgIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCkgeyByZXR1cm4gW1wiYmluZFwiLCBcIm9ic2VydmVcIiwgXCJzY29wZVwiXTsgfVxuXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICB0aGlzLl9hdHRyc1tuYW1lXSA9IG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRcIiwgd2luZG93W1wiZGF0YVwiXSk7XG4gICAgICAgICAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoXCJ0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCI8a20tdHBsPiBoYXMgbm8gdGVtcGxhdGUgY2hpbGQuXCIsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRocm93IFwiPGttLXRwbD4gcmVxdWlyZXMgPHRlbXBsYXRlPiBjaGlsZC5cIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy50cGwgPSBrYXNpbWlyX3RwbCh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIHRoaXMudHBsLnJlbmRlckluKHRoaXMpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5fYXR0cnMuc2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBudWxsO1xuICAgICAgICAgICAgICAgIGV2YWwoXCJzY29wZSA9IFwiICsgdGhpcy5fYXR0cnMuc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLmJpbmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRwbC5iaW5kKGV2YWwodGhpcy5fYXR0cnMuYmluZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLm9ic2VydmUpIHtcbiAgICAgICAgICAgICAgICBsZXQgb2JzZXJ2ZWQgPSBldmFsKHRoaXMuX2F0dHJzLm9ic2VydmUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG9ic2VydmVkKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9ic2VydmVkICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIm9ic2VydmVkIHZhcmlhYmxlICdcIiArIHRoaXMuX2F0dHJzLm9ic2VydmUgKyBcIicgaXMgdHlwZW9mIFwiICsgKHR5cGVvZiBvYnNlcnZlZCkgKyBcIiBidXQgb2JqZWN0IHJlcXVpcmVkXCI7XG4gICAgICAgICAgICAgICAgdGhpcy50cGwub2JzZXJ2ZShvYnNlcnZlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgZGlzY29ubmVjdENhbGxiYWNrKCkge1xuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLXRwbFwiLCBLbVRwbEVsZW0pO1xuXG4iXX0=
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6Imthc2ltaXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqXG4gKiBAcGFyYW0gdXJsXG4gKiBAcGFyYW0gcGFyYW1zXG4gKi9cbmZ1bmN0aW9uIGthc2ltaXJfaHR0cCh1cmwsIHBhcmFtcz17fSkge1xuICAgIHJldHVybiBuZXcgS2FzaW1pckh0dHBSZXF1ZXN0KHVybCwgcGFyYW1zKTtcbn0iLCJcblxudmFyIEtBU0lNSVJfSFRUUF9CTE9DS19MSVNUID0ge307XG5cblxuY2xhc3MgS2FzaW1pckh0dHBSZXF1ZXN0IHtcblxuICAgIGNvbnN0cnVjdG9yKHVybCwgcGFyYW1zPXt9KSB7XG5cbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoLyhcXHt8XFw6KShbYS16QS1aMC05X1xcLV0rKShcXH18KS8sIChtYXRjaCwgcDEsIHAyKSA9PiB7XG4gICAgICAgICAgICBpZiAoICEgcGFyYW1zLmhhc093blByb3BlcnR5KHAyKSlcbiAgICAgICAgICAgICAgICB0aHJvdyBcInBhcmFtZXRlciAnXCIgKyBwMiArIFwiJyBtaXNzaW5nIGluIHVybCAnXCIgKyB1cmwgKyBcIidcIjtcbiAgICAgICAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQocGFyYW1zW3AyXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMucmVxdWVzdCA9IHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBcIkdFVFwiLFxuICAgICAgICAgICAgYm9keTogbnVsbCxcbiAgICAgICAgICAgIGhlYWRlcnM6IHt9LFxuICAgICAgICAgICAgZGF0YVR5cGU6IFwidGV4dFwiLFxuICAgICAgICAgICAgb25FcnJvcjogbnVsbCxcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBibG9ja2VyTmFtZTogbnVsbFxuICAgICAgICB9O1xuXG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYWRkaXRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIHVybFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoUGFyYW1zKHBhcmFtcykge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LnVybC5pbmRleE9mKFwiP1wiKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCI/XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdHIgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQobmFtZSkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNbbmFtZV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IHN0ci5qb2luKFwiJlwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhNZXRob2QobWV0aG9kKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBtZXRob2Q7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VuXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCZWFyZXJUb2tlbih0b2tlbikge1xuICAgICAgICB0aGlzLndpdGhIZWFkZXJzKHtcImF1dGhvcml6YXRpb25cIjogXCJiYWVyZXIgXCIgKyB0b2tlbn0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGhlYWRlcnNcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEhlYWRlcnMoaGVhZGVycykge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucmVxdWVzdC5oZWFkZXJzLCBoZWFkZXJzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbmFtZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoQmxvY2tlcihuYW1lKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5ibG9ja2VyTmFtZSA9IG5hbWU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGJvZHlcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEJvZHkoYm9keSkge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0Lm1ldGhvZCA9PT0gXCJHRVRcIilcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBcIlBPU1RcIjtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYm9keSkgfHwgdHlwZW9mIGJvZHkgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShib2R5KTtcbiAgICAgICAgICAgIHRoaXMud2l0aEhlYWRlcnMoe1wiY29udGVudC10eXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwifSk7XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLnJlcXVlc3QuYm9keSA9IGJvZHk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGNhbGxiYWNrXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhPbkVycm9yKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yID0gY2FsbGJhY2s7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHNldCBqc29uKGZuKSB7XG4gICAgICAgIHRoaXMuc2VuZCgocmVzKSA9PiB7XG4gICAgICAgICAgICBmbihyZXMuZ2V0Qm9keUpzb24oKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHNldCBwbGFpbihmbikge1xuICAgICAgICB0aGlzLnNlbmQoKHJlcykgPT4ge1xuICAgICAgICAgICAgZm4ocmVzLmdldEJvZHkoKSk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBmblxuICAgICAqIEBwYXJhbSBmaWx0ZXJcbiAgICAgKiBAcmV0dXJuXG4gICAgICovXG4gICAgc2VuZChvblN1Y2Nlc3NGbikge1xuICAgICAgICBsZXQgeGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoS0FTSU1JUl9IVFRQX0JMT0NLX0xJU1RbdGhpcy5yZXF1ZXN0LmJsb2NrZXJOYW1lXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcIkJsb2NraW5nIHJlcXVlc3QgXCIgKyB0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWUgKyBcIiAvIGJsb2NraW5nIHJlcXVlc3Qgc3RpbGwgaW4gcHJvY2Vzc1wiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBLQVNJTUlSX0hUVFBfQkxPQ0tfTElTVFt0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWVdID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHhodHRwLm9wZW4odGhpcy5yZXF1ZXN0Lm1ldGhvZCwgdGhpcy5yZXF1ZXN0LnVybCk7XG4gICAgICAgIGZvciAobGV0IGhlYWRlck5hbWUgaW4gdGhpcy5yZXF1ZXN0LmhlYWRlcnMpIHtcbiAgICAgICAgICAgIHhodHRwLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyTmFtZSwgdGhpcy5yZXF1ZXN0LmhlYWRlcnNbaGVhZGVyTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHhodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGlmICh4aHR0cC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5ibG9ja2VyTmFtZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICBLQVNJTUlSX0hUVFBfQkxPQ0tfTElTVFt0aGlzLnJlcXVlc3QuYmxvY2tlck5hbWVdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlcXVlc3Qub25FcnJvciAhPT0gbnVsbCAmJiB4aHR0cC5zdGF0dXMgPj0gNDAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVxdWVzdC5vbkVycm9yKG5ldyBLYXNpbWlySHR0cFJlc3BvbnNlKHhodHRwLnJlc3BvbnNlLCB4aHR0cC5zdGF0dXMsIHRoaXMpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvblN1Y2Nlc3NGbihuZXcgS2FzaW1pckh0dHBSZXNwb25zZSh4aHR0cC5yZXNwb25zZSwgeGh0dHAuc3RhdHVzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG5cbiAgICAgICAgeGh0dHAuc2VuZCh0aGlzLnJlcXVlc3QuYm9keSk7XG4gICAgfVxuXG59IiwiXG5cbmNsYXNzIEthc2ltaXJIdHRwUmVzcG9uc2Uge1xuXG5cbiAgICBjb25zdHJ1Y3RvciAoYm9keSwgc3RhdHVzLCByZXF1ZXN0KSB7XG4gICAgICAgIHRoaXMuYm9keSA9IGJvZHk7XG4gICAgICAgIHRoaXMuc3RhdHVzID0gc3RhdHVzO1xuICAgICAgICB0aGlzLnJlcXVlc3QgPSByZXF1ZXN0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7b2JqZWN0fVxuICAgICAqL1xuICAgIGdldEJvZHlKc29uKCkge1xuICAgICAgICByZXR1cm4gSlNPTi5wYXJzZSh0aGlzLmJvZHkpXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9XG4gICAgICovXG4gICAgZ2V0Qm9keSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYm9keTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNPaygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RhdHVzID09PSAyMDA7XG4gICAgfVxuXG59IiwiXG5cblxuY2xhc3MgS21JbnB1dEVsZW0gZXh0ZW5kcyBIVE1MSW5wdXRFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLl9hdHRycyA9IHtcbiAgICAgICAgICAgIGJpbmQ6IG51bGwsXG4gICAgICAgICAgICBvYnNlcnZlOiBudWxsLFxuICAgICAgICAgICAgc2NvcGU6IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5fY29uZmlnID0ge1xuICAgICAgICB9O1xuXG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJjb25uZWN0ZWQhISFcIiwgdGhpcyk7XG4gICAgICAgIGNvbnNvbGUubG9nKHdpbmRvdy5zdGF0dXMpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gZXZhbCh0aGlzLl9hdHRycy5iaW5kKTtcblxuICAgICAgICAgICAgdGhpcy5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNoYW5nZVwiLCB0aGlzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBldmFsKHRoaXMuX2F0dHJzLmJpbmQgKyBcIiA9IHRoaXMudmFsdWVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLWlucHV0XCIsIEttSW5wdXRFbGVtLCB7ZXh0ZW5kczogXCJpbnB1dFwifSk7XG5cbiIsIlxuXG4vKipcbiAqXG4gKiBAcGFyYW0gdGVtcGxhdGVTZWxlY3RvclxuICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICovXG5mdW5jdGlvbiBrYXNpbWlyX3RwbCh0ZW1wbGF0ZVNlbGVjdG9yKSB7XG4gICAgbGV0IHRwbEVsZW0gPSBudWxsO1xuICAgIGlmICh0eXBlb2YgdGVtcGxhdGVTZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB0cGxFbGVtID0gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcih0ZW1wbGF0ZVNlbGVjdG9yKTtcbiAgICAgICAgaWYgKHRwbEVsZW0gPT09IG51bGwpXG4gICAgICAgICAgICB0aHJvdyBcImthc2ltaXJfdHBsKCk6IGNhbid0IGZpbmQgZWxlbWVudCAnXCIgKyB0ZW1wbGF0ZVNlbGVjdG9yICsgXCInXCI7XG4gICAgfSBlbHNlIGlmICh0ZW1wbGF0ZVNlbGVjdG9yIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgdHBsRWxlbSA9IHRlbXBsYXRlU2VsZWN0b3I7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgXCJrYXNpbWlyX3RwbCgpOiBwYXJhbWV0ZXIxIGlzIG5vdCBhIEh0bWxFbGVtZW50XCI7XG4gICAgfVxuICAgIGxldCByZW5kZXJlciA9IG5ldyBLYXNpbWlyUmVuZGVyZXIoKTtcbiAgICByZXR1cm4gcmVuZGVyZXIucmVuZGVyKHRwbEVsZW0pO1xufVxuXG4iLCJcblxuY2xhc3MgS2FzaW1pclJlbmRlcmVyIHtcblxuICAgIGNvbnN0cnVjdG9yKGF0dHJQcmVmaXg9XCIqXCIpIHtcbiAgICAgICAgdGhpcy5fYXR0clByZWZpeCA9IGF0dHJQcmVmaXhcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlIHtIVE1MRWxlbWVudH1cbiAgICAgKi9cbiAgICBfZ2V0QXR0cmlidXRlU3RyKGRvbW5vZGUpIHtcbiAgICAgICAgbGV0IHJldCA9IFwiXCI7XG4gICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKVxuICAgICAgICAgICAgcmV0ICs9IFwiIFwiICsgYXR0ci5uYW1lICsgXCI9XFxcIlwiICsgYXR0ci52YWx1ZSArIFwiXFxcIlwiO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuXG4gICAgX2FkZHNsYXNoZXMoc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBzdHJpbmcucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKS5cbiAgICAgICAgICAgIHJlcGxhY2UoL1xcdTAwMDgvZywgJ1xcXFxiJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHQvZywgJ1xcXFx0JykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXG4vZywgJ1xcXFxuJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXGYvZywgJ1xcXFxmJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHIvZywgJ1xcXFxyJykuXG4gICAgICAgICAgICByZXBsYWNlKC8nL2csICdcXFxcXFwnJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVyblxuICAgICAqL1xuICAgIF9nZXRMb2dpYyhkb21ub2RlKSB7XG4gICAgICAgIGxldCByZXQgPSB7b3BlbjpcIlwiLCBjbG9zZTpcIlwiLCBoYW5kbGVyOnt9fTtcblxuICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiaWZcIikpIHtcbiAgICAgICAgICAgIHJldC5vcGVuICs9IFwiaWYoXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJpZlwiKSArIFwiKXtcIjtcbiAgICAgICAgICAgIHJldC5jbG9zZSArPSBcIn1cIjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiZm9yXCIpKSB7XG4gICAgICAgICAgICByZXQub3BlbiArPSBcImZvcihcIiArIGRvbW5vZGUuZ2V0QXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImZvclwiKSArIFwiKXtcIjtcbiAgICAgICAgICAgIHJldC5jbG9zZSArPSBcIn1cIjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICBsZXQgbWF0Y2hlcyA9IGF0dHIubmFtZS5tYXRjaCgvXm9uKC4rKS8pO1xuICAgICAgICAgICAgaWYgKG1hdGNoZXMgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICByZXQuaGFuZGxlclthdHRyLm5hbWVdID0gYXR0ci52YWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7Tm9kZX1cbiAgICAgKiBAcGFyYW0gcGF0aCB7U3RyaW5nfVxuICAgICAqIEBwYXJhbSBkZXB0aFxuICAgICAqL1xuICAgIF9yZW5kZXIoZG9tbm9kZSwgcGF0aCwgZGVwdGgpIHtcbiAgICAgICAgbGV0IG91dCA9IFwiXCI7XG5cbiAgICAgICAgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBIVE1MRWxlbWVudCkge1xuXG4gICAgICAgICAgICBsZXQgbG9naWMgPSB0aGlzLl9nZXRMb2dpYyhkb21ub2RlKTtcbiAgICAgICAgICAgIGxldCBhdHRyU3RyID0gdGhpcy5fZ2V0QXR0cmlidXRlU3RyKGRvbW5vZGUpO1xuICAgICAgICAgICAgbGV0IGN1clBhdGggPSBwYXRoICsgXCIgPiBcIiArIGRvbW5vZGUudGFnTmFtZSArIGF0dHJTdHI7XG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5cIiArIGxvZ2ljLm9wZW47XG5cbiAgICAgICAgICAgIG91dCArPSBcIlxcbl9fZGVidWdfcGF0aF9fID0gJ1wiICsgdGhpcy5fYWRkc2xhc2hlcyhjdXJQYXRoKSArIFwiJztcIjtcbiAgICAgICAgICAgIGlmIChkb21ub2RlLnRhZ05hbWUgPT09IFwiU0NSSVBUXCIpIHtcbiAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5ldmFsKGBcIiArIGRvbW5vZGUudGV4dENvbnRlbnQgKyBcImApO1wiXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChkb21ub2RlLmhhc0F0dHJpYnV0ZShcImlzXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdcIiArIGRvbW5vZGUudGFnTmFtZSArIFwiJywge2lzOiAnXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZShcImlzXCIpICsgXCInfSk7XCI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ1wiICsgZG9tbm9kZS50YWdOYW1lICsgXCInKTtcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYXR0ciBvZiBkb21ub2RlLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHIubmFtZS5zdGFydHNXaXRoKHRoaXMuX2F0dHJQcmVmaXgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0uc2V0QXR0cmlidXRlKCdcIiArIGF0dHIubmFtZSArIFwiJywgYFwiICsgYXR0ci52YWx1ZSArIFwiYCk7XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGhhbmRsZXJOYW1lIGluIGxvZ2ljLmhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyBkZXB0aCArIFwiXS5cIiArIGhhbmRsZXJOYW1lICsgXCIgPSBmdW5jdGlvbihlKXsgXCIgKyBsb2dpYy5oYW5kbGVyW2hhbmRsZXJOYW1lXSArIFwiIH07XCI7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyAoZGVwdGggLSAxKSArIFwiXS5hcHBlbmRDaGlsZChfZVtcIiArIGRlcHRoICsgXCJdKTtcIjtcbiAgICAgICAgICAgICAgICAvLyBvdXQgKz0gXCJcXG5fX2h0bWxfXyArPSBgPFwiICsgZG9tbm9kZS50YWdOYW1lICsgYXR0clN0ciArIFwiPmA7XCI7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgY2hpbGQgb2YgZG9tbm9kZS5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoY2hpbGQsIGN1clBhdGgsIGRlcHRoICsgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy9vdXQgKz0gXCJcXG5fX2h0bWxfXyArPSBgPC9cIiArIGRvbW5vZGUudGFnTmFtZSArIFwiPmA7XCJcbiAgICAgICAgICAgIG91dCArPSBcIlxcblwiICsgbG9naWMuY2xvc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoZG9tbm9kZSBpbnN0YW5jZW9mIFRleHQpIHtcbiAgICAgICAgICAgIGxldCBjdXJQYXRoID0gcGF0aCArIFwiID4gKHRleHQpXCI7XG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fX2RlYnVnX3BhdGhfXyA9ICdcIiArIHRoaXMuX2FkZHNsYXNoZXMoY3VyUGF0aCkgKyBcIic7XCI7XG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIChkZXB0aC0xKSArXCJdLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGBcIiArIGRvbW5vZGUudGV4dENvbnRlbnQgKyBcImApKTtcIjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBkb21ub2RlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIHJlbmRlcihkb21ub2RlKSB7XG4gICAgICAgIGxldCBvdXQgPSBcInZhciBfX2RlYnVnX3BhdGhfXyA9ICcocm9vdCknO1wiO1xuICAgICAgICBvdXQgKz0gXCJcXG52YXIgX2UgPSBbZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JyldO1wiO1xuXG5cbiAgICAgICAgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBIVE1MVGVtcGxhdGVFbGVtZW50KSB7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGN1ckNoaWxkIG9mIGRvbW5vZGUuY29udGVudC5jaGlsZE5vZGVzKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihjdXJDaGlsZCwgIFwiKHJvb3QpXCIsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb3V0ICs9IHRoaXMuX3JlbmRlcihkb21ub2RlLCAgXCIocm9vdClcIiwgMSk7XG4gICAgICAgIH1cblxuXG4gICAgICAgIGxldCB4b3V0ID0gYFxuICAgICAgICAgICAgZm4gPSBmdW5jdGlvbihzY29wZSl7XG4gICAgICAgICAgICAgICAgbGV0IGZucyA9IFtdO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICR7b3V0fVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgJ0Vycm9yIGluICcgKyBfX2RlYnVnX3BhdGhfXyArICc6ICcgKyBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gX2VbMF07XG4gICAgICAgICAgICB9O1xuICAgICAgICBgO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKHhvdXQpO1xuICAgICAgICBsZXQgZm4gO1xuICAgICAgICBldmFsKHhvdXQpO1xuICAgICAgICByZXR1cm4gbmV3IEthc2ltaXJUZW1wbGF0ZShmbik7XG4gICAgfVxuXG59XG5cbiIsImNsYXNzIEthc2ltaXJUZW1wbGF0ZSB7XG5cbiAgICBjb25zdHJ1Y3Rvcih0cGxGbikge1xuICAgICAgICB0aGlzLl90cGxGbiA9IHRwbEZuO1xuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge0hUTUxFbGVtZW50fVxuICAgICAgICAgKiBAcHJpdmF0ZVxuICAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fYmluZCA9IG51bGw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tU2VsZWN0b3Ige3N0cmluZ3xIVE1MRWxlbWVudH1cbiAgICAgKiBAcmV0dXJuIEthc2ltaXJUZW1wbGF0ZVxuICAgICAqL1xuICAgIHJlbmRlckluKGRvbVNlbGVjdG9yKSB7XG4gICAgICAgIGxldCBub2RlID0gbnVsbDtcbiAgICAgICAgaWYgKHR5cGVvZiBkb21TZWxlY3RvciA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgbm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZG9tU2VsZWN0b3IpO1xuICAgICAgICAgICAgaWYgKG5vZGUgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJiaW5kKCk6IGNhbid0IGZpbmQgZWxlbWVudCAnXCIgKyBkb21TZWxlY3RvciArIFwiJ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbVNlbGVjdG9yIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb21TZWxlY3RvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBwYXJhbWV0ZXIxIGlzIG5vdCBhIEh0bWxFbGVtZW50XCI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fYmluZCA9IG5vZGU7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgcmVuZGVyKHNjb3BlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuX3RwbEZuKHNjb3BlKSk7XG4gICAgICAgIHRoaXMuX2JpbmQucmVwbGFjZUNoaWxkKHRoaXMuX3RwbEZuKHNjb3BlKSwgdGhpcy5fYmluZC5maXJzdENoaWxkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gc2NvcGVcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICovXG4gICAgb2JzZXJ2ZShzY29wZSkge1xuICAgICAgICB0aGlzLnJlbmRlcihzY29wZSk7XG4gICAgICAgIHdpbmRvdy5zZXRJbnRlcnZhbChlID0+IHtcbiAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShzY29wZSkgIT09IHRoaXMuX29ic2VydmVkTGFzdFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fb2JzZXJ2ZWRMYXN0VmFsdWUgPSBKU09OLnN0cmluZ2lmeShzY29wZSk7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAyMDApO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbn1cblxuIiwiXG5cblxuY2xhc3MgS21UcGxFbGVtIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuXG4gICAgY29uc3RydWN0b3IoKSB7XG4gICAgICAgIHN1cGVyKCk7XG5cbiAgICAgICAgdGhpcy5fYXR0cnMgPSB7XG4gICAgICAgICAgICBiaW5kOiBudWxsLFxuICAgICAgICAgICAgb2JzZXJ2ZTogbnVsbCxcbiAgICAgICAgICAgIHNjb3BlOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICpcbiAgICAgICAgICogQHR5cGUge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgICAgICovXG4gICAgICAgIHRoaXMudHBsID0gbnVsbDtcbiAgICB9XG5cblxuICAgIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCkgeyByZXR1cm4gW1wiYmluZFwiLCBcIm9ic2VydmVcIiwgXCJzY29wZVwiXTsgfVxuXG4gICAgYXR0cmlidXRlQ2hhbmdlZENhbGxiYWNrKG5hbWUsIG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICAgICAgICB0aGlzLl9hdHRyc1tuYW1lXSA9IG5ld1ZhbHVlO1xuICAgIH1cblxuICAgIGNvbm5lY3RlZENhbGxiYWNrKCkge1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImxvYWRcIiwgd2luZG93W1wiZGF0YVwiXSk7XG4gICAgICAgICAgICBsZXQgdGVtcGxhdGUgPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoXCJ0ZW1wbGF0ZVwiKTtcbiAgICAgICAgICAgIGlmICh0ZW1wbGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCI8a20tdHBsPiBoYXMgbm8gdGVtcGxhdGUgY2hpbGQuXCIsIHRoaXMpO1xuICAgICAgICAgICAgICAgIHRocm93IFwiPGttLXRwbD4gcmVxdWlyZXMgPHRlbXBsYXRlPiBjaGlsZC5cIjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhpcy50cGwgPSBrYXNpbWlyX3RwbCh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRlbXBsYXRlKTtcbiAgICAgICAgICAgIHRoaXMudHBsLnJlbmRlckluKHRoaXMpO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5fYXR0cnMuc2NvcGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSBudWxsO1xuICAgICAgICAgICAgICAgIGV2YWwoXCJzY29wZSA9IFwiICsgdGhpcy5fYXR0cnMuc2NvcGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLmJpbmQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRwbC5iaW5kKGV2YWwodGhpcy5fYXR0cnMuYmluZCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLm9ic2VydmUpIHtcbiAgICAgICAgICAgICAgICBsZXQgb2JzZXJ2ZWQgPSBldmFsKHRoaXMuX2F0dHJzLm9ic2VydmUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG9ic2VydmVkKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9ic2VydmVkICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBcIm9ic2VydmVkIHZhcmlhYmxlICdcIiArIHRoaXMuX2F0dHJzLm9ic2VydmUgKyBcIicgaXMgdHlwZW9mIFwiICsgKHR5cGVvZiBvYnNlcnZlZCkgKyBcIiBidXQgb2JqZWN0IHJlcXVpcmVkXCI7XG4gICAgICAgICAgICAgICAgdGhpcy50cGwub2JzZXJ2ZShvYnNlcnZlZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSArIFwiIGluIGVsZW1lbnQgXCIsIHRoaXMpO1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgZGlzY29ubmVjdENhbGxiYWNrKCkge1xuXG4gICAgfVxuXG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZShcImttLXRwbFwiLCBLbVRwbEVsZW0pO1xuXG4iXX0=
