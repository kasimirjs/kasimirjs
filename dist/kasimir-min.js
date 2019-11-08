/**
 * Infracamp's KasimirJS
 *
 * A no-dependency render on request
 *
 * @author Matthias Leuffen <m@tth.es>
 */
function kasimir_elem(e,t){if(void 0===t&&(t=document),void 0===e)throw"kasimir_elem(undefined): undefined value in parameter 1";let r=null;if("string"==typeof e){if(null===(r=t.querySelector(e)))throw"kasimir_elem('"+e+"'): can't find element.";return r}if(!e instanceof HTMLElement)throw"kasimir_elem('"+typeof e+"' is no valid HTMLElement";return e}function kasimir_elem_all(e,t){if(void 0===t&&(t=document),void 0===e)throw"kasimir_elem(undefined): undefined value in parameter 1";let r=null;if("string"==typeof e){if(null===(r=t.querySelectorAll(e)))throw"kasimir_elem('"+e+"'): can't find element.";return r}if(!Array.isArray(e))throw"kasimir_elem('"+typeof e+"' is no valid HTMLElement[]";return e}function kasimir(e){window.addEventListener("load",e)}class KasimirBinder{constructor(){this._interval=null,this._observedLastValue=null,this._onchange=null,this._observedObj=null}bind(e){if("object"!=typeof e)throw new Error("bind("+typeof e+"): parameter must be object.");return null!==this._interval&&window.clearInterval(this._interval),this._observedObj=e,console.log("set"),this._interval=window.setInterval(t=>{JSON.stringify(e)!==this._observedLastValue&&(this._observedLastValue=JSON.stringify(e),null!==this._onchange&&this._onchange(e))},200),this}setDataWithoutTrigger(e){if(null===this._observedObj)throw"no object is bind(). call bind() before setDataWithoutTrigger()";return Object.assign(this._observedObj,e),this._observedLastValue=JSON.stringify(this._observedObj),this}setOnChange(e){return this._onchange=e,this}}class KasimirDebouncer{constructor(e,t=300){this.callback=e,this.timeout=t,this._timeout=null}debounce(){null!==this._timeout&&window.clearTimeout(this._timeout),this._timeout=window.setTimeout(this.callback,this.timeout)}trigger(){null!==this._timeout&&window.clearTimeout(this._timeout),this.callback()}}function kasimir_form(e){return new KasimirForm(e)}class KasimirFormSerializer{static ElemGetValue(e,t){let r=kasimir_elem(e,t);switch(r.tagName){case"INPUT":switch(r.type){case"checkbox":case"radio":return 1==r.checked?r.value:null}case"SELECT":case"TEXTAREA":return r.value}}static ElemSetValue(e,t,r){let i=kasimir_elem(e,r);switch(i.tagName){case"INPUT":switch(i.type){case"checkbox":case"radio":return void(t==i.value?i.checked=!0:i.checked=!1)}i.value=t;break;case"SELECT":case"TEXTAREA":i.value=t}}static GetData(e){let t=kasimir_elem(e),r={};for(let e of kasimir_elem_all("input, select, textarea",t)){let t=this.ElemGetValue(e);if(null===t)continue;let i=e.name;""==i&&(i=e.id),r[i]=t}return r}static SetData(e,t){let r=kasimir_elem(e);for(let e of kasimir_elem_all("input, select, textarea",r)){let r=e.name;""==r&&(r=e.id);let i=t[r];this.ElemSetValue(e,i)}}}class KasimirForm{constructor(e){this.form=kasimir_elem(e),this._debouncer=null,this._binder=new KasimirBinder}get data(){return KasimirFormSerializer.GetData(this.form)}set data(e){KasimirFormSerializer.SetData(this.form,e),this._binder.setDataWithoutTrigger(e)}bind(e){this._binder.bind(e).setDataWithoutTrigger(e).setOnChange(e=>{this.data=e});let t=this._debouncer=new KasimirDebouncer(()=>{this._binder.setDataWithoutTrigger(this.data)});return this.form.addEventListener("change",e=>t.trigger()),this.form.addEventListener("keyup",e=>t.debounce()),this.data=this.data,this}onsubmit(e){return this.form.addEventListener("submit",t=>{t.preventDefault(),t.stopPropagation(),e(t)}),this}}function kasimir_http(e,t={}){return new KasimirHttpRequest(e,t)}var KASIMIR_HTTP_BLOCK_LIST={};class KasimirHttpRequest{constructor(e,t={}){e=e.replace(/(\{|\:)([a-zA-Z0-9_\-]+)(\}|)/,(r,i,s)=>{if(!t.hasOwnProperty(s))throw"parameter '"+s+"' missing in url '"+e+"'";return encodeURIComponent(t[s])}),this.request={url:e,method:"GET",body:null,headers:{},dataType:"text",onError:null,data:null,blockerName:null}}withParams(e){-1===this.request.url.indexOf("?")?this.request.url+="?":this.request.url+="&";let t=[];for(let r in e)e.hasOwnProperty(r)&&t.push(encodeURIComponent(r)+"="+encodeURIComponent(e[r]));return this.request.url+=t.join("&"),this}withMethod(e){return this.request.method=e,this}withBearerToken(e){return this.withHeaders({authorization:"bearer "+e}),this}withHeaders(e){return Object.assign(this.request.headers,e),this}withBlocker(e){return this.request.blockerName=e,this}withBody(e){return"GET"===this.request.method&&(this.request.method="POST"),(Array.isArray(e)||"object"==typeof e)&&(e=JSON.stringify(e),this.withHeaders({"content-type":"application/json"})),this.request.body=e,this}withOnError(e){return this.request.onError=e,this}set json(e){this.send(t=>{e(t.getBodyJson())})}set plain(e){this.send(t=>{e(t.getBody())})}send(e){let t=new XMLHttpRequest;if(null!==this.request.blockerName){if(!0===KASIMIR_HTTP_BLOCK_LIST[this.request.blockerName])return console.warn("Blocking request "+this.request.blockerName+" / blocking request still in process"),!1;KASIMIR_HTTP_BLOCK_LIST[this.request.blockerName]=!0}t.open(this.request.method,this.request.url);for(let e in this.request.headers)t.setRequestHeader(e,this.request.headers[e]);t.onreadystatechange=(()=>{if(4===t.readyState)return null!==this.request.blockerName&&(KASIMIR_HTTP_BLOCK_LIST[this.request.blockerName]=!1),null!==this.request.onError&&t.status>=400?void this.request.onError(new KasimirHttpResponse(t.response,t.status,this)):void e(new KasimirHttpResponse(t.response,t.status,this))}),t.send(this.request.body)}}class KasimirHttpResponse{constructor(e,t,r){this.body=e,this.status=t,this.request=r}getBodyJson(){return JSON.parse(this.body)}getBody(){return this.body}isOk(){return 200===this.status}}class KmInputElem extends HTMLInputElement{constructor(){super(),this._attrs={bind:null,observe:null,scope:null},this._config={}}static get observedAttributes(){return["bind"]}attributeChangedCallback(e,t,r){this._attrs[e]=r}connectedCallback(){console.log("connected!!!",this),console.log(window.status);try{this.value=eval(this._attrs.bind),this.onchange=(()=>{console.log("change",this.value),eval(this._attrs.bind+" = this.value")})}catch(e){throw console.error(e+" in element ",this),e}}}function kasimir_tpl(e){let t=kasimir_elem(e);return(new KasimirRenderer).render(t)}customElements.define("km-input",KmInputElem,{extends:"input"});class KasimirRenderer{constructor(e="*"){this._attrPrefix=e}_getAttributeStr(e){let t="";for(let r of e.attributes)t+=" "+r.name+'="'+r.value+'"';return t}_addslashes(e){return e.replace(/\\/g,"\\\\").replace(/\u0008/g,"\\b").replace(/\t/g,"\\t").replace(/\n/g,"\\n").replace(/\f/g,"\\f").replace(/\r/g,"\\r").replace(/'/g,"\\'").replace(/"/g,'\\"')}_getLogic(e){let t={open:"",close:"",handler:{}};e.hasAttribute(this._attrPrefix+"if")&&(t.open+="if("+e.getAttribute(this._attrPrefix+"if")+"){",t.close+="}"),e.hasAttribute(this._attrPrefix+"for")&&(t.open+="for("+e.getAttribute(this._attrPrefix+"for")+"){",t.close+="}");for(let r of e.attributes){null!==r.name.match(/^on(.+)/)&&(t.handler[r.name]=r.value)}return t}_render(e,t,r){let i="";if(e instanceof HTMLElement){let s=this._getLogic(e),n=this._getAttributeStr(e),a=t+" > "+e.tagName+n;if(i+="\n"+s.open,i+="\n__debug_path__ = '"+this._addslashes(a)+"';","SCRIPT"===e.tagName)i+="\neval(`"+e.textContent+"`);";else{e.hasAttribute("is")?i+="\n_e["+r+"] = document.createElement('"+e.tagName+"', {is: '"+e.getAttribute("is")+"'});":i+="\n_e["+r+"] = document.createElement('"+e.tagName+"');";for(let t of e.attributes)t.name.startsWith(this._attrPrefix)||(i+="\n_e["+r+"].setAttribute('"+t.name+"', `"+t.value+"`);");for(let e in s.handler)i+="\n_e["+r+"]."+e+" = function(e){ "+s.handler[e]+" };";i+="\n_e["+(r-1)+"].appendChild(_e["+r+"]);";for(let t of e.childNodes)i+=this._render(t,a,r+1)}i+="\n"+s.close}else if(e instanceof Text){let s=t+" > (text)";i+="\n__debug_path__ = '"+this._addslashes(s)+"';",i+="\n_e["+(r-1)+"].appendChild(document.createTextNode(`"+e.textContent+"`));"}return i}render(domnode){let out="var __debug_path__ = '(root)';";if(out+="\nvar _e = [document.createElement('div')];",domnode instanceof HTMLTemplateElement)for(let e of domnode.content.childNodes)out+=this._render(e,"(root)",1);else out+=this._render(domnode,"(root)",1);let xout=`\n            fn = function(scope){\n                let fns = [];\n                try {\n                    ${out}\n                } catch (e) {\n                    throw 'Error in ' + __debug_path__ + ': ' + e;\n                }\n                return _e[0];\n            };\n        `,fn;return eval(xout),new KasimirTemplate(fn)}}class KasimirTemplate{constructor(e){this._tplFn=e,this._renderInElement=null,this._binder=new KasimirBinder}renderIn(e){let t=null;if("string"==typeof e){if(null===(t=document.querySelector(e)))throw"bind(): can't find element '"+e+"'"}else{if(!(e instanceof HTMLElement))throw"bind(): parameter1 is not a HtmlElement";t=e}return this._renderInElement=t,this}render(e){return this._renderInElement.replaceChild(this._tplFn(e),this._renderInElement.firstChild),this}observe(e){return this.render(e),this._binder.bind(e).setOnChange(()=>this.render(e)),this}}class KmTplElem extends HTMLElement{constructor(){super(),this._attrs={bind:null,observe:null,scope:null},this._config={},this.tpl=null}static get observedAttributes(){return["bind","observe","scope"]}attributeChangedCallback(e,t,r){this._attrs[e]=r}connectedCallback(){window.setTimeout(()=>{try{let template=this.querySelector("template");if(null===template)throw console.error("<km-tpl> has no template child.",this),"<km-tpl> requires <template> child.";if(this.tpl=kasimir_tpl(template),this.removeChild(template),this.tpl.renderIn(this),null!==this._attrs.scope){var scope=null;eval("scope = "+this._attrs.scope)}if(null!==this._attrs.bind&&this.tpl.bind(eval(this._attrs.bind)),this._attrs.observe){let observed=eval(this._attrs.observe);if(console.log(observed),"object"!=typeof observed)throw"observed variable '"+this._attrs.observe+"' is typeof "+typeof observed+" but object required";this.tpl.observe(observed)}}catch(e){throw console.error(e+" in element ",this),e}},1)}disconnectCallback(){}}customElements.define("km-tpl",KmTplElem);