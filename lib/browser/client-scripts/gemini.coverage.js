/*jshint browserify:true*/
'use strict';

var util = require('./util'),
    rect = require('./rect');

exports.collectCoverage = function collectCoverage(rect) {
    var coverage = {},
        sheets = document.styleSheets;
    try {
        for (var i = 0; i < sheets.length; i++) {
            var href = sheets[i].href,
                rules = getRules(sheets[i]);

            if (rules.ignored) {
                coverage[href] = rules;
                continue;
            }
            var ctx = {
                // media rule counter
                // coverage for media rules is stored by its index within stylesheet
                media: -1,
                href: href,
                coverage: coverage
            };
            for (var r = 0; r < rules.length; r++) {
                coverageForRule(rules[r], rect, ctx);
            }
        }
    } catch (e) {
        return {
            error: 'JS',
            message: e.stack || e.message
        };
    }

    return coverage;
};

function getRules(styleSheet) {
    try {
        return styleSheet.cssRules || styleSheet.rules;
    } catch (e) {
        if (e.name === 'SecurityError') {
            return {
                ignored: true,
                message: 'Unable to read stylesheet rules due to the same origin policy'
            };
        }
        throw e;
    }
}

function coverageForRule(rule, area, ctx) {
    if (rule.cssRules || rule.styleSheet) {
        if (rule.conditionText) {
            ctx.media++;
            if (!window.matchMedia(rule.conditionText).matches) {
                return;
            }
        }

        var rules = rule.cssRules || rule.styleSheet.cssRules;
        for (var r = 0; r < rules.length; r++) {
            coverageForRule(rules[r], area, ctx);
        }

        return;
    }

    if (!rule.selectorText) {
        return;
    }

    util.each(rule.selectorText.split(','), function(selector) {
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

        var byfile = ctx.coverage[ctx.href] = ctx.coverage[ctx.href] || {};
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
    var elemRect = rect.getAbsoluteClientRect(elem);
    if (captureRect.rectInside(elemRect)) {
        return true;
    } else if (elemRect.rectInside(captureRect)) {
        return false;
    }
}
