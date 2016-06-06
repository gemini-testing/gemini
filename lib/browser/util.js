'use strict';

exports.isFullPage = (image, pageDisposition, screenshotMode) => {
    switch (screenshotMode) {
        case 'fullpage': return true;
        case 'viewport': return false;
        case 'auto': return compareDimensions(image, pageDisposition);
    }
};

/**
 * @param {Image} image - PngImg wrapper
 * @param {Object} pageDisposition - capture meta information object
 * @returns {boolean}
 * @private
 */
function compareDimensions(image, pageDisposition) {
    const pixelRatio = pageDisposition.pixelRatio;
    const documentWidth = pageDisposition.documentWidth * pixelRatio;
    const documentHeight = pageDisposition.documentHeight * pixelRatio;
    const imageSize = image.getSize();

    return imageSize.height >= documentHeight && imageSize.width >= documentWidth;
}
