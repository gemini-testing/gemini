(function(window) {
    'use strict';

    // HACK: ie8 does not need to reset the body border,
    // while any other browser does.
    // This hack is obsolete in standards mode, but
    // calibration script is executed on about:blank
    // which is in quirks mode.
    // Needs to find a proper way to open calibration
    // page in standards mode.
    function needsResetBorder() {
        return !/MSIE 8\.0/.test(navigator.userAgent);
    }

    function resetZoom() {
        var meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width,initial-scale=1.0,user-scalable=no';
        document.getElementsByTagName('head')[0].appendChild(meta);
    }

    function createPattern() {
        var bodyStyle = document.body.style;
        bodyStyle.margin = 0;
        bodyStyle.padding = 0;

        if (needsResetBorder()) {
            bodyStyle.border = 0;
        }

        bodyStyle.backgroundColor = '#96fa00';
    }

    function hasCSS3Selectors() {
        try {
            document.querySelector('body:nth-child(1)');
        } catch (e) {
            return false;
        }
        return true;
    }

    function needsCompatLib() {
        return !hasCSS3Selectors() ||
            !window.getComputedStyle ||
            !window.matchMedia ||
            !String.prototype.trim;
    }

    function getBrowserFeatures() {
        var features = {
            needsCompatLib: needsCompatLib(),
            pixelRatio: window.devicePixelRatio,
            innerWidth: window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth
        };

        return features;
    }

    resetZoom();
    createPattern();
    return getBrowserFeatures();
}(window));
