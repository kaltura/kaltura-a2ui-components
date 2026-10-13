// Stand-in for the Kaltura Player bundle (https://cdnapisec.kaltura.com/p/<pid>/embedPlaykitJs/...).
// Served by Harness.open() for that path. Same shape as the real bundle:
// `KalturaPlayer.setup(config)` returns a player with `loadMedia`, `addEventListener`, `pause`, `currentTime` and `destroy`.
(function () {
  var log = (window.__playerLog = window.__playerLog || []);
  window.__playerSetups = window.__playerSetups || [];
  window.__playerLoads = window.__playerLoads || [];
  var listeners = {};
  // Calls the listeners of the latest player, like the real one does.
  window.__playerEmit = function (type, detail) {
    (listeners[type] || []).forEach(function (listener) {
      listener({ type: type, detail: detail });
    });
  };
  window.KalturaPlayer = {
    setup: function (config) {
      log.push('setup');
      window.__playerSetups.push(config);
      var ui = document.createElement('div');
      ui.className = 'stub-player-ui';
      ui.textContent = 'stub player';
      document.getElementById(config.targetId).appendChild(ui);
      var player = {
        Event: { ERROR: 'error', TIME_UPDATE: 'timeupdate' },
        currentTime: 0,
        pause: function () {
          log.push('pause');
        },
        addEventListener: function (type, listener) {
          (listeners[type] = listeners[type] || []).push(listener);
        },
        loadMedia: function (info, options) {
          log.push('loadMedia');
          window.__playerLoads.push({ info: info, options: options });
          return Promise.resolve({});
        },
        destroy: function () {
          log.push('destroy');
          ui.remove();
        },
      };
      window.__playerCurrent = player;
      return player;
    },
  };
})();
