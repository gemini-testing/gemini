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

    function createPattern() {
        var bodyStyle = document.body.style;
        bodyStyle.margin = 0;
        bodyStyle.padding = 0;

        if (needsResetBorder()) {
            bodyStyle.border = 0;
        }

        var img = document.createElement('div');
        img.style.width = '4px';
        img.style.height = '1px';
        img.style.margin = '0';
        img.style.padding = '0';

        // 1px high image with pattern: (green, green, green, red)
        img.style.background = 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAABCAIAAAB2XpiaAAAAD0lEQVQIW2Ng+M8AQUACABryA/01utvkAAAAAElFTkSuQmCC)';

        document.body.appendChild(img);
    }

    function getBrowserFeatures() {
        var features = {
            hasCSS3Selectors: true
        };
        try {
            document.querySelector('body:nth-child(1)');
        } catch (e) {
            features.hasCSS3Selectors = false;
        }

        return features;
    }

    createPattern();
    return getBrowserFeatures();
}(window));
