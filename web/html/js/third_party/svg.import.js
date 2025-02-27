// svg.import.js 1.0.1 - Copyright (c) 2014 Wout Fierens - Licensed under the MIT license
;(function () {
    function e(t, n, r, i, s) {
        var o, u, a, f, l, c, h, p, d, v;
        for (o = 0, u = t.length; o < u; o++) {
            h = t[o];
            p = {};
            v = [];
            c = h.nodeName.toLowerCase();
            p = SVG.parse.attr(h);
            switch (c) {
                case"rect":
                case"circle":
                case"ellipse":
                    l = n[c](0, 0);
                    break;
                case"line":
                    l = n.line(0, 0, 0, 0);
                    break;
                case"text":
                    if (h.childNodes.length < 2) {
                        l = n[c](h.textContent)
                    } else {
                        var m;
                        l = null;
                        for (a = 0; a < h.childNodes.length; a++) {
                            m = h.childNodes[a];
                            if (m.nodeName.toLowerCase() == "tspan") {
                                if (l === null) l = n[c](m.textContent); else l.tspan(m.textContent).attr(SVG.parse.attr(m))
                            }
                        }
                    }
                    break;
                case"path":
                    l = n.path(p["d"]);
                    break;
                case"polygon":
                case"polyline":
                    l = n[c](p["points"]);
                    break;
                case"image":
                    l = n.image(p["xlink:href"]);
                    break;
                case"g":
                case"svg":
                    l = n[c == "g" ? "group" : "nested"]();
                    e(h.childNodes, l, r + 1, i, s);
                    break;
                case"defs":
                    e(h.childNodes, n.defs(), r + 1, i, s);
                    break;
                case"use":
                    l = n.use();
                    break;
                case"clippath":
                case"mask":
                    l = n[c == "mask" ? "mask" : "clip"]();
                    e(h.childNodes, l, r + 1, i, s);
                    break;
                case"lineargradient":
                case"radialgradient":
                    l = n.defs().gradient(c.split("gradient")[0], function (e) {
                        for (var t = 0; t < h.childNodes.length; t++) {
                            e.at({offset: 0}).attr(SVG.parse.attr(h.childNodes[t])).style(h.childNodes[t].getAttribute("style"))
                        }
                    });
                    break;
                case"#comment":
                case"#text":
                case"metadata":
                case"desc":
                    break;
                default:
                    console.log("SVG Import got unexpected type " + c, h);
                    break
            }
            switch (c) {
                case"circle":
                    p.rx = p.r;
                    p.ry = p.r;
                    delete p.r;
                    break
            }
            if (l) {
                d = SVG.parse.transform(p.transform);
                delete p.transform;
                l.attr(p).transform(d);
                if (l.attr("id")) i.add(l.attr("id"), l, r == 0);
                if (c == "text") l.rebuild();
                if (typeof s == "function") s.call(l, r)
            }
        }
        return n
    }

    SVG.extend(SVG.Container, {
        svg: function (t, n) {
            var r = document.createElement("div"), i = new SVG.ImportStore;
            r.innerHTML = t.replace(/\n/, "").replace(/<(\w+)([^<]+?)\/>/g, "<$1$2></$1>");
            e(r.childNodes, this, 0, i, n);
            r = null;
            return i
        }
    });
    SVG.ImportStore = function () {
        this._importStoreRoots = new SVG.Set;
        this._importStore = {}
    };
    SVG.extend(SVG.ImportStore, {
        add: function (e, t, n) {
            if (e) {
                if (this._importStore[e]) {
                    var r = e;
                    e += Math.round(Math.random() * 1e16);
                    console.warn('Encountered duplicate id "' + r + '". Changed store key to "' + e + '".')
                }
                this._importStore[e] = t
            }
            if (n === true) this._importStoreRoots.add(t);
            return this
        }, roots: function (e) {
            if (typeof e == "function") {
                this._importStoreRoots.each(e);
                return this
            } else {
                return this._importStoreRoots.valueOf()
            }
        }, get: function (e) {
            return this._importStore[e]
        }, remove: function () {
            return this.roots(function () {
                this.remove()
            })
        }
    })
}).call(this);