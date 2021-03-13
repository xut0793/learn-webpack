(() => {
  // webpackBootstrap
  var __webpack_exports__ = {};
  // This entry need to be wrapped in an IIFE because it need to be isolated against other entry modules.
  (() => {
    globalThis.greet = function(name) {
      globalThis.alert(`Hello ${name}`);
    };
  })();

  // This entry need to be wrapped in an IIFE because it need to be isolated against other entry modules.
  (() => {
    function genElement() {
      const eleDiv = document.createElement('div');
      eleDiv.textContent = 'Hello webpack';

      const eleBtn = document.createElement('button');
      eleBtn.textContent = 'Click me to greet Tom';
      eleBtn.onclick = function() {
        globalThis.greet('Tom');
      };
      eleDiv.appendChild(eleBtn);

      return eleDiv;
    }
    document.body.appendChild(genElement());
  })();
})();
