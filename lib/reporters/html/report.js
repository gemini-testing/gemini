(function() {
    /*jshint browser:true*/
    'use strict';

    var forEach = Array.prototype.forEach;

    function expandAll() {
        forEach.call(document.querySelectorAll('.section'), function(section) {
            section.classList.remove('section_collapsed');
        });
    }

    function collapseAll() {
        forEach.call(document.querySelectorAll('.section'), function(section) {
            section.classList.add('section_collapsed');
        });
    }

    function expandErrors() {
        forEach.call(document.querySelectorAll('.section'), function(section) {
            if (section.classList.contains('section_status_fail')) {
                section.classList.remove('section_collapsed');
            } else {
                section.classList.add('section_collapsed');
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('expandAll').addEventListener('click', expandAll);
        document.getElementById('collapseAll').addEventListener('click', collapseAll);
        document.getElementById('expandErrors').addEventListener('click', expandErrors);

        forEach.call(document.querySelectorAll('.section'), function(section) {
            section.querySelector('.section__title').addEventListener('click', function() {
                section.classList.toggle('section_collapsed');
            });
        });
    });
}());
