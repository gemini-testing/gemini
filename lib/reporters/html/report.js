(function() {
    /*jshint browser:true*/
    'use strict';

    var forEach = Array.prototype.forEach,
        filter = Array.prototype.filter;

    function expandAll() {
        loadLazyImages(document, '.section_collapsed img');
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
        loadLazyImages(document, '.section_status_fail > .section__body > .image-box img');
        forEach.call(document.querySelectorAll('.section'), function(section) {
            if (section.classList.contains('section_status_fail')) {
                section.classList.remove('section_collapsed');
            } else {
                section.classList.add('section_collapsed');
            }
        });
    }

    function handleColorSwitch(target, sources) {
        var imageBox = findClosest(target, 'image-box');

        sources.forEach(function(item) {
            item.classList.remove('cswitcher__item_selected');
        });
        forEach.call(imageBox.classList, function(cls) {
            if (/cswitcher_color_\d+/.test(cls)) {
                imageBox.classList.remove(cls);
            }
        });

        target.classList.add('cswitcher__item_selected');
        imageBox.classList.add('cswitcher_color_' + target.dataset.id);
    }

    function bodyClick(e) {
        var target = e.target;
        if (target.classList.contains('cswitcher__item')) {
            handleColorSwitch(
                target,
                filter.call(target.parentNode.childNodes, function(node) {
                    return node.nodeType === Node.ELEMENT_NODE;
                })
            );
        }
    }

    function findClosest(context, cls) {
        while ((context = context.parentNode)) {
            if (context.classList.contains(cls)) {
                return context;
            }
        }
    }

    function loadLazyImages(elem, selector) {
        forEach.call(elem.querySelectorAll(selector), function(img) {
            if (img.dataset.src && img.src !== img.dataset.src) {
                img.src = img.dataset.src;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('expandAll').addEventListener('click', expandAll);
        document.getElementById('collapseAll').addEventListener('click', collapseAll);
        document.getElementById('expandErrors').addEventListener('click', expandErrors);
        document.body.addEventListener('click', bodyClick);

        forEach.call(document.querySelectorAll('.section'), function(section) {
            section.querySelector('.section__title').addEventListener('click', function() {
                loadLazyImages(section, ':scope > .section__body > .image-box img');
                section.classList.toggle('section_collapsed');
            });
        });
    });

    expandErrors();
}());
