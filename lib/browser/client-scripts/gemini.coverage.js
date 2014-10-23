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

        rule.selectorText.split(',').forEach(function(selector) {
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
    function elemWithinArea(e, rect) {
        e = window.__gemini.getAbsoluteClientRect(e);
        var within = areaWithinArea(e, rect);

        if (within === undefined && areaWithinArea(rect, e) !== undefined) {
            // return false when the capturing rect is within element bounds
            // for such cases as .body rules: we capture small area which is the part
            // of the body element and want the body rules to be marked as partially covered.
            within = false;
        }

        return within;
    }

    function areaWithinArea(rect1, rect2) {
        var p1 = pointWithinArea(rect1.left, rect1.top, rect2),
            p2 = pointWithinArea(window.__gemini.getRight(rect1), rect1.top, rect2),
            p3 = pointWithinArea(rect1.left, window.__gemini.getBottom(rect1), rect2),
            p4 = pointWithinArea(window.__gemini.getRight(rect1), window.__gemini.getBottom(rect1), rect2),
            within;

        if (p1 || p2 || p3 || p4) {
            within = (p1 && p2 && p3 && p4);
        }

        return within;
    }

    function pointWithinArea(x, y, rect) {
        return (x >= rect.left && x <= window.__gemini.getRight(rect) &&
                y >= rect.top && y <= window.__gemini.getBottom(rect));
    }

    window.__gemini = exports;
}(window));
