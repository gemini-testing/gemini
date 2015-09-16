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

        var img = document.createElement('div');
        img.style.width = '6px';
        img.style.height = '6px';
        img.style.margin = '0';
        img.style.padding = '0';

        // 1px high image with 6 * 6 #96fa00 square
        img.style.background = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAAGCAIAAABvrngfAAAAEElEQVR4AWOc8osBDdBYCABfQQlbthabtgAAAABJRU5ErkJggg==)';
        document.body.appendChild(img);
    }

    function getBrowserFeatures() {
        var features = {
            hasCSS3Selectors: true,
            pixelRatio: window.devicePixelRatio
        };
        try {
            document.querySelector('body:nth-child(1)');
        } catch (e) {
            features.hasCSS3Selectors = false;
        }

        return features;
    }

    resetZoom();
    createPattern();
    return getBrowserFeatures();
}(window));
