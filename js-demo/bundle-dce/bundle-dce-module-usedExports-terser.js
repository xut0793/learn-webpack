(() => {
  'use strict';
  var e = [
      ,
      (e, r, t) => {
        function o(e) {
          return e * e * e;
        }
        t.d(r, { cube: () => o });
      },
    ],
    r = {};
  function t(o) {
    if (r[o]) return r[o].exports;
    var n = (r[o] = { exports: {} });
    return e[o](n, n.exports, t), n.exports;
  }
  (t.d = (e, r) => {
    for (var o in r)
      t.o(r, o) &&
        !t.o(e, o) &&
        Object.defineProperty(e, o, { enumerable: !0, get: r[o] });
  }), (t.o = (e, r) => Object.prototype.hasOwnProperty.call(e, r)), (() => {
    const e = (0, t(1).cube)(5);
    console.log(`cube(5) = ${e}`);
  })();
})();
