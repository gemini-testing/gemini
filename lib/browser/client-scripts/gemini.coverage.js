(function(window) {
    /*jshint browser:true, node:false*/
    'use strict';
    var exports = window.__gemini || {};

    exports.collectCoverage = function collectCoverage(rect) {
        var coverage = {},
            sheets = document.styleSheets;
        try {
            for (var i = 0; i < sheets.length; i++) {
                var rules = sheets[i].cssRules,
                    ctx = {
                        // media rule counter
                        // coverage for media rules is stored by its index within stylesheet
                        media: -1,
                        coverage: coverage
                    };
                for (var r = 0; r < rules.length; r++) {
                    coverageRule(rules[r], rect, ctx);
                }
            }
        } catch (e) {
            return {
                error: 'JS',
                message: e.stack
            };
        }

        return coverage;
    };

    function coverageRule(rule, area, ctx) {
        if (rule.cssRules || rule.styleSheet) {
            if (rule.conditionText) {
                ctx.media++;
                if (!window.matchMedia(rule.conditionText).matches) {
                    return;
                }
            }

            var rules = rule.cssRules || rule.styleSheet.cssRules;
            for (var r = 0; r < rules.length; r++) {
                coverageRule(rules[r], area, ctx);
            }

            return;
        }

        if (!rule.selectorText) {
            return;
        }

        exports.each(rule.selectorText.split(','), function(selector) {
            var within,
                matches = document.querySelectorAll(selector);

            selector = selector.trim();

            var re = /:{1,2}(?:after|before|first-letter|first-line|selection)(:{1,2}\w+)?$/;
            // if selector contains pseudo-elements cut it off and try to find element without it
            if (matches.length === 0 && re.test(selector)) {
                matches = document.querySelectorAll(selector.replace(re, '$1'));
            }

            if (matches.length > 0) {
                for (var match = 0; match < matches.length; match++) {
                    var w = elemWithinArea(matches[match], area);
                    if (within === undefined) {
                        within = w;
                    }
                    if (within) {
                        break;
                    }
                    if (w !== undefined) {
                        within = w;
                    }
                }
            }

            var byfile = ctx.coverage[rule.parentStyleSheet.href] = ctx.coverage[rule.parentStyleSheet.href] || {};
            if (rule.parentRule && rule.parentRule.conditionText) {
                selector = '?' + ctx.media + ':' + selector;
            }
            if (within !== undefined && (!byfile[selector] || !byfile[selector].within)) {
                byfile[selector] = {
                    within: within
                };
            }
        });
    }

    /**
     * returns undefined when not within, false when overlaps, true when within
     */
    function elemWithinArea(elem, captureRect) {
        var elemRect = window.__gemini.getAbsoluteClientRect(elem);
        if (captureRect.rectInside(elemRect)) {
            return true;
        } else if (elemRect.rectInside(captureRect)) {
            return false;
        }
    }

    window.__gemini = exports;
}(window));
