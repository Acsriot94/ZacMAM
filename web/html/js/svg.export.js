// svg.export.js 0.1.1 - Copyright (c) 2014 Wout Fierens - Licensed under the MIT license
;(function () {
    function e(e, t, n) {
        if (t) {
            var r = "", s = t === true ? "  " : t || "";
            for (i = n - 1; i >= 0; i--) r += s;
            e = r + e + "\n"
        }
        return e
    }

    SVG.extend(SVG.Element, {
        exportSvg: function (t, n) {
            var r, i, s, o, u, a, f = this.node.nodeName, l = "";
            t = t || {};
            if (t.exclude == null || !t.exclude.call(this)) {
                t = t || {};
                n = n || 0;
                if (this instanceof SVG.Doc) {
                    l += e('<?xml version="1.0" encoding="UTF-8"?>', t.whitespace, n);
                    s = this.attr("width");
                    o = this.attr("height");
                    if (t.width) this.attr("width", t.width);
                    if (t.height) this.attr("height", t.height)
                }
                l += e("<" + f + this.attrToString() + ">", t.whitespace, n);
                if (this instanceof SVG.Doc) {
                    this.attr({width: s, height: o});
                    l += e("<desc>Created with svg.js [http://svgjs.com]</desc>", t.whitespace, n + 1);
                    l += this.defs().exportSvg(t, n + 1)
                }
                if (this instanceof SVG.Parent) {
                    for (r = 0, i = this.children().length; r < i; r++) {
                        if (SVG.Absorbee && this.children()[r] instanceof SVG.Absorbee) {
                            a = this.children()[r].node.cloneNode(true);
                            u = document.createElement("div");
                            u.appendChild(a);
                            l += u.innerHTML
                        } else {
                            l += this.children()[r].exportSvg(t, n + 1)
                        }
                    }
                } else if (this instanceof SVG.Text || this instanceof SVG.TSpan) {
                    for (r = 0, i = this.node.childNodes.length; r < i; r++) if (this.node.childNodes[r].instance instanceof SVG.TSpan) l += this.node.childNodes[r].instance.exportSvg(t, n + 1); else l += this.node.childNodes[r].nodeValue.replace(/&/g, "&")
                } else if (SVG.ComponentTransferEffect && this instanceof SVG.ComponentTransferEffect) {
                    this.rgb.each(function () {
                        l += this.exportSvg(t, n + 1)
                    })
                }
                l += e("</" + f + ">", t.whitespace, n)
            }
            return l
        }, exportAttr: function (e) {
            if (arguments.length == 0) return this.data("svg-export-attr");
            return this.data("svg-export-attr", e)
        }, attrToString: function () {
            var e, t, n, r = [], i = this.exportAttr(), s = this.attr();
            if (typeof i == "object") for (t in i) if (t != "data-svg-export-attr") s[t] = i[t];
            for (t in s) {
                n = s[t];
                if (t == "xlink") {
                    t = "xmlns:xlink"
                } else if (t == "href") {
                    if (!s["xlink:href"]) t = "xlink:href"
                }
                if (typeof n === "string") n = n.replace(/"/g, "'");
                if (t != "data-svg-export-attr" && t != "href") {
                    if (t != "stroke" || parseFloat(s["stroke-width"]) > 0) r.push(t + '="' + n + '"')
                }
            }
            return r.length ? " " + r.join(" ") : ""
        }
    })
}).call(this);