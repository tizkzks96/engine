import { platform } from '../core/platform.js';
import { EventHandler } from '../core/event-handler.js';
import { XrTrackedImage } from './xr-tracked-image.js';

/** @typedef {import('./xr-manager.js').XrManager} XrManager */

/**
 * Image Tracking provides the ability to track real world images by provided image samples and
 * their estimated sizes.
 *
 * @augments EventHandler
 */
class XrImageTracking extends EventHandler {
    /**
     * Image Tracking provides the ability to track real world images by provided image samples and
     * their estimate sizes.
     *
     * @param {XrManager} manager - WebXR Manager.
     * @hideconstructor
     */
    constructor(manager) {
        super();

        this._manager = manager;
        this._supported = platform.browser && !!window.XRImageTrackingResult;
        this._available = false;

        this._images = [];

        if (this._supported) {
            this._manager.on('start', this._onSessionStart, this);
            this._manager.on('end', this._onSessionEnd, this);
        }
    }

    /**
     * @event
     * @name XrImageTracking#error
     * @param {Error} error - Error object related to a failure of image tracking.
     * @description Fired when the XR session is started, but image tracking failed to process the provided images.
     */

    /**
     * Add an image for image tracking. A width can also be provided to help the underlying system
     * estimate the appropriate transformation. Modifying the tracked images list is only possible
     * before an AR session is started.
     *
     * @param {HTMLCanvasElement|HTMLImageElement|SVGImageElement|HTMLVideoElement|Blob|ImageData|ImageBitmap} image - Image that is matching real world image as close as possible. Resolution of images should be at least 300x300. High resolution does NOT improve tracking performance. Color of image is irrelevant, so greyscale images can be used. Images with too many geometric features or repeating patterns will reduce tracking stability.
     * @param {number} width - Width (in meters) of image in the real world. Providing this value
     * as close to the real value will improve tracking quality.
     * @returns {XrTrackedImage|null} Tracked image object that will contain tracking information.
     * Returns null if image tracking is not supported or if the XR manager is not active.
     * @example
     * // image with width of 20cm (0.2m)
     * app.xr.imageTracking.add(bookCoverImg, 0.2);
     */
    add(image, width) {
        if (!this._supported || this._manager.active) return null;

        const trackedImage = new XrTrackedImage(image, width);
        this._images.push(trackedImage);
        return trackedImage;
    }

    /**
     * Remove an image from image tracking.
     *
     * @param {XrTrackedImage} trackedImage - Tracked image to be removed. Modifying the tracked
     * images list is only possible before an AR session is started.
     */
    remove(trackedImage) {
        if (this._manager.active) return;

        const ind = this._images.indexOf(trackedImage);
        if (ind !== -1) {
            trackedImage.destroy();
            this._images.splice(ind, 1);
        }
    }

    _onSessionStart() {
        this._manager.session.getTrackedImageScores().then((images) => {
            this._available = true;

            for (let i = 0; i < images.length; i++) {
                this._images[i]._trackable = images[i] === 'trackable';
            }
        }).catch((err) => {
            this._available = false;
            this.fire('error', err);
        });
    }

    _onSessionEnd() {
        this._available = false;

        for (let i = 0; i < this._images.length; i++) {
            this._images[i]._pose = null;
            this._images[i]._measuredWidth = 0;

            if (this._images[i]._tracking) {
                this._images[i]._tracking = false;
                this._images[i].fire('untracked');
            }
        }
    }

    prepareImages(callback) {
        if (this._images.length) {
            Promise.all(this._images.map(function (trackedImage) {
                return trackedImage.prepare();
            })).then(function (bitmaps) {
                callback(null, bitmaps);
            }).catch(function (err) {
                callback(err, null);
            });
        } else {
            callback(null, null);
        }
    }

    update(frame) {
        if (!this._available) return;

        const results = frame.getImageTrackingResults();
        const index = { };

        for (let i = 0; i < results.length; i++) {
            index[results[i].index] = results[i];

            const trackedImage = this._images[results[i].index];
            trackedImage._emulated = results[i].trackingState === 'emulated';
            trackedImage._measuredWidth = results[i].measuredWidthInMeters;
            trackedImage._dirtyTransform = true;
            trackedImage._pose = frame.getPose(results[i].imageSpace, this._manager._referenceSpace);
        }

        for (let i = 0; i < this._images.length; i++) {
            if (this._images[i]._tracking && !index[i]) {
                this._images[i]._tracking = false;
                this._images[i].fire('untracked');
            } else if (!this._images[i]._tracking && index[i]) {
                this._images[i]._tracking = true;
                this._images[i].fire('tracked');
            }
        }
    }

    /**
     * True if Image Tracking is supported.
     *
     * @type {boolean}
     */
    get supported() {
        return this._supported;
    }

    /**
     * True if Image Tracking is available. This property will be false if no images were provided
     * for the AR session or there was an error processing the provided images.
     *
     * @type {boolean}
     */
    get available() {
        return this._available;
    }

    /**
     * List of {@link XrTrackedImage} that contain tracking information.
     *
     * @type {XrTrackedImage[]}
     */
    get images() {
        return this._images;
    }
}

export { XrImageTracking };
