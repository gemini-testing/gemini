(function(window) {
    /*jshint browser:true, node:false*/
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

    function createRedStripe(side) {
        var div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.width = '1px';
        div.style.backgroundColor = '#ff0000';
        div.style.height = '100%';
        div.style.top = '0';
        div.style[side] = '3px';
        document.body.appendChild(div);
    }

    var bodyStyle = document.body.style;
    bodyStyle.margin = 0;
    bodyStyle.padding = 0;

    if (needsResetBorder()) {
        bodyStyle.border = 0;
    }
    bodyStyle.backgroundColor = '#00ff00';
    bodyStyle.width = '100%';
    bodyStyle.height = '100%';
    createRedStripe('left');
}(window));
