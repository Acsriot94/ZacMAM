;(function () {
    SVG.parse = {
        attr: function (e) {
            var t, n = e.attributes || [], r = {};
            for (t = n.length - 1; t >= 0; t--) r[n[t].nodeName] = n[t].nodeValue;
            if (typeof r.stroke != "undefined" && typeof r["stroke-width"] == "undefined") r["stroke-width"] = 1;
            return r
        }, transform: function (e) {
            var t, n, r, i = {}, s = (e || "").match(/[A-Za-z]+\([^\)]+\)/g) || [], o = SVG.defaults.trans();
            for (t = s.length - 1; t >= 0; t--) {
                n = s[t].match(/([A-Za-z]+)\(([^\)]+)\)/);
                r = (n[2] || "").replace(/^\s+/, "").replace(/,/g, " ").replace(/\s+/g, " ").split(" ");
                switch (n[1]) {
                    case"matrix":
                        i.a = SVG.regex.isNumber.test(r[0]) ? parseFloat(r[0]) : o.a;
                        i.b = parseFloat(r[1]) || o.b;
                        i.c = parseFloat(r[2]) || o.c;
                        i.d = SVG.regex.isNumber.test(r[3]) ? parseFloat(r[3]) : o.d;
                        i.e = parseFloat(r[4]) || o.e;
                        i.f = parseFloat(r[5]) || o.f;
                        break;
                    case"rotate":
                        i.rotation = parseFloat(r[0]) || o.rotation;
                        i.cx = parseFloat(r[1]) || o.cx;
                        i.cy = parseFloat(r[2]) || o.cy;
                        break;
                    case"scale":
                        i.scaleX = SVG.regex.isNumber.test(r[0]) ? parseFloat(r[0]) : o.scaleX;
                        i.scaleY = SVG.regex.isNumber.test(r[1]) ? parseFloat(r[1]) : o.scaleY;
                        break;
                    case"skewX":
                        i.skewX = parseFloat(r[0]) || o.skewX;
                        break;
                    case"skewY":
                        i.skewY = parseFloat(r[0]) || o.skewY;
                        break;
                    case"translate":
                        i.x = parseFloat(r[0]) || o.x;
                        i.y = parseFloat(r[1]) || o.y;
                        break
                }
            }
            return i
        }
    }
})();