'use strict';

var util = require('./util'),
    coverageLevel = require('../../coverage-level'),
    rect = require('./rect'),
    query = require('./query');

exports.collectCoverage = function collectCoverage(rect) {
    var coverage = {},
        sheets = document.styleSheets;
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
        selector = selector.trim();
        var coverage = coverageLevel.NONE,
            matches = query.all(selector);

        var re = /:{1,2}(?:after|before|first-letter|first-line|selection)(:{1,2}\w+)?$/;
        // if selector contains pseudo-elements cut it off and try to find element without it
        if (matches.length === 0 && re.test(selector)) {
            var newSelector = selector.replace(re, '$1').trim();

            if (newSelector.length > 0) {
                matches = query.all(newSelector);
            }
        }

        if (matches.length > 0) {
            for (var match = 0; match < matches.length; match++) {
                var newCoverage = coverageForElem(matches[match], area);
                coverage = coverageLevel.merge(coverage, newCoverage);
            }
        }

        var byURL = ctx.coverage[ctx.href] = ctx.coverage[ctx.href] || {};
        if (rule.parentRule && rule.parentRule.conditionText) {
            selector = '?' + ctx.media + ':' + selector;
        }

        byURL[selector] = coverageLevel.merge(byURL[selector], coverage);
    });
}

function coverageForElem(elem, captureRect) {
    var elemRect = rect.getAbsoluteClientRect(elem);
    if (captureRect.rectInside(elemRect)) {
        return coverageLevel.FULL;
    } else if (captureRect.rectIntersects(elemRect)) {
        return coverageLevel.PARTIAL;
    }
    return coverageLevel.NONE;
}
