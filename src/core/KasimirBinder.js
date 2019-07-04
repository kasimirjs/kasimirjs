
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