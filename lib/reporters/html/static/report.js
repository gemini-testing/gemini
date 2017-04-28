(function() {
    /*eslint-env browser*/
    'use strict';

    var forEach = Array.prototype.forEach,
        filter = Array.prototype.filter,
        sections = document.querySelectorAll('.section'),
        url = require('url'),
        Clipboard = require('clipboard');

    function expandAll() {
        loadLazyImages(document, '.section_collapsed .tab__item_active img');
        forEach.call(sections, function(section) {
            section.classList.remove('section_collapsed');
        });
    }

    function collapseAll() {
        forEach.call(sections, function(section) {
            section.classList.add('section_collapsed');
        });
    }

    function expandErrors() {
        loadLazyImages(document, '.section_status_fail > .section__body > .image-box .tab__item_active img');
        loadLazyImages(document, '.section_status_warning > .section__body > .image-box .tab__item_active img');
        forEach.call(sections, function(section) {
            if (section.classList.contains('section_status_fail') ||
                section.classList.contains('section_status_warning')) {
                section.classList.remove('section_collapsed');
            } else {
                section.classList.add('section_collapsed');
            }
        });
    }

    function expandRetries() {
        loadLazyImages(document, '.has-retries > .section__body > .image-box .tab__item_active img');
        forEach.call(sections, function(section) {
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
        loadLazyImages(imageBox, '.tab__item_active img');

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

        if (target.classList.contains('meta-info__switcher')) {
            toggleMetaInfo(target);
        }
    }

    function toggleMetaInfo(target) {
        target.closest('.meta-info').classList.toggle('meta-info_collapsed');
    }

    function showOnlyDiff(e) {
        e.target.classList.toggle('button_checked');
        document.body.classList.toggle('report_show-only-diff');
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

    function handleHostChange() {
        var textInput = document.getElementById('viewHostInput');
        var viewButtons = document.querySelectorAll('.section__icon_view-local');

        textInput.addEventListener('change', function() {
            setViewLinkHost(textInput.value);
            // will save host to local storage
            if (window.localStorage) {
                window.localStorage.setItem('_gemini-replace-host', textInput.value);
            }
        });

        // read saved host from local storage
        if (window.localStorage) {
            var host = window.localStorage.getItem('_gemini-replace-host');
            if (host) {
                setViewLinkHost(host);
                textInput.value = host;
            }
        }

        function setViewLinkHost(host) {
            viewButtons.forEach(function(item) {
                var href = item.dataset.suiteViewLink,
                    parsedHost;

                if (host) {
                    parsedHost = url.parse(host, false, true);
                    // extending current url from entered host
                    href = url.format(Object.assign(
                        url.parse(href),
                        {
                            host: parsedHost.slashes ? parsedHost.host : host,
                            protocol: parsedHost.slashes ? parsedHost.protocol : null,
                            hostname: null,
                            port: null
                        }
                    ));
                }
                item.setAttribute('href', href);
            });
        }
    }

    function handleClipboard() {
        forEach.call(document.querySelectorAll('.section__icon_copy-to-clipboard'), function(clipboard) {
            /* eslint-disable no-new */
            new Clipboard(clipboard);
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        document.getElementById('expandAll').addEventListener('click', expandAll);
        document.getElementById('collapseAll').addEventListener('click', collapseAll);
        document.getElementById('expandErrors').addEventListener('click', expandErrors);
        document.getElementById('showSkipped').addEventListener('click', showSkippedList);
        document.getElementById('showRetries').addEventListener('click', expandRetries);
        document.getElementById('showOnlyDiff').addEventListener('click', showOnlyDiff);
        document.body.addEventListener('click', bodyClick);

        forEach.call(document.querySelectorAll('.section'), function(section) {
            section.querySelector('.section__title').addEventListener('click', function() {
                loadLazyImages(section, ':scope > .section__body > .image-box .tab__item_active img');
                section.classList.toggle('section_collapsed');
            });
        });

        // turning off event bubbling when click button
        forEach.call(document.querySelectorAll('.button'), function(button) {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });
    });

    handleClipboard();
    handleHostChange();
    expandErrors();
}());
