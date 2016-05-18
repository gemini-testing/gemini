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
        loadLazyImages(document, '.section_status_warning > .section__body > .image-box img');
        forEach.call(document.querySelectorAll('.section'), function(section) {
            if (section.classList.contains('section_status_fail') ||
                section.classList.contains('section_status_warning')) {
                section.classList.remove('section_collapsed');
            } else {
                section.classList.add('section_collapsed');
            }
        });
    }

    function expandRetries() {
        loadLazyImages(document, '.has-retries > .section__body > .image-box img');
        forEach.call(document.querySelectorAll('.section'), function(section) {
            if (section.classList.contains('has-retries')) {
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

    function handleRetriesSwitch(target) {
        var imageBox = target.closest('.image-box');

        switch_(imageBox.querySelector('.tab'), 'tab__item_active');
        switch_(imageBox.querySelector('.tab-switcher'), 'tab-switcher__button_active');

        function switch_(elem, selector) {
            forEach.call(elem.children, function(item) {
                item.classList.remove(selector);

                if (target.getAttribute('data-position') === item.getAttribute('data-position')) {
                    item.classList.add(selector);
                }
            });
        }
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

        if (target.classList.contains('tab-switcher__button')) {
            handleRetriesSwitch(target);
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

    function showSkippedList() {
        document.getElementById('showSkipped').classList.toggle('pressed');
        document.getElementById('skippedList').classList.toggle('collapsed');
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('expandAll').addEventListener('click', expandAll);
        document.getElementById('collapseAll').addEventListener('click', collapseAll);
        document.getElementById('expandErrors').addEventListener('click', expandErrors);
        document.getElementById('showSkipped').addEventListener('click', showSkippedList);
        document.getElementById('showRetries').addEventListener('click', expandRetries);
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
