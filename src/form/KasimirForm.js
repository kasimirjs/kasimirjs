

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