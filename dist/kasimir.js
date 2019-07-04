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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoia2FzaW1pci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9odHRwKHVybCwgcGFyYW1zPXt9KSB7XG4gICAgcmV0dXJuIG5ldyBLYXNpbWlySHR0cFJlcXVlc3QodXJsLCBwYXJhbXMpO1xufSIsIlxuXG5jbGFzcyBLYXNpbWlySHR0cFJlcXVlc3Qge1xuXG4gICAgY29uc3RydWN0b3IodXJsLCBwYXJhbXM9e30pIHtcblxuICAgICAgICB1cmwgPSB1cmwucmVwbGFjZSgvKFxce3xcXDopKFthLXpBLVowLTlfXFwtXSspLywgKG1hdGNoLCBwMSwgcDIpID0+IHtcbiAgICAgICAgICAgIGlmICggISBwYXJhbXMuaGFzT3duUHJvcGVydHkocDIpKVxuICAgICAgICAgICAgICAgIHRocm93IFwicGFyYW1ldGVyICdcIiArIHAyICsgXCInIG1pc3NpbmcgaW4gdXJsICdcIiArIHVybCArIFwiJ1wiO1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVVSSShwYXJhbXNbcDJdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXG4gICAgICAgICAgICBib2R5OiBudWxsLFxuICAgICAgICAgICAgaGVhZGVyczoge30sXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICBvbkVycm9yOiBudWxsLFxuICAgICAgICAgICAgZGF0YTogbnVsbFxuICAgICAgICB9O1xuXG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYWRkaXRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIHVybFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoUGFyYW1zKHBhcmFtcykge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LnVybC5pbmRleE9mKFwiP1wiKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCI/XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdHIgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQobmFtZSkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNbbmFtZV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IHN0ci5qb2luKFwiJlwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhNZXRob2QobWV0aG9kKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBtZXRob2Q7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VuXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCZWFyZXJUb2tlbih0b2tlbikge1xuICAgICAgICB0aGlzLndpdGhIZWFkZXJzKHtcImF1dGhvcml6YXRpb25cIjogXCJiYWVyZXIgXCIgKyB0b2tlbn0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGhlYWRlcnNcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEhlYWRlcnMoaGVhZGVycykge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucmVxdWVzdC5oZWFkZXJzLCBoZWFkZXJzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBib2R5XG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCb2R5KGJvZHkpIHtcbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5tZXRob2QgPT09IFwiR0VUXCIpXG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QubWV0aG9kID0gXCJQT1NUXCI7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGJvZHkpIHx8IHR5cGVvZiBib2R5ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICBib2R5ID0gSlNPTi5zdHJpbmdpZnkoYm9keSk7XG4gICAgICAgICAgICB0aGlzLndpdGhIZWFkZXJzKHtcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIn0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0LmJvZHkgPSBib2R5O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoT25FcnJvcihjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnJlcXVlc3Qub25FcnJvciA9IGNhbGxiYWNrO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzZXQganNvbihmbikge1xuICAgICAgICB0aGlzLnNlbmQoKHJlcykgPT4ge1xuICAgICAgICAgICAgZm4ocmVzLmdldEJvZHlKc29uKCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzZXQgcGxhaW4oZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kKChyZXMpID0+IHtcbiAgICAgICAgICAgIGZuKHJlcy5nZXRCb2R5KCkpO1xuICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogQHJldHVyblxuICAgICAqL1xuICAgIHNlbmQob25TdWNjZXNzRm4pIHtcbiAgICAgICAgbGV0IHhodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgeGh0dHAub3Blbih0aGlzLnJlcXVlc3QubWV0aG9kLCB0aGlzLnJlcXVlc3QudXJsKTtcbiAgICAgICAgZm9yIChsZXQgaGVhZGVyTmFtZSBpbiB0aGlzLnJlcXVlc3QuaGVhZGVycykge1xuICAgICAgICAgICAgeGh0dHAuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXJOYW1lLCB0aGlzLnJlcXVlc3QuaGVhZGVyc1toZWFkZXJOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgeGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHhodHRwLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9rXCIsIHhodHRwKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXF1ZXN0Lm9uRXJyb3IgIT09IG51bGwgJiYgeGh0dHAuc3RhdHVzID49IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3Qub25FcnJvcihuZXcgS2FzaW1pckh0dHBSZXNwb25zZSh4aHR0cC5yZXNwb25zZSwgeGh0dHAuc3RhdHVzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzRm4obmV3IEthc2ltaXJIdHRwUmVzcG9uc2UoeGh0dHAucmVzcG9uc2UsIHhodHRwLnN0YXR1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuXG4gICAgICAgIHhodHRwLnNlbmQodGhpcy5yZXF1ZXN0LmJvZHkpO1xuICAgIH1cblxufSIsIlxuXG5jbGFzcyBLYXNpbWlySHR0cFJlc3BvbnNlIHtcblxuXG4gICAgY29uc3RydWN0b3IgKGJvZHksIHN0YXR1cywgcmVxdWVzdCkge1xuICAgICAgICB0aGlzLmJvZHkgPSBib2R5O1xuICAgICAgICB0aGlzLnN0YXR1cyA9IHN0YXR1cztcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXRCb2R5SnNvbigpIHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodGhpcy5ib2R5KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldEJvZHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJvZHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzT2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyA9PT0gMjAwO1xuICAgIH1cblxufSIsIlxuXG5cbmNsYXNzIEttSW5wdXRFbGVtIGV4dGVuZHMgSFRNTElucHV0RWxlbWVudCB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fYXR0cnMgPSB7XG4gICAgICAgICAgICBiaW5kOiBudWxsLFxuICAgICAgICAgICAgb2JzZXJ2ZTogbnVsbCxcbiAgICAgICAgICAgIHNjb3BlOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgfTtcblxuICAgIH1cblxuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbXCJiaW5kXCJdOyB9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sobmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2F0dHJzW25hbWVdID0gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGVkISEhXCIsIHRoaXMpO1xuICAgICAgICBjb25zb2xlLmxvZyh3aW5kb3cuc3RhdHVzKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGV2YWwodGhpcy5fYXR0cnMuYmluZCk7XG5cbiAgICAgICAgICAgIHRoaXMub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjaGFuZ2VcIiwgdGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZXZhbCh0aGlzLl9hdHRycy5iaW5kICsgXCIgPSB0aGlzLnZhbHVlXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUgKyBcIiBpbiBlbGVtZW50IFwiLCB0aGlzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS1pbnB1dFwiLCBLbUlucHV0RWxlbSwge2V4dGVuZHM6IFwiaW5wdXRcIn0pO1xuXG4iLCJcblxuLyoqXG4gKlxuICogQHBhcmFtIHRlbXBsYXRlU2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl90cGwodGVtcGxhdGVTZWxlY3Rvcikge1xuICAgIGxldCB0cGxFbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdHBsRWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGVtcGxhdGVTZWxlY3Rvcik7XG4gICAgICAgIGlmICh0cGxFbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX3RwbCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgdGVtcGxhdGVTZWxlY3RvciArIFwiJ1wiO1xuICAgIH0gZWxzZSBpZiAodGVtcGxhdGVTZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHRwbEVsZW0gPSB0ZW1wbGF0ZVNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFwia2FzaW1pcl90cGwoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgIH1cbiAgICBsZXQgcmVuZGVyZXIgPSBuZXcgS2FzaW1pclJlbmRlcmVyKCk7XG4gICAgcmV0dXJuIHJlbmRlcmVyLnJlbmRlcih0cGxFbGVtKTtcbn1cblxuIiwiXG5cbmNsYXNzIEthc2ltaXJSZW5kZXJlciB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyUHJlZml4PVwiKlwiKSB7XG4gICAgICAgIHRoaXMuX2F0dHJQcmVmaXggPSBhdHRyUHJlZml4XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKSB7XG4gICAgICAgIGxldCByZXQgPSBcIlwiO1xuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcylcbiAgICAgICAgICAgIHJldCArPSBcIiBcIiArIGF0dHIubmFtZSArIFwiPVxcXCJcIiArIGF0dHIudmFsdWUgKyBcIlxcXCJcIjtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cblxuICAgIF9hZGRzbGFzaGVzKHN0cmluZykge1xuICAgICAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHUwMDA4L2csICdcXFxcYicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx0L2csICdcXFxcdCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxuL2csICdcXFxcbicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxmL2csICdcXFxcZicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxyL2csICdcXFxccicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvJy9nLCAnXFxcXFxcJycpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBfZ2V0TG9naWMoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0ge29wZW46XCJcIiwgY2xvc2U6XCJcIiwgaGFuZGxlcjp7fX07XG5cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpKSB7XG4gICAgICAgICAgICByZXQub3BlbiArPSBcImlmKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiaWZcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImZvclwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJmb3IoXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgbGV0IG1hdGNoZXMgPSBhdHRyLm5hbWUubWF0Y2goL15vbiguKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVzID09PSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmV0LmhhbmRsZXJbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge05vZGV9XG4gICAgICogQHBhcmFtIHBhdGgge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gZGVwdGhcbiAgICAgKi9cbiAgICBfcmVuZGVyKGRvbW5vZGUsIHBhdGgsIGRlcHRoKSB7XG4gICAgICAgIGxldCBvdXQgPSBcIlwiO1xuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcblxuICAgICAgICAgICAgbGV0IGxvZ2ljID0gdGhpcy5fZ2V0TG9naWMoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgYXR0clN0ciA9IHRoaXMuX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKTtcbiAgICAgICAgICAgIGxldCBjdXJQYXRoID0gcGF0aCArIFwiID4gXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5vcGVuO1xuXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fX2RlYnVnX3BhdGhfXyA9ICdcIiArIHRoaXMuX2FkZHNsYXNoZXMoY3VyUGF0aCkgKyBcIic7XCI7XG4gICAgICAgICAgICBpZiAoZG9tbm9kZS50YWdOYW1lID09PSBcIlNDUklQVFwiKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuZXZhbChgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKTtcIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUoXCJpc1wiKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicsIHtpczogJ1wiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUoXCJpc1wiKSArIFwiJ30pO1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdcIiArIGRvbW5vZGUudGFnTmFtZSArIFwiJyk7XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCh0aGlzLl9hdHRyUHJlZml4KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLnNldEF0dHJpYnV0ZSgnXCIgKyBhdHRyLm5hbWUgKyBcIicsIGBcIiArIGF0dHIudmFsdWUgKyBcImApO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBoYW5kbGVyTmFtZSBpbiBsb2dpYy5oYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0uXCIgKyBoYW5kbGVyTmFtZSArIFwiID0gZnVuY3Rpb24oZSl7IFwiICsgbG9naWMuaGFuZGxlcltoYW5kbGVyTmFtZV0gKyBcIiB9O1wiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoIC0gMSkgKyBcIl0uYXBwZW5kQ2hpbGQoX2VbXCIgKyBkZXB0aCArIFwiXSk7XCI7XG4gICAgICAgICAgICAgICAgLy8gb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDxcIiArIGRvbW5vZGUudGFnTmFtZSArIGF0dHJTdHIgKyBcIj5gO1wiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGNoaWxkIG9mIGRvbW5vZGUuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGNoaWxkLCBjdXJQYXRoLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDwvXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIj5gO1wiXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5cIiArIGxvZ2ljLmNsb3NlO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBUZXh0KSB7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+ICh0ZXh0KVwiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyAoZGVwdGgtMSkgK1wiXS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKSk7XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dFxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgb3V0ID0gXCJ2YXIgX19kZWJ1Z19wYXRoX18gPSAnKHJvb3QpJztcIjtcbiAgICAgICAgb3V0ICs9IFwiXFxudmFyIF9lID0gW2RvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXTtcIjtcblxuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuXG4gICAgICAgICAgICBmb3IgKGxldCBjdXJDaGlsZCBvZiBkb21ub2RlLmNvbnRlbnQuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoY3VyQ2hpbGQsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoZG9tbm9kZSwgIFwiKHJvb3QpXCIsIDEpO1xuICAgICAgICB9XG5cblxuICAgICAgICBsZXQgeG91dCA9IGBcbiAgICAgICAgICAgIGZuID0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgICAgICAgICAgIGxldCBmbnMgPSBbXTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAke291dH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdFcnJvciBpbiAnICsgX19kZWJ1Z19wYXRoX18gKyAnOiAnICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9lWzBdO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgYDtcblxuICAgICAgICBjb25zb2xlLmxvZyh4b3V0KTtcbiAgICAgICAgbGV0IGZuIDtcbiAgICAgICAgZXZhbCh4b3V0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBLYXNpbWlyVGVtcGxhdGUoZm4pO1xuICAgIH1cblxufVxuXG4iLCJjbGFzcyBLYXNpbWlyVGVtcGxhdGUge1xuXG4gICAgY29uc3RydWN0b3IodHBsRm4pIHtcbiAgICAgICAgdGhpcy5fdHBsRm4gPSB0cGxGbjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2JpbmQgPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbVNlbGVjdG9yIHtzdHJpbmd8SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVybiBLYXNpbWlyVGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXJJbihkb21TZWxlY3Rvcikge1xuICAgICAgICBsZXQgbm9kZSA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgZG9tU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGRvbVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgZG9tU2VsZWN0b3IgKyBcIidcIjtcbiAgICAgICAgfSBlbHNlIGlmIChkb21TZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBub2RlID0gZG9tU2VsZWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBcImJpbmQoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2JpbmQgPSBub2RlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIHJlbmRlcihzY29wZSkge1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLl90cGxGbihzY29wZSkpO1xuICAgICAgICB0aGlzLl9iaW5kLnJlcGxhY2VDaGlsZCh0aGlzLl90cGxGbihzY29wZSksIHRoaXMuX2JpbmQuZmlyc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIG9ic2VydmUoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICB3aW5kb3cuc2V0SW50ZXJ2YWwoZSA9PiB7XG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoc2NvcGUpICE9PSB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gSlNPTi5zdHJpbmdpZnkoc2NvcGUpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG59XG5cbiIsIlxuXG5cbmNsYXNzIEttVHBsRWxlbSBleHRlbmRzIEhUTUxFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX2F0dHJzID0ge1xuICAgICAgICAgICAgYmluZDogbnVsbCxcbiAgICAgICAgICAgIG9ic2VydmU6IG51bGwsXG4gICAgICAgICAgICBzY29wZTogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRwbCA9IG51bGw7XG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIiwgXCJvYnNlcnZlXCIsIFwic2NvcGVcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkXCIsIHdpbmRvd1tcImRhdGFcIl0pO1xuICAgICAgICAgICAgbGV0IHRlbXBsYXRlID0gdGhpcy5xdWVyeVNlbGVjdG9yKFwidGVtcGxhdGVcIik7XG4gICAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiPGttLXRwbD4gaGFzIG5vIHRlbXBsYXRlIGNoaWxkLlwiLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBcIjxrbS10cGw+IHJlcXVpcmVzIDx0ZW1wbGF0ZT4gY2hpbGQuXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMudHBsID0ga2FzaW1pcl90cGwodGVtcGxhdGUpO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDaGlsZCh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLnRwbC5yZW5kZXJJbih0aGlzKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLnNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBldmFsKFwic2NvcGUgPSBcIiArIHRoaXMuX2F0dHJzLnNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5iaW5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cGwuYmluZChldmFsKHRoaXMuX2F0dHJzLmJpbmQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5vYnNlcnZlKSB7XG4gICAgICAgICAgICAgICAgbGV0IG9ic2VydmVkID0gZXZhbCh0aGlzLl9hdHRycy5vYnNlcnZlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhvYnNlcnZlZCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYnNlcnZlZCAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJvYnNlcnZlZCB2YXJpYWJsZSAnXCIgKyB0aGlzLl9hdHRycy5vYnNlcnZlICsgXCInIGlzIHR5cGVvZiBcIiArICh0eXBlb2Ygb2JzZXJ2ZWQpICsgXCIgYnV0IG9iamVjdCByZXF1aXJlZFwiO1xuICAgICAgICAgICAgICAgIHRoaXMudHBsLm9ic2VydmUob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUgKyBcIiBpbiBlbGVtZW50IFwiLCB0aGlzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RDYWxsYmFjaygpIHtcblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS10cGxcIiwgS21UcGxFbGVtKTtcblxuIl19
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAva2FzaW1pcl9odHRwLmpzIiwiaHR0cC9rYXNpbWlyLWh0dHAtcmVxdWVzdC5qcyIsImh0dHAvS2FzaW1pckh0dHBSZXNwb25zZS5qcyIsImttLWlucHV0LmpzIiwidHBsL2thc2ltaXJfdHBsLmpzIiwidHBsL2thc2ltaXItcmVuZGVyZXIuanMiLCJ0cGwva2FzaW1pci10ZW1wbGF0ZS5qcyIsInRwbC9rbS10cGwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoia2FzaW1pci5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICpcbiAqIEBwYXJhbSB1cmxcbiAqIEBwYXJhbSBwYXJhbXNcbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl9odHRwKHVybCwgcGFyYW1zPXt9KSB7XG4gICAgcmV0dXJuIG5ldyBLYXNpbWlySHR0cFJlcXVlc3QodXJsLCBwYXJhbXMpO1xufSIsIlxuXG5jbGFzcyBLYXNpbWlySHR0cFJlcXVlc3Qge1xuXG4gICAgY29uc3RydWN0b3IodXJsLCBwYXJhbXM9e30pIHtcblxuICAgICAgICB1cmwgPSB1cmwucmVwbGFjZSgvKFxce3xcXDopKFthLXpBLVowLTlfXFwtXSspLywgKG1hdGNoLCBwMSwgcDIpID0+IHtcbiAgICAgICAgICAgIGlmICggISBwYXJhbXMuaGFzT3duUHJvcGVydHkocDIpKVxuICAgICAgICAgICAgICAgIHRocm93IFwicGFyYW1ldGVyICdcIiArIHAyICsgXCInIG1pc3NpbmcgaW4gdXJsICdcIiArIHVybCArIFwiJ1wiO1xuICAgICAgICAgICAgcmV0dXJuIGVuY29kZVVSSShwYXJhbXNbcDJdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0ge1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IFwiR0VUXCIsXG4gICAgICAgICAgICBib2R5OiBudWxsLFxuICAgICAgICAgICAgaGVhZGVyczoge30sXG4gICAgICAgICAgICBkYXRhVHlwZTogXCJ0ZXh0XCIsXG4gICAgICAgICAgICBvbkVycm9yOiBudWxsLFxuICAgICAgICAgICAgZGF0YTogbnVsbFxuICAgICAgICB9O1xuXG5cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBBZGQgYWRkaXRpb25hbCBxdWVyeSBwYXJhbWV0ZXJzIHRvIHVybFxuICAgICAqXG4gICAgICogQHBhcmFtIHBhcmFtc1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoUGFyYW1zKHBhcmFtcykge1xuICAgICAgICBpZiAodGhpcy5yZXF1ZXN0LnVybC5pbmRleE9mKFwiP1wiKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWVzdC51cmwgKz0gXCI/XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IFwiJlwiO1xuICAgICAgICB9XG4gICAgICAgIGxldCBzdHIgPSBbXTtcbiAgICAgICAgZm9yIChsZXQgbmFtZSBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmIChwYXJhbXMuaGFzT3duUHJvcGVydHkobmFtZSkpIHtcbiAgICAgICAgICAgICAgICBzdHIucHVzaChlbmNvZGVVUklDb21wb25lbnQobmFtZSkgKyBcIj1cIiArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbXNbbmFtZV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlcXVlc3QudXJsICs9IHN0ci5qb2luKFwiJlwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbWV0aG9kXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhNZXRob2QobWV0aG9kKSB7XG4gICAgICAgIHRoaXMucmVxdWVzdC5tZXRob2QgPSBtZXRob2Q7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHRva2VuXG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCZWFyZXJUb2tlbih0b2tlbikge1xuICAgICAgICB0aGlzLndpdGhIZWFkZXJzKHtcImF1dGhvcml6YXRpb25cIjogXCJiYWVyZXIgXCIgKyB0b2tlbn0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGhlYWRlcnNcbiAgICAgKiBAcmV0dXJuIHtLYXNpbWlySHR0cFJlcXVlc3R9XG4gICAgICovXG4gICAgd2l0aEhlYWRlcnMoaGVhZGVycykge1xuICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucmVxdWVzdC5oZWFkZXJzLCBoZWFkZXJzKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBib2R5XG4gICAgICogQHJldHVybiB7S2FzaW1pckh0dHBSZXF1ZXN0fVxuICAgICAqL1xuICAgIHdpdGhCb2R5KGJvZHkpIHtcbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdC5tZXRob2QgPT09IFwiR0VUXCIpXG4gICAgICAgICAgICB0aGlzLnJlcXVlc3QubWV0aG9kID0gXCJQT1NUXCI7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGJvZHkpIHx8IHR5cGVvZiBib2R5ID09PSBcIm9iamVjdFwiKSB7XG4gICAgICAgICAgICBib2R5ID0gSlNPTi5zdHJpbmdpZnkoYm9keSk7XG4gICAgICAgICAgICB0aGlzLndpdGhIZWFkZXJzKHtcImNvbnRlbnQtdHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIn0pO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5yZXF1ZXN0LmJvZHkgPSBib2R5O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYWxsYmFja1xuICAgICAqIEByZXR1cm4ge0thc2ltaXJIdHRwUmVxdWVzdH1cbiAgICAgKi9cbiAgICB3aXRoT25FcnJvcihjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnJlcXVlc3Qub25FcnJvciA9IGNhbGxiYWNrO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBzZXQganNvbihmbikge1xuICAgICAgICB0aGlzLnNlbmQoKHJlcykgPT4ge1xuICAgICAgICAgICAgZm4ocmVzLmdldEJvZHlKc29uKCkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzZXQgcGxhaW4oZm4pIHtcbiAgICAgICAgdGhpcy5zZW5kKChyZXMpID0+IHtcbiAgICAgICAgICAgIGZuKHJlcy5nZXRCb2R5KCkpO1xuICAgICAgICB9KVxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZm5cbiAgICAgKiBAcGFyYW0gZmlsdGVyXG4gICAgICogQHJldHVyblxuICAgICAqL1xuICAgIHNlbmQob25TdWNjZXNzRm4pIHtcbiAgICAgICAgbGV0IHhodHRwID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICAgICAgeGh0dHAub3Blbih0aGlzLnJlcXVlc3QubWV0aG9kLCB0aGlzLnJlcXVlc3QudXJsKTtcbiAgICAgICAgZm9yIChsZXQgaGVhZGVyTmFtZSBpbiB0aGlzLnJlcXVlc3QuaGVhZGVycykge1xuICAgICAgICAgICAgeGh0dHAuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXJOYW1lLCB0aGlzLnJlcXVlc3QuaGVhZGVyc1toZWFkZXJOYW1lXSk7XG4gICAgICAgIH1cbiAgICAgICAgeGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHhodHRwLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIm9rXCIsIHhodHRwKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXF1ZXN0Lm9uRXJyb3IgIT09IG51bGwgJiYgeGh0dHAuc3RhdHVzID49IDQwMCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3Qub25FcnJvcihuZXcgS2FzaW1pckh0dHBSZXNwb25zZSh4aHR0cC5yZXNwb25zZSwgeGh0dHAuc3RhdHVzLCB0aGlzKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb25TdWNjZXNzRm4obmV3IEthc2ltaXJIdHRwUmVzcG9uc2UoeGh0dHAucmVzcG9uc2UsIHhodHRwLnN0YXR1cywgdGhpcykpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuXG4gICAgICAgIHhodHRwLnNlbmQodGhpcy5yZXF1ZXN0LmJvZHkpO1xuICAgIH1cblxufSIsIlxuXG5jbGFzcyBLYXNpbWlySHR0cFJlc3BvbnNlIHtcblxuXG4gICAgY29uc3RydWN0b3IgKGJvZHksIHN0YXR1cywgcmVxdWVzdCkge1xuICAgICAgICB0aGlzLmJvZHkgPSBib2R5O1xuICAgICAgICB0aGlzLnN0YXR1cyA9IHN0YXR1cztcbiAgICAgICAgdGhpcy5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge29iamVjdH1cbiAgICAgKi9cbiAgICBnZXRCb2R5SnNvbigpIHtcbiAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UodGhpcy5ib2R5KVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHJldHVybiB7c3RyaW5nfVxuICAgICAqL1xuICAgIGdldEJvZHkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJvZHk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzT2soKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0YXR1cyA9PT0gMjAwO1xuICAgIH1cblxufSIsIlxuXG5cbmNsYXNzIEttSW5wdXRFbGVtIGV4dGVuZHMgSFRNTElucHV0RWxlbWVudCB7XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5fYXR0cnMgPSB7XG4gICAgICAgICAgICBiaW5kOiBudWxsLFxuICAgICAgICAgICAgb2JzZXJ2ZTogbnVsbCxcbiAgICAgICAgICAgIHNjb3BlOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuX2NvbmZpZyA9IHtcbiAgICAgICAgfTtcblxuICAgIH1cblxuXG4gICAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKSB7IHJldHVybiBbXCJiaW5kXCJdOyB9XG5cbiAgICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sobmFtZSwgb2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gICAgICAgIHRoaXMuX2F0dHJzW25hbWVdID0gbmV3VmFsdWU7XG4gICAgfVxuXG4gICAgY29ubmVjdGVkQ2FsbGJhY2soKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY29ubmVjdGVkISEhXCIsIHRoaXMpO1xuICAgICAgICBjb25zb2xlLmxvZyh3aW5kb3cuc3RhdHVzKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGV2YWwodGhpcy5fYXR0cnMuYmluZCk7XG5cbiAgICAgICAgICAgIHRoaXMub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjaGFuZ2VcIiwgdGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgZXZhbCh0aGlzLl9hdHRycy5iaW5kICsgXCIgPSB0aGlzLnZhbHVlXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUgKyBcIiBpbiBlbGVtZW50IFwiLCB0aGlzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS1pbnB1dFwiLCBLbUlucHV0RWxlbSwge2V4dGVuZHM6IFwiaW5wdXRcIn0pO1xuXG4iLCJcblxuLyoqXG4gKlxuICogQHBhcmFtIHRlbXBsYXRlU2VsZWN0b3JcbiAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAqL1xuZnVuY3Rpb24ga2FzaW1pcl90cGwodGVtcGxhdGVTZWxlY3Rvcikge1xuICAgIGxldCB0cGxFbGVtID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHRlbXBsYXRlU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdHBsRWxlbSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGVtcGxhdGVTZWxlY3Rvcik7XG4gICAgICAgIGlmICh0cGxFbGVtID09PSBudWxsKVxuICAgICAgICAgICAgdGhyb3cgXCJrYXNpbWlyX3RwbCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgdGVtcGxhdGVTZWxlY3RvciArIFwiJ1wiO1xuICAgIH0gZWxzZSBpZiAodGVtcGxhdGVTZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgIHRwbEVsZW0gPSB0ZW1wbGF0ZVNlbGVjdG9yO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFwia2FzaW1pcl90cGwoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgIH1cbiAgICBsZXQgcmVuZGVyZXIgPSBuZXcgS2FzaW1pclJlbmRlcmVyKCk7XG4gICAgcmV0dXJuIHJlbmRlcmVyLnJlbmRlcih0cGxFbGVtKTtcbn1cblxuIiwiXG5cbmNsYXNzIEthc2ltaXJSZW5kZXJlciB7XG5cbiAgICBjb25zdHJ1Y3RvcihhdHRyUHJlZml4PVwiKlwiKSB7XG4gICAgICAgIHRoaXMuX2F0dHJQcmVmaXggPSBhdHRyUHJlZml4XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZSB7SFRNTEVsZW1lbnR9XG4gICAgICovXG4gICAgX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKSB7XG4gICAgICAgIGxldCByZXQgPSBcIlwiO1xuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcylcbiAgICAgICAgICAgIHJldCArPSBcIiBcIiArIGF0dHIubmFtZSArIFwiPVxcXCJcIiArIGF0dHIudmFsdWUgKyBcIlxcXCJcIjtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cblxuICAgIF9hZGRzbGFzaGVzKHN0cmluZykge1xuICAgICAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykuXG4gICAgICAgICAgICByZXBsYWNlKC9cXHUwMDA4L2csICdcXFxcYicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFx0L2csICdcXFxcdCcpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxuL2csICdcXFxcbicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxmL2csICdcXFxcZicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXFxyL2csICdcXFxccicpLlxuICAgICAgICAgICAgcmVwbGFjZSgvJy9nLCAnXFxcXFxcJycpLlxuICAgICAgICAgICAgcmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge0hUTUxFbGVtZW50fVxuICAgICAqIEByZXR1cm5cbiAgICAgKi9cbiAgICBfZ2V0TG9naWMoZG9tbm9kZSkge1xuICAgICAgICBsZXQgcmV0ID0ge29wZW46XCJcIiwgY2xvc2U6XCJcIiwgaGFuZGxlcjp7fX07XG5cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImlmXCIpKSB7XG4gICAgICAgICAgICByZXQub3BlbiArPSBcImlmKFwiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUodGhpcy5fYXR0clByZWZpeCArIFwiaWZcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRvbW5vZGUuaGFzQXR0cmlidXRlKHRoaXMuX2F0dHJQcmVmaXggKyBcImZvclwiKSkge1xuICAgICAgICAgICAgcmV0Lm9wZW4gKz0gXCJmb3IoXCIgKyBkb21ub2RlLmdldEF0dHJpYnV0ZSh0aGlzLl9hdHRyUHJlZml4ICsgXCJmb3JcIikgKyBcIil7XCI7XG4gICAgICAgICAgICByZXQuY2xvc2UgKz0gXCJ9XCI7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBhdHRyIG9mIGRvbW5vZGUuYXR0cmlidXRlcykge1xuICAgICAgICAgICAgbGV0IG1hdGNoZXMgPSBhdHRyLm5hbWUubWF0Y2goL15vbiguKykvKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGVzID09PSBudWxsKVxuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmV0LmhhbmRsZXJbYXR0ci5uYW1lXSA9IGF0dHIudmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmV0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbW5vZGUge05vZGV9XG4gICAgICogQHBhcmFtIHBhdGgge1N0cmluZ31cbiAgICAgKiBAcGFyYW0gZGVwdGhcbiAgICAgKi9cbiAgICBfcmVuZGVyKGRvbW5vZGUsIHBhdGgsIGRlcHRoKSB7XG4gICAgICAgIGxldCBvdXQgPSBcIlwiO1xuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTEVsZW1lbnQpIHtcblxuICAgICAgICAgICAgbGV0IGxvZ2ljID0gdGhpcy5fZ2V0TG9naWMoZG9tbm9kZSk7XG4gICAgICAgICAgICBsZXQgYXR0clN0ciA9IHRoaXMuX2dldEF0dHJpYnV0ZVN0cihkb21ub2RlKTtcbiAgICAgICAgICAgIGxldCBjdXJQYXRoID0gcGF0aCArIFwiID4gXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBhdHRyU3RyO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuXCIgKyBsb2dpYy5vcGVuO1xuXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5fX2RlYnVnX3BhdGhfXyA9ICdcIiArIHRoaXMuX2FkZHNsYXNoZXMoY3VyUGF0aCkgKyBcIic7XCI7XG4gICAgICAgICAgICBpZiAoZG9tbm9kZS50YWdOYW1lID09PSBcIlNDUklQVFwiKSB7XG4gICAgICAgICAgICAgICAgb3V0ICs9IFwiXFxuZXZhbChgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKTtcIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoZG9tbm9kZS5oYXNBdHRyaWJ1dGUoXCJpc1wiKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIicsIHtpczogJ1wiICsgZG9tbm9kZS5nZXRBdHRyaWJ1dGUoXCJpc1wiKSArIFwiJ30pO1wiO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdcIiArIGRvbW5vZGUudGFnTmFtZSArIFwiJyk7XCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAobGV0IGF0dHIgb2YgZG9tbm9kZS5hdHRyaWJ1dGVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhdHRyLm5hbWUuc3RhcnRzV2l0aCh0aGlzLl9hdHRyUHJlZml4KSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gXCJcXG5fZVtcIiArIGRlcHRoICsgXCJdLnNldEF0dHJpYnV0ZSgnXCIgKyBhdHRyLm5hbWUgKyBcIicsIGBcIiArIGF0dHIudmFsdWUgKyBcImApO1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBoYW5kbGVyTmFtZSBpbiBsb2dpYy5oYW5kbGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgZGVwdGggKyBcIl0uXCIgKyBoYW5kbGVyTmFtZSArIFwiID0gZnVuY3Rpb24oZSl7IFwiICsgbG9naWMuaGFuZGxlcltoYW5kbGVyTmFtZV0gKyBcIiB9O1wiO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIG91dCArPSBcIlxcbl9lW1wiICsgKGRlcHRoIC0gMSkgKyBcIl0uYXBwZW5kQ2hpbGQoX2VbXCIgKyBkZXB0aCArIFwiXSk7XCI7XG4gICAgICAgICAgICAgICAgLy8gb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDxcIiArIGRvbW5vZGUudGFnTmFtZSArIGF0dHJTdHIgKyBcIj5gO1wiO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGNoaWxkIG9mIGRvbW5vZGUuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgICAgICBvdXQgKz0gdGhpcy5fcmVuZGVyKGNoaWxkLCBjdXJQYXRoLCBkZXB0aCArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vb3V0ICs9IFwiXFxuX19odG1sX18gKz0gYDwvXCIgKyBkb21ub2RlLnRhZ05hbWUgKyBcIj5gO1wiXG4gICAgICAgICAgICBvdXQgKz0gXCJcXG5cIiArIGxvZ2ljLmNsb3NlO1xuICAgICAgICB9IGVsc2UgaWYgKGRvbW5vZGUgaW5zdGFuY2VvZiBUZXh0KSB7XG4gICAgICAgICAgICBsZXQgY3VyUGF0aCA9IHBhdGggKyBcIiA+ICh0ZXh0KVwiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX19kZWJ1Z19wYXRoX18gPSAnXCIgKyB0aGlzLl9hZGRzbGFzaGVzKGN1clBhdGgpICsgXCInO1wiO1xuICAgICAgICAgICAgb3V0ICs9IFwiXFxuX2VbXCIgKyAoZGVwdGgtMSkgK1wiXS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShgXCIgKyBkb21ub2RlLnRleHRDb250ZW50ICsgXCJgKSk7XCI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dFxuICAgIH1cblxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZG9tbm9kZVxuICAgICAqIEByZXR1cm4ge0thc2ltaXJUZW1wbGF0ZX1cbiAgICAgKi9cbiAgICByZW5kZXIoZG9tbm9kZSkge1xuICAgICAgICBsZXQgb3V0ID0gXCJ2YXIgX19kZWJ1Z19wYXRoX18gPSAnKHJvb3QpJztcIjtcbiAgICAgICAgb3V0ICs9IFwiXFxudmFyIF9lID0gW2RvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXTtcIjtcblxuXG4gICAgICAgIGlmIChkb21ub2RlIGluc3RhbmNlb2YgSFRNTFRlbXBsYXRlRWxlbWVudCkge1xuXG4gICAgICAgICAgICBmb3IgKGxldCBjdXJDaGlsZCBvZiBkb21ub2RlLmNvbnRlbnQuY2hpbGROb2Rlcykge1xuICAgICAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoY3VyQ2hpbGQsICBcIihyb290KVwiLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCArPSB0aGlzLl9yZW5kZXIoZG9tbm9kZSwgIFwiKHJvb3QpXCIsIDEpO1xuICAgICAgICB9XG5cblxuICAgICAgICBsZXQgeG91dCA9IGBcbiAgICAgICAgICAgIGZuID0gZnVuY3Rpb24oc2NvcGUpe1xuICAgICAgICAgICAgICAgIGxldCBmbnMgPSBbXTtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAke291dH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93ICdFcnJvciBpbiAnICsgX19kZWJ1Z19wYXRoX18gKyAnOiAnICsgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9lWzBdO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgYDtcblxuICAgICAgICBjb25zb2xlLmxvZyh4b3V0KTtcbiAgICAgICAgbGV0IGZuIDtcbiAgICAgICAgZXZhbCh4b3V0KTtcbiAgICAgICAgcmV0dXJuIG5ldyBLYXNpbWlyVGVtcGxhdGUoZm4pO1xuICAgIH1cblxufVxuXG4iLCJjbGFzcyBLYXNpbWlyVGVtcGxhdGUge1xuXG4gICAgY29uc3RydWN0b3IodHBsRm4pIHtcbiAgICAgICAgdGhpcy5fdHBsRm4gPSB0cGxGbjtcbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtIVE1MRWxlbWVudH1cbiAgICAgICAgICogQHByaXZhdGVcbiAgICAgICAgICovXG4gICAgICAgIHRoaXMuX2JpbmQgPSBudWxsO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIGRvbVNlbGVjdG9yIHtzdHJpbmd8SFRNTEVsZW1lbnR9XG4gICAgICogQHJldHVybiBLYXNpbWlyVGVtcGxhdGVcbiAgICAgKi9cbiAgICByZW5kZXJJbihkb21TZWxlY3Rvcikge1xuICAgICAgICBsZXQgbm9kZSA9IG51bGw7XG4gICAgICAgIGlmICh0eXBlb2YgZG9tU2VsZWN0b3IgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIG5vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGRvbVNlbGVjdG9yKTtcbiAgICAgICAgICAgIGlmIChub2RlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHRocm93IFwiYmluZCgpOiBjYW4ndCBmaW5kIGVsZW1lbnQgJ1wiICsgZG9tU2VsZWN0b3IgKyBcIidcIjtcbiAgICAgICAgfSBlbHNlIGlmIChkb21TZWxlY3RvciBpbnN0YW5jZW9mIEhUTUxFbGVtZW50KSB7XG4gICAgICAgICAgICBub2RlID0gZG9tU2VsZWN0b3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBcImJpbmQoKTogcGFyYW1ldGVyMSBpcyBub3QgYSBIdG1sRWxlbWVudFwiO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2JpbmQgPSBub2RlO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIHJlbmRlcihzY29wZSkge1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLl90cGxGbihzY29wZSkpO1xuICAgICAgICB0aGlzLl9iaW5kLnJlcGxhY2VDaGlsZCh0aGlzLl90cGxGbihzY29wZSksIHRoaXMuX2JpbmQuZmlyc3RDaGlsZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHNjb3BlXG4gICAgICogQHJldHVybiB7S2FzaW1pclRlbXBsYXRlfVxuICAgICAqL1xuICAgIG9ic2VydmUoc2NvcGUpIHtcbiAgICAgICAgdGhpcy5yZW5kZXIoc2NvcGUpO1xuICAgICAgICB3aW5kb3cuc2V0SW50ZXJ2YWwoZSA9PiB7XG4gICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoc2NvcGUpICE9PSB0aGlzLl9vYnNlcnZlZExhc3RWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX29ic2VydmVkTGFzdFZhbHVlID0gSlNPTi5zdHJpbmdpZnkoc2NvcGUpO1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyKHNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG59XG5cbiIsIlxuXG5cbmNsYXNzIEttVHBsRWxlbSBleHRlbmRzIEhUTUxFbGVtZW50IHtcblxuICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuXG4gICAgICAgIHRoaXMuX2F0dHJzID0ge1xuICAgICAgICAgICAgYmluZDogbnVsbCxcbiAgICAgICAgICAgIG9ic2VydmU6IG51bGwsXG4gICAgICAgICAgICBzY29wZTogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLl9jb25maWcgPSB7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqXG4gICAgICAgICAqIEB0eXBlIHtLYXNpbWlyVGVtcGxhdGV9XG4gICAgICAgICAqL1xuICAgICAgICB0aGlzLnRwbCA9IG51bGw7XG4gICAgfVxuXG5cbiAgICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpIHsgcmV0dXJuIFtcImJpbmRcIiwgXCJvYnNlcnZlXCIsIFwic2NvcGVcIl07IH1cblxuICAgIGF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayhuYW1lLCBvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgICAgICAgdGhpcy5fYXR0cnNbbmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG5cbiAgICBjb25uZWN0ZWRDYWxsYmFjaygpIHtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJsb2FkXCIsIHdpbmRvd1tcImRhdGFcIl0pO1xuICAgICAgICAgICAgbGV0IHRlbXBsYXRlID0gdGhpcy5xdWVyeVNlbGVjdG9yKFwidGVtcGxhdGVcIik7XG4gICAgICAgICAgICBpZiAodGVtcGxhdGUgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiPGttLXRwbD4gaGFzIG5vIHRlbXBsYXRlIGNoaWxkLlwiLCB0aGlzKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBcIjxrbS10cGw+IHJlcXVpcmVzIDx0ZW1wbGF0ZT4gY2hpbGQuXCI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMudHBsID0ga2FzaW1pcl90cGwodGVtcGxhdGUpO1xuICAgICAgICAgICAgdGhpcy5yZW1vdmVDaGlsZCh0ZW1wbGF0ZSk7XG4gICAgICAgICAgICB0aGlzLnRwbC5yZW5kZXJJbih0aGlzKTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuX2F0dHJzLnNjb3BlICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBldmFsKFwic2NvcGUgPSBcIiArIHRoaXMuX2F0dHJzLnNjb3BlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5iaW5kICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50cGwuYmluZChldmFsKHRoaXMuX2F0dHJzLmJpbmQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9hdHRycy5vYnNlcnZlKSB7XG4gICAgICAgICAgICAgICAgbGV0IG9ic2VydmVkID0gZXZhbCh0aGlzLl9hdHRycy5vYnNlcnZlKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhvYnNlcnZlZCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYnNlcnZlZCAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJvYnNlcnZlZCB2YXJpYWJsZSAnXCIgKyB0aGlzLl9hdHRycy5vYnNlcnZlICsgXCInIGlzIHR5cGVvZiBcIiArICh0eXBlb2Ygb2JzZXJ2ZWQpICsgXCIgYnV0IG9iamVjdCByZXF1aXJlZFwiO1xuICAgICAgICAgICAgICAgIHRoaXMudHBsLm9ic2VydmUob2JzZXJ2ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUgKyBcIiBpbiBlbGVtZW50IFwiLCB0aGlzKTtcbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIGRpc2Nvbm5lY3RDYWxsYmFjaygpIHtcblxuICAgIH1cblxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoXCJrbS10cGxcIiwgS21UcGxFbGVtKTtcblxuIl19
