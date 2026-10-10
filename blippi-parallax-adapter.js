(function (global) {
  'use strict';

  var DEFAULTS = Object.freeze({
    selector: '[data-blippi-parallax]',
    layerSelector: '.blippi-depth-layer',
    scalarX: 8,
    scalarY: 5,
    frictionX: 0.12,
    frictionY: 0.12,
    limitX: 14,
    limitY: 9
  });

  function reducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function mergeOptions(options) {
    var source = options || {};
    return {
      selector: source.selector || DEFAULTS.selector,
      layerSelector: source.layerSelector || DEFAULTS.layerSelector,
      scalarX: source.scalarX == null ? DEFAULTS.scalarX : source.scalarX,
      scalarY: source.scalarY == null ? DEFAULTS.scalarY : source.scalarY,
      frictionX: source.frictionX == null ? DEFAULTS.frictionX : source.frictionX,
      frictionY: source.frictionY == null ? DEFAULTS.frictionY : source.frictionY,
      limitX: source.limitX == null ? DEFAULTS.limitX : source.limitX,
      limitY: source.limitY == null ? DEFAULTS.limitY : source.limitY
    };
  }

  function createInstance(scene, options) {
    return new global.Parallax(scene, {
      selector: options.layerSelector,
      relativeInput: true,
      clipRelativeInput: true,
      hoverOnly: false,
      pointerEvents: true,
      scalarX: options.scalarX,
      scalarY: options.scalarY,
      frictionX: options.frictionX,
      frictionY: options.frictionY,
      limitX: options.limitX,
      limitY: options.limitY
    });
  }

  function init(options) {
    var settings = mergeOptions(options);
    var scenes = Array.prototype.slice.call(document.querySelectorAll(settings.selector));
    var instances = [];

    if (typeof global.Parallax !== 'function') {
      return { ok: false, reason: 'parallax-js-missing', destroy: function () {} };
    }

    if (!reducedMotion()) {
      instances = scenes.map(function (scene) {
        scene.classList.add('blippi-parallax-ready');
        return createInstance(scene, settings);
      });
    } else {
      scenes.forEach(function (scene) {
        scene.classList.add('blippi-reduced-motion');
      });
    }

    return {
      ok: true,
      count: instances.length,
      destroy: function () {
        instances.forEach(function (instance) { instance.destroy(); });
        scenes.forEach(function (scene) {
          scene.classList.remove('blippi-parallax-ready', 'blippi-reduced-motion');
        });
      }
    };
  }

  global.BlippiParallax = Object.freeze({ init: init });
}(window));
