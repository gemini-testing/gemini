(function(window) {
    /*jshint browser:true, node:false*/
    'use strict';

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
    bodyStyle.backgroundColor = '#00ff00';
    bodyStyle.width = '100%';
    bodyStyle.height = '100%';
    createRedStripe('left');
    createRedStripe('right');
}(window));
