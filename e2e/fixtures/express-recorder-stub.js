// Stand-in for https://www.kaltura.com/apps/expressrecorder/v2.2.10/express-recorder.js.
// Served by Harness.open() for that path. Same shape as the real script:
// `Kaltura.ExpressRecorder.create(containerId, options)`.
(function () {
  var log = (window.__recorderLog = []);
  window.__recorderCreates = [];
  var listeners = {};
  // Calls the listeners of the latest recorder, like the real one does.
  window.__recorderEmit = function (type, detail) {
    (listeners[type] || []).forEach(function (listener) {
      listener({ type: type, detail: detail });
    });
  };
  window.Kaltura = {
    ExpressRecorder: {
      create: function (id, options) {
        log.push('create');
        window.__recorderCreates.push({ id: id, options: options });
        var ui = document.createElement('div');
        ui.className = 'stub-recorder-ui';
        ui.textContent = 'stub recorder';
        document.getElementById(id).appendChild(ui);
        return {
          version: 'stub',
          destroy: function () {
            log.push('destroy');
            ui.remove();
          },
          instance: {
            addEventListener: function (type, listener) {
              (listeners[type] = listeners[type] || []).push(listener);
            },
          },
        };
      },
    },
  };
})();
