exports.get = function(element) {
    return element.getLocation()
        .then(function(pos) {
            return element.getSize().then(function(size) {
                return {
                    x: pos.x,
                    y: pos.y,
                    width: size.width,
                    height: size.height
                };
            });
        })
        .then(function(rect) {
            return element.getCssValue('box-shadow').then(function(boxShadow) {
                var shadows = parseBoxShadow(boxShadow);
                shadows.forEach(function(shadow) {
                    addBoxShadowSize(rect, shadow);
                });
                return rect;
            });
        });
};

function parseBoxShadow(value) {
    var regex = /.+? ((?:\d*)(?:\.\d+)?)px ((?:\d*)(?:\.\d+)?)px ((?:\d*)(?:\.\d+)?)px ((?:\d*)(?:\.\d+)?)px( inset)?/,
        results = [],
        match;

    while ((match = value.match(regex))) {
        //ignore inset shadows
        if (!match[5]) {
            results.push({
                offsetX: +match[1],
                offsetY: +match[2],
                blurRadius: +match[3],
                spreadRadius: +match[4]
            });
        }

        value = value.substring(match.index + match[0].length);
    }
    return results;
}

function addBoxShadowSize(box, shadow) {
    if (shadow.offsetX > 0) {
        box.width += shadow.offsetX;
    } else {
        box.x -= shadow.offsetX;
    }

    if (shadow.offsetY > 0) {
        box.height += shadow.offsetY;
    } else {
        box.y -= shadow.offsetY;
    }

    //TODO: negative spread

    box.x -= shadow.spreadRadius + shadow.blurRadius;
    box.y -= shadow.spreadRadius + shadow.blurRadius;
    box.width += 2 * (shadow.spreadRadius + shadow.blurRadius);
    box.height += 2 * (shadow.spreadRadius + shadow.blurRadius);
}
