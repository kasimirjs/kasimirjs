


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