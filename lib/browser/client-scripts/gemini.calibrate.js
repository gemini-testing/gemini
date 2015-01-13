(function(window) {
    /*jshint browser:true, node:false*/
    'use strict';
    var bodyStyle = window.document.getElementsByTagName('body')[0].style;
    bodyStyle.margin = 0;
    bodyStyle.padding = 0;
    bodyStyle.backgroundColor = '#ff0000';
    bodyStyle.width = '100%';
    bodyStyle.height = '100%';
    bodyStyle.borderLeft = bodyStyle.borderRight = 'solid 3px #00ff00';
    bodyStyle.boxSizing = 'border-box';
}(window));
