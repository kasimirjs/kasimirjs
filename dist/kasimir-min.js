/**
 * Infracamp's KasimirJS
 *
 * A no-dependency render on request
 *
 * @author Matthias Leuffen <m@tth.es>
 */
function kasimir_http(e,t={}){return new KasimirHttpRequest(e,t)}class KasimirHttpRequest{constructor(e,t={}){e=e.replace(/(\{|\:)([a-zA-Z0-9_\-]+)/,(r,s,n)=>{if(!t.hasOwnProperty(n))throw"parameter '"+n+"' missing in url '"+e+"'";return encodeURI(t[n])}),this.request={url:e,method:"GET",body:null,headers:{},dataType:"text",onError:null,data:null}}withParams(e){-1===this.request.url.indexOf("?")?this.request.url+="?":this.request.url+="&";let t=[];for(let r in e)e.hasOwnProperty(r)&&t.push(encodeURIComponent(r)+"="+encodeURIComponent(e[r]));return this.request.url+=t.join("&"),this}withMethod(e){return this.request.method=e,this}withBearerToken(e){return this.withHeaders({authorization:"baerer "+e}),this}withHeaders(e){return Object.assign(this.request.headers,e),this}withBody(e){return"GET"===this.request.method&&(this.request.method="POST"),(Array.isArray(e)||"object"==typeof e)&&(e=JSON.stringify(e),this.withHeaders({"content-type":"application/json"})),this.request.body=e,this}withOnError(e){return this.request.onError=e,this}set json(e){this.send(t=>{e(t.getBodyJson())})}set plain(e){this.send(t=>{e(t.getBody())})}send(e){let t=new XMLHttpRequest;t.open(this.request.method,this.request.url);for(let e in this.request.headers)t.setRequestHeader(e,this.request.headers[e]);t.onreadystatechange=(()=>{if(4===t.readyState)return console.log("ok",t),null!==this.request.onError&&t.status>=400?void this.request.onError(new KasimirHttpResponse(t.response,t.status,this)):void e(new KasimirHttpResponse(t.response,t.status,this))}),t.send(this.request.body)}}class KasimirHttpResponse{constructor(e,t,r){this.body=e,this.status=t,this.request=r}getBodyJson(){return JSON.parse(this.body)}getBody(){return this.body}isOk(){return 200===this.status}}class KmInputElem extends HTMLInputElement{constructor(){super(),this._attrs={bind:null,observe:null,scope:null},this._config={}}static get observedAttributes(){return["bind"]}attributeChangedCallback(e,t,r){this._attrs[e]=r}connectedCallback(){console.log("connected!!!",this),console.log(window.status);try{this.value=eval(this._attrs.bind),this.onchange=(()=>{console.log("change",this.value),eval(this._attrs.bind+" = this.value")})}catch(e){throw console.error(e+" in element ",this),e}}}function kasimir_tpl(e){let t=null;if("string"==typeof e){if(null===(t=document.querySelector(e)))throw"kasimir_tpl(): can't find element '"+e+"'"}else{if(!(e instanceof HTMLElement))throw"kasimir_tpl(): parameter1 is not a HtmlElement";t=e}return(new KasimirRenderer).render(t)}customElements.define("km-input",KmInputElem,{extends:"input"});class KasimirRenderer{constructor(e="*"){this._attrPrefix=e}_getAttributeStr(e){let t="";for(let r of e.attributes)t+=" "+r.name+'="'+r.value+'"';return t}_addslashes(e){return e.replace(/\\/g,"\\\\").replace(/\u0008/g,"\\b").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\f/g,"\\f").replace(/\r/g,"\\r").replace(/'/g,"\\'").replace(/"/g,'\\"')}_getLogic(e){let t={open:"",close:"",handler:{}};e.hasAttribute(this._attrPrefix+"if")&&(t.open+="if("+e.getAttribute(this._attrPrefix+"if")+"){",t.close+="}"),e.hasAttribute(this._attrPrefix+"for")&&(t.open+="for("+e.getAttribute(this._attrPrefix+"for")+"){",t.close+="}");for(let r of e.attributes){null!==r.name.match(/^on(.+)/)&&(t.handler[r.name]=r.value)}return t}_render(e,t,r){let s="";if(e instanceof HTMLElement){let n=this._getLogic(e),i=this._getAttributeStr(e),o=t+" > "+e.tagName+i;if(s+="\n"+n.open,s+="\n__debug_path__ = '"+this._addslashes(o)+"';","SCRIPT"===e.tagName)s+="\neval(`"+e.textContent+"`);";else{e.hasAttribute("is")?s+="\n_e["+r+"] = document.createElement('"+e.tagName+"', {is: '"+e.getAttribute("is")+"'});":s+="\n_e["+r+"] = document.createElement('"+e.tagName+"');";for(let t of e.attributes)t.name.startsWith(this._attrPrefix)||(s+="\n_e["+r+"].setAttribute('"+t.name+"', `"+t.value+"`);");for(let e in n.handler)s+="\n_e["+r+"]."+e+" = function(e){ "+n.handler[e]+" };";s+="\n_e["+(r-1)+"].appendChild(_e["+r+"]);";for(let t of e.childNodes)s+=this._render(t,o,r+1)}s+="\n"+n.close}else if(e instanceof Text){let n=t+" > (text)";s+="\n__debug_path__ = '"+this._addslashes(n)+"';",s+="\n_e["+(r-1)+"].appendChild(document.createTextNode(`"+e.textContent+"`));"}return s}render(domnode){let out="var __debug_path__ = '(root)';";if(out+="\nvar _e = [document.createElement('div')];",domnode instanceof HTMLTemplateElement)for(let e of domnode.content.childNodes)out+=this._render(e,"(root)",1);else out+=this._render(domnode,"(root)",1);let xout=`\n            fn = function(scope){\n                let fns = [];\n                try {\n                    ${out}\n                } catch (e) {\n                    throw 'Error in ' + __debug_path__ + ': ' + e;\n                }\n                return _e[0];\n            };\n        `,fn;return console.log(xout),eval(xout),new KasimirTemplate(fn)}}class KasimirTemplate{constructor(e){this._tplFn=e,this._bind=null}renderIn(e){let t=null;if("string"==typeof e){if(null===(t=document.querySelector(e)))throw"bind(): can't find element '"+e+"'"}else{if(!(e instanceof HTMLElement))throw"bind(): parameter1 is not a HtmlElement";t=e}return this._bind=t,this}render(e){return console.log(this._tplFn(e)),this._bind.replaceChild(this._tplFn(e),this._bind.firstChild),this}observe(e){return this.render(e),window.setInterval(t=>{JSON.stringify(e)!==this._observedLastValue&&(this._observedLastValue=JSON.stringify(e),this.render(e))},200),this}}class KmTplElem extends HTMLElement{constructor(){super(),this._attrs={bind:null,observe:null,scope:null},this._config={},this.tpl=null}static get observedAttributes(){return["bind","observe","scope"]}attributeChangedCallback(e,t,r){this._attrs[e]=r}connectedCallback(){try{console.log("load",window.data);let template=this.querySelector("template");if(null===template)throw console.error("<km-tpl> has no template child.",this),"<km-tpl> requires <template> child.";if(this.tpl=kasimir_tpl(template),this.removeChild(template),this.tpl.renderIn(this),null!==this._attrs.scope){var scope=null;eval("scope = "+this._attrs.scope)}if(null!==this._attrs.bind&&this.tpl.bind(eval(this._attrs.bind)),this._attrs.observe){let observed=eval(this._attrs.observe);if(console.log(observed),"object"!=typeof observed)throw"observed variable '"+this._attrs.observe+"' is typeof "+typeof observed+" but object required";this.tpl.observe(observed)}}catch(e){throw console.error(e+" in element ",this),e}}disconnectCallback(){}}customElements.define("km-tpl",KmTplElem);