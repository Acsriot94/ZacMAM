"use strict";

class TwigParser {
    constructor() {
        this.elements = [];
        this.template_string = null;
        this.debug = false;

        this.parse = function (template_string) {
            this.elements = [];

            const components = [
                {start: "{{ ", end: " }}", "type": "variable"},
                {start: "{% ", end: " %}", "type": "logic"}
            ];

            const template_length = template_string.length;

            for (let i = 0; i < template_length; i++) {
                let component_found = false;
                const cur_char = template_string.substr(i, 1);

                for (let c = 0; c < components.length; c++) {
                    const component = components[c];
                    const start_length = component.start.length;

                    if (i <= template_length - start_length - 1) {
                        // Check if substring matches
                        const substring = template_string.substr(i, start_length);

                        if (substring === component.start) {
                            this.elements.push({start: i + start_length, type: component.type})
                            i += start_length;
                            component_found = true;
                            break;
                        }
                    }

                    const end_length = component.end.length;

                    if (i <= template_length - end_length) {
                        // Check if substring matches
                        const substring = template_string.substr(i, end_length);

                        if (substring === component.end) {
                            // Get last component
                            if (this.elements.length > 0 && this.elements[this.elements.length - 1].type === component.type) {
                                const lastObj = this.elements[this.elements.length - 1];
                                lastObj.end = i;
                                lastObj.content = template_string.substr(lastObj.start, i - lastObj.start + 1).trim();
                                i += end_length - 1;
                                component_found = true;
                                break;
                            } else {
                                console.log("Found the wrong ending " + this.elements[this.elements.length - 1].type + " for component " + component.type + " at position " + i);
                            }
                        }
                    }
                }

                // Check if it's just text
                if (!component_found) {
                    if (this.elements.length === 0) {
                        this.elements.push({start: i, end: i, type: "text", content: cur_char});
                    } else {
                        const lastObj = this.elements[this.elements.length - 1];

                        if (lastObj.type === "text") {
                            lastObj.end = i;
                            lastObj.content += cur_char;
                        } else if ("undefined" !== typeof lastObj.end) {
                            this.elements.push({start: i, end: i, type: "text", content: cur_char});
                        }
                    }
                }
            }

            // Check last component is terminated correctly
            if (this.elements.length > 0) {
                const lastObj = this.elements[this.elements.length - 1];

                if ("undefined" === typeof lastObj.end) {
                    lastObj.end = template_length - 1;
                    lastObj.content = template_string.substr(lastObj.start, template_length - lastObj.start).trim();
                }
            }

            // Parse logic
            if (this.debug) console.log(JSON.stringify(this.elements));

            this.elements = this.processLogic(this.elements);

            if (this.debug) console.log(JSON.stringify(this.elements));
        };

        this.processLogic = function (items) {
            const out_array = [];
            let open_logic_obj = null;
            let open_alt_obj = null;

            for (let i = 0; i < items.length; i++) {
                const element = items[i];

                if (element.type === "logic") {
                    element.logic_tests = [];

                    // Split spaces
                    let words = element.content.split(" ");

                    if (words.length > 0) {
                        if (words[0] === "if" || words[0] === "for") {
                            let test = this.parseLogicPhrase(words);

                            // If we don't know which element this corresponds to,
                            // find the latest unclosed logic item
                            if (open_logic_obj === null) {
                                open_logic_obj = this.latestUnclosedLogicElement(out_array, words[0]);
                            }

                            if (open_logic_obj === null) {
                                element.logic_tests.push(test);

                                element.logic_components = [];
                                element.alts = [];
                                open_logic_obj = element;
                                open_alt_obj = null;
                                out_array.push(element);
                            } else {
                                let sub_element = [];
                                sub_element.type = "logic";
                                sub_element.logic_tests = [test];
                                sub_element.logic_components = [];
                                sub_element.alts = [];
                                open_logic_obj.logic_components.push(sub_element);
                                open_logic_obj = sub_element;
                            }
                        } else if (words[0] === "else") {
                            // If we don't know which element this corresponds to,
                            // find the latest unclosed logic item
                            if (open_logic_obj === null) {
                                open_logic_obj = this.latestUnclosedLogicElement(out_array, "if");
                            }

                            if (open_logic_obj === null) {
                                console.log("Unknown logic parent for \"else\" statement");
                                continue;
                            }

                            // Ignore else when parsing string
                            let test = {};
                            if (words.length > 1) {
                                test = this.parseLogicPhrase(words.subarray(1));
                            }

                            let sub_element = [];
                            sub_element.type = "logic";
                            sub_element.logic_tests = [test];
                            sub_element.logic_components = [];
                            sub_element.alts = [];
                            open_logic_obj.alts.push(sub_element);
                            open_alt_obj = sub_element;

                        } else if (words[0] === "endif" || words[0] === "endfor") {
                            // If we don't know which element this corresponds to,
                            // find the latest unclosed logic item
                            if (open_logic_obj === null) {
                                let obj_type = "if";
                                if (words[0] === "endfor") obj_type = "for";

                                open_logic_obj = this.latestUnclosedLogicElement(out_array, obj_type);
                            }

                            if (open_logic_obj === null) {
                                console.log("Unknown logic parent for \"endif\" statement");
                                continue;
                            }

                            if (open_alt_obj !== null) {
                                open_alt_obj.closed = true;
                            }

                            if (this.debug) console.log("open logic obj: " + JSON.stringify(open_logic_obj));

                            open_logic_obj.closed = true;

                            open_logic_obj = null;
                            open_alt_obj = null;
                        }
                    }
                } else {
                    if (open_alt_obj !== null) {
                        open_alt_obj.logic_components.push(element);
                    } else if (open_logic_obj !== null) {
                        open_logic_obj.logic_components.push(element);
                    } else {
                        // Check for unclosed logic objects
                        const unclosed = this.latestUnclosedLogicElement(out_array, null);

                        if (unclosed !== null) {
                            unclosed.logic_components.push(element);
                        } else {
                            out_array.push(element);
                        }
                    }
                }
            }

            return out_array;
        };

        this.latestUnclosedLogicElement = function(items, logic_type)
        {
            for (let i = items.length - 1; i >= 0; i--) {
                const element = items[i];
                if (element.type !== "logic") continue;

                const components = element.logic_components;
                const item = this.latestUnclosedLogicElement(components, logic_type);

                if (item !== null) return item;

                if ("undefined" === typeof element.closed || element.closed !== true) {
                    if (logic_type !== null) {
                        for (let j = 0; j < element.logic_tests.length; j++) {
                            const test = element.logic_tests[j];
                            if (test.type === logic_type) return element;
                        }
                    } else {
                        return element;
                    }
                }
            }

            return null;
        };

        this.parseLogicPhrase = function(words)
        {
            let test = {};
            if (words[0] === "if") {
                if (words.length > 1 && words[1] === "not") {
                    test.type = "if not";
                    // Delete the "not" so that both are the same length
                    words.splice(1, 1);
                } else {
                    test.type = "if";
                }

                test.var_name = words[1];
                test.comparison = words[2];
                test.value = words[3];

            } else if (words.length === 4 && words[0] === "for" && words[2] === "in") {
                test.type = "for";
                test.var_source = words[3];
                test.temp_var_name = words[1];
            }

            return test;
        };

        this.render = function (template_string, vars) {
            if (this.template_string !== template_string) {
                this.elements = [];
                this.template_string = template_string;
            }

            if (this.elements.length === 0) this.parse(template_string);

            let outHTML = "";

            for (let i = 0; i < this.elements.length; i++) {
                const element = this.elements[i];
                outHTML += this.renderElement(element, vars);
            }

            return outHTML;
        };

        this.renderElement = function (element, vars) {
            let outHTML = "";

            if (element.type === "text") {
                outHTML += element.content;
            } else if (element.type === "variable") {
                let var_name = element.content.trim();

                // Check for transformers
                const transformers = var_name.split('|');

                var_name = transformers[0].trim();

                if ("undefined" !== typeof vars[var_name]) {
                    let var_val = vars[var_name];

                    for (let i = 1; i < transformers.length; i++) {
                        let transformer = transformers[i].trim();

                        // Check if there's a value
                        const transformer_vals = transformer.split(/[()]/);
                        let transformer_val = null;

                        if (transformer_vals.length >= 2) {
                            transformer = transformer_vals[0];
                            transformer_val = parseInt(transformer_vals[1]);
                        }

                        switch (transformer) {
                            case 'lower':
                                var_val = var_val.toLowerCase();
                                break;
                            case 'upper':
                                var_val = var_val.toUpperCase();
                                break;
                            case 'url_encode':
                                var_val = encodeURIComponent(var_val);
                                break;
                            case 'u.truncate':
                                if (var_val.length > transformer_val) {
                                    var_val = var_val.substr(0, transformer_val);
                                }
                                break;
                            case 'raw':
                                // Do nothing
                                break;
                            default:
                                console.log("Unknown transformer " + transformer);
                        }
                    }

                    outHTML += var_val;
                }

            } else if (element.type === "logic") {
                if (this.testLogic(element, vars)) {
                    if (element.logic_tests.length > 0 && element.logic_tests[0].type === "for") {
                        const loop_obj = element.logic_tests[0];
                        const var_source = vars[loop_obj.var_source];

                        for (let j = 0; j < var_source.length; j++) {
                            let temp_vars = vars;
                            temp_vars[loop_obj.temp_var_name] = var_source[j];

                            for (let i = 0; i < element.logic_components.length; i++) {
                                outHTML += this.renderElement(element.logic_components[i], temp_vars);
                            }
                        }
                    } else {
                        for (let i = 0; i < element.logic_components.length; i++) {
                            outHTML += this.renderElement(element.logic_components[i], vars);
                        }
                    }
                } else {
                    if (this.debug) console.log("logic is false");
                    for (let i = 0; i < element.alts.length; i++) {
                        if (this.debug) console.log("alt");
                        let output = this.renderElement(element.alts[i], vars);
                        if (output !== "") {
                            outHTML += output;
                            break;
                        }
                    }
                }
            }

            return outHTML;
        };

        this.testLogic = function (element, vars) {
            for (let i = 0; i < element.logic_tests.length; i++) {
                const test = element.logic_tests[i];

                if (test.type === "if") {
                    // Return on a false value
                    if (!this.testComparison(vars, test.var_name, test.comparison, test.value)) {
                        return false;
                    }
                } else if (test.type === "if not") {
                    // Return on a true value
                    if (this.testComparison(vars, test.var_name, test.comparison, test.value)) {
                        return false;
                    }
                } else if (test.type === "for") {
                    if (!(test.var_source in vars) || vars[test.var_source].length === 0) {
                        return false;
                    }
                }
            }

            return true;
        };

        this.testComparison = function (vars, var_name, comparison, value) {
            const var_val = ("undefined" !== typeof vars[var_name] ? vars[var_name] : null);

            if (value === 'false') value = false;
            if (value === 'true') value = true;

            // Trim quotes
            if (typeof value === 'string') {
                value = value.replace(/^("|')+|("|')+$/g, '');
            }

            if (this.debug) console.log("var name: " + var_name);
            if (this.debug) console.log("comparison: " + comparison);
            if (this.debug) console.log("value: " + value);

            // Empty strings
            if (value == "\"\"" || value == "''") {
                value = "";
            }

            switch (comparison) {
                case "==":
                    return var_val == value;

                case "<":
                    return var_val < value;

                case ">":
                    return var_val > value;

                case "<=":
                    return var_val <= value;

                case ">=":
                    return var_val >= value;

                case "!=":
                    return var_val != value;

                default:
                    console.log("Error: unknown comparison type " + comparison);
            }

            return false;
        };
    }
}

if ('object' === typeof exports) {
    module.exports = TwigParser;
}