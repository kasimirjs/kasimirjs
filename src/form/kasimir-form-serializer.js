
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