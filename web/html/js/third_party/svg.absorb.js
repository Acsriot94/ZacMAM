// svg.absorb.js 0.1.0 - Copyright (c) 2014 Wout Fierens - Licensed under the MIT license
;(function () {
    SVG.Absorbee = SVG.invent({
        create: function (e) {
            this.node = e;
            this.type = e.localName;
            this.node.instance = this
        }, construct: {
            absorb: function (e) {
                if (typeof e === "string") {
                    var t, n = document.createElement("div");
                    n.innerHTML = e.replace(/\n/, "").replace(/<(\w+)([^<]+?)\/>/g, "<$1$2></$1>");
                    for (t = n.childNodes.length - 1; t >= 0; t--) if (n.childNodes[t].nodeType == 1) this.add(new SVG.Absorbee(n.childNodes[t]), 0);
                    n = null
                } else {
                    this.add(new SVG.Absorbee(e))
                }
                return this
            }
        }
    })
}).call(this);