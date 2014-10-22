// Based on the source from http://www.scriptiny.com/2009/03/table-sorter/
var TINY = {};

function T$(i) {
    return document.getElementById(i);
}
function T$$(e, p) {
    return p.getElementsByTagName(e);
}

TINY.table = function() {
    function sorter(n) {
        this.n = n;
        this.pagesize = 20;
        this.paginate = 0;
    }

    sorter.prototype.init = function(e, f) {
        var t = ge(e), i = 0;
        this.e = e;
        this.l = t.r.length;
        t.a = [];
        t.h = T$$('thead', T$(e))[0].rows[0];
        t.w = t.h.cells.length;
        for (i; i < t.w; i++) {
            var c = t.h.cells[i];
            if (c.className != 'nosort') {
                c.className = this.head;
                c.onclick = new Function(this.n + '.wk(this.cellIndex)');
            }
        }
        for (i = 0; i < this.l; i++) {
            t.a[i] = {};
        }
        if (f != null) {
            var a = new Function(this.n + '.wk(' + f + ')');
            a();
        }
        if (this.paginate) {
            this.g = 1;
            this.pages();
        }
    };
    sorter.prototype.wk = function(y) {
        var t = ge(this.e), x = t.h.cells[y], i = 0;
        for (i; i < this.l; i++) {
            t.a[i].o = i;
            var v = t.r[i].cells[y];
            t.r[i].style.display = '';
            while (v.hasChildNodes()) {
                v = v.firstChild;
            }
            t.a[i].v = v.nodeValue? v.nodeValue : '';
        }
        for (i = 0; i < t.w; i++) {
            var c = t.h.cells[i];
            if (c.className != 'nosort') {
                c.className = this.head;
            }
        }
        if (t.p == y) {
            t.a.reverse();
            var sort = t.d? this.asc : this.desc;
            this.asc && x.classList.remove(this.asc);
            this.desc && x.classList.remove(this.desc);
            sort && x.classList.add(sort);
            t.d = t.d? 0 : 1;
        }
        else {
            t.p = y;
            t.a.sort(cp);
            t.d = 0;
            this.asc && x.classList.add(this.asc);
        }
        var n = document.createElement('tbody');
        for (i = 0; i < this.l; i++) {
            var r = t.r[t.a[i].o].cloneNode(true);
            n.appendChild(r);
            var cl = i % 2 == 0? this.even : this.odd;
            this.even && r.classList.remove(this.even);
            this.odd && r.classList.remove(this.odd);
            cl && r.classList.add(cl);
            var cells = T$$('td', r);
            for (var z = 0; z < t.w; z++) {
                cl = y == z? i % 2 == 0? this.evensel : this.oddsel : '';
                this.evensel && cells[z].classList.remove(this.evensel);
                this.oddsel && cells[z].classList.remove(this.oddsel);
                cl && cells[z].classList.add(cl);
            }
        }
        t.replaceChild(n, t.b);
        if (this.paginate) {
            this.size(this.pagesize);
        }
    };
    sorter.prototype.page = function(s) {
        var t = ge(this.e), i = 0, l = s + parseInt(this.pagesize);
        if (this.currentid && this.limitid) {
            T$(this.currentid).innerHTML = this.g;
        }
        for (i; i < this.l; i++) {
            t.r[i].style.display = i >= s && i < l? '' : 'none';
        }
    };
    sorter.prototype.move = function(d, m) {
        var s = d == 1? (m? this.d : this.g + 1) : (m? 1 : this.g - 1);
        if (s <= this.d && s > 0) {
            this.g = s;
            this.page((s - 1) * this.pagesize);
        }
    };
    sorter.prototype.size = function(s) {
        this.pagesize = s;
        this.g = 1;
        this.pages();
        this.page(0);
        if (this.currentid && this.limitid) {
            T$(this.limitid).innerHTML = this.d;
        }
    };
    sorter.prototype.pages = function() {
        this.d = Math.ceil(this.l / this.pagesize);
    };
    function ge(e) {
        var t = T$(e);
        t.b = T$$('tbody', t)[0];
        t.r = t.b.rows;
        return t;
    };
    function cp(f, c) {
        var g, h;
        f = g = f.v.toLowerCase(), c = h = c.v.toLowerCase();
        var i = parseFloat(f.replace(/(\$|\,)/g, '')), n = parseFloat(c.replace(/(\$|\,)/g, ''));
        if (!isNaN(i) && !isNaN(n)) {
            return i - n;
        }
        if (f < c) {
            return -1;
        }
        if (f > c) {
            return 1;
        }
        return 0;
    };
    return {sorter: sorter};
}();
