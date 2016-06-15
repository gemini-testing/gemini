'use strict';

exports.isFullPage = (image, page, screenshotMode) => {
    switch (screenshotMode) {
        case 'fullpage': return true;
        case 'viewport': return false;
        case 'auto': return compareDimensions(image, page);
    }
};

/**
 * @param {Image} image - PngImg wrapper
 * @param {Object} page - capture meta information object
 * @returns {boolean}
 * @private
 */
function compareDimensions(image, page) {
    const pixelRatio = page.pixelRatio;
    const documentWidth = page.documentWidth * pixelRatio;
    const documentHeight = page.documentHeight * pixelRatio;
    const imageSize = image.getSize();

    return imageSize.height >= documentHeight && imageSize.width >= documentWidth;
}
