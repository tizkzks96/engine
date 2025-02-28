import { EventHandler } from '../core/event-handler.js';

import { math } from '../math/math.js';
import { Mat4 } from '../math/mat4.js';
import { Vec3 } from '../math/vec3.js';

import { RESOLUTION_AUTO } from '../framework/constants.js';

/** @typedef {import('../framework/application.js').Application} Application */

/**
 * Callback used by {@link VrDisplay#requestPresent} and {@link VrDisplay#exitPresent}.
 *
 * @callback vrDisplayCallback
 * @param {string|null} err - The error message if presenting fails, or null if the call succeeds.
 * @ignore
 */

/**
 * Callback used by {@link VrDisplay#requestAnimationFrame}.
 *
 * @callback vrFrameCallback
 * @ignore
 */

/**
 * Represents a single Display for VR content. This could be a Head Mounted display that can
 * present content on a separate screen or a phone which can display content full screen on the
 * same screen. This object contains the native `navigator.VRDisplay` object from the WebVR API.
 *
 * @property {number} id An identifier for this distinct VRDisplay.
 * @property {*} display The native VRDisplay object from the WebVR API.
 * @property {boolean} presenting True if this display is currently presenting VR content.
 * @property {VRDisplayCapabilities} capabilities Returns the
 * [VRDisplayCapabilities](https://w3c.github.io/webvr/#interface-vrdisplaycapabilities) object
 * from the VRDisplay. This can be used to determine what features are available on this display.
 * @augments EventHandler
 * @deprecated
 * @ignore
 */
class VrDisplay extends EventHandler {
    /**
     * Create a new VrDisplay instance.
     *
     * @param {Application} app - The application outputting to this VR display.
     * @param {*} display - The native VRDisplay object from the WebVR API.
     */
    constructor(app, display) {
        super();

        this._app = app;
        this._device = app.graphicsDevice;

        this.id = display.displayId;

        this._frameData = null;
        if (window.VRFrameData) {
            this._frameData = new window.VRFrameData();
        }
        this.display = display;

        this._camera = null; // camera component

        this.sitToStandInv = new Mat4();

        this.leftView = new Mat4();
        this.leftProj = new Mat4();
        this.leftViewInv = new Mat4();
        this.leftPos = new Vec3();

        this.rightView = new Mat4();
        this.rightProj = new Mat4();
        this.rightViewInv = new Mat4();
        this.rightPos = new Vec3();

        this.combinedPos = new Vec3();
        this.combinedView = new Mat4();
        this.combinedProj = new Mat4();
        this.combinedViewInv = new Mat4();
        this.combinedFov = 0;
        this.combinedAspect = 0;

        this.presenting = false;

        this._presentChange = (event) => {
            let display;
            // handle various events formats
            if (event.display) {
                // this is the official spec event format
                display = event.display;
            } else if (event.detail && event.detail.display) {
                // webvr-polyfill uses this
                display = event.detail.display;
            } else if (event.detail && event.detail.vrdisplay) {
                // this was used in the webvr emulation chrome extension
                display = event.detail.vrdisplay;
            } else {
                // final catch all is to use this display as Firefox Nightly (54.0a1)
                // does not include the display within the event data
                display = this.display;
            }

            // check if event refers to this display
            if (display === this.display) {
                this.presenting = (this.display && this.display.isPresenting);

                if (this.presenting) {
                    const leftEye = this.display.getEyeParameters("left");
                    const rightEye = this.display.getEyeParameters("right");
                    const w = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
                    const h = Math.max(leftEye.renderHeight, rightEye.renderHeight);
                    // set canvas resolution to the display resolution
                    this._app.graphicsDevice.setResolution(w, h);
                    // prevent window resizing from resizing it
                    this._app._allowResize = false;
                } else {
                    // restore original resolution
                    this._app.setCanvasResolution(RESOLUTION_AUTO);
                    this._app._allowResize = true;
                }

                this.fire('beforepresentchange', this); // fire internal event for camera component
                this.fire('presentchange', this);
            }
        };

        window.addEventListener('vrdisplaypresentchange', this._presentChange, false);
    }

    /**
     * Destroy this display object.
     *
     * @deprecated
     */
    destroy() {
        window.removeEventListener('vrdisplaypresentchange', this._presentChange);

        if (this._camera) this._camera.vrDisplay = null;
        this._camera = null;
    }

    /**
     * Called once per frame to update the current status from the display. Usually called by {@link VrManager}.
     *
     * @deprecated
     */
    poll() {
        if (this.display) {
            this.display.getFrameData(this._frameData);

            this.leftProj.data = this._frameData.leftProjectionMatrix;
            this.rightProj.data = this._frameData.rightProjectionMatrix;

            const stage = this.display.stageParameters;
            if (stage) {
                this.sitToStandInv.set(stage.sittingToStandingTransform).invert();

                this.combinedView.set(this._frameData.leftViewMatrix);
                this.leftView.mul2(this.combinedView, this.sitToStandInv);

                this.combinedView.set(this._frameData.rightViewMatrix);
                this.rightView.mul2(this.combinedView, this.sitToStandInv);
            } else {
                this.leftView.set(this._frameData.leftViewMatrix);
                this.rightView.set(this._frameData.rightViewMatrix);
            }

            // Find combined position and view matrix
            // Camera is offset backwards to cover both frustums

            // Extract widest frustum plane and calculate fov
            let nx = this.leftProj.data[3] + this.leftProj.data[0];
            let nz = this.leftProj.data[11] + this.leftProj.data[8];
            let l = 1.0 / Math.sqrt(nx * nx + nz * nz);
            nx *= l;
            nz *= l;
            let maxFov = -Math.atan2(nz, nx);

            nx = this.rightProj.data[3] + this.rightProj.data[0];
            nz = this.rightProj.data[11] + this.rightProj.data[8];
            l = 1.0 / Math.sqrt(nx * nx + nz * nz);
            nx *= l;
            nz *= l;
            maxFov = Math.max(maxFov, -Math.atan2(nz, nx));
            maxFov *= 2.0;

            this.combinedFov = maxFov;

            const aspect = this.rightProj.data[5] / this.rightProj.data[0];
            this.combinedAspect = aspect;

            const view = this.combinedView;
            view.copy(this.leftView);
            view.invert();
            this.leftViewInv.copy(view);
            const pos = this.combinedPos;
            pos.x = this.leftPos.x = view.data[12];
            pos.y = this.leftPos.y = view.data[13];
            pos.z = this.leftPos.z = view.data[14];
            view.copy(this.rightView);
            view.invert();
            this.rightViewInv.copy(view);
            const deltaX = pos.x - view.data[12];
            const deltaY = pos.y - view.data[13];
            const deltaZ = pos.z - view.data[14];
            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
            this.rightPos.x = view.data[12];
            this.rightPos.y = view.data[13];
            this.rightPos.z = view.data[14];
            pos.x += view.data[12];
            pos.y += view.data[13];
            pos.z += view.data[14];
            pos.x *= 0.5; // middle pos
            pos.y *= 0.5;
            pos.z *= 0.5;
            const b = Math.PI * 0.5;
            const c = maxFov * 0.5;
            const a = Math.PI - (b + c);
            const offset = dist * 0.5 * (Math.sin(a));// / Math.sin(b) ); // equals 1
            const fwdX = view.data[8];
            const fwdY = view.data[9];
            const fwdZ = view.data[10];
            view.data[12] = pos.x + fwdX * offset; // our forward goes backwards so + instead of -
            view.data[13] = pos.y + fwdY * offset;
            view.data[14] = pos.z + fwdZ * offset;
            this.combinedViewInv.copy(view);
            view.invert();

            // Find combined projection matrix
            this.combinedProj.setPerspective(maxFov * math.RAD_TO_DEG,
                                             aspect,
                                             this.display.depthNear + offset,
                                             this.display.depthFar + offset,
                                             true);
        }
    }

    /**
     * Try to present full screen VR content on this display.
     *
     * @param {vrDisplayCallback} callback - Called when the request is completed. Callback takes a
     * single argument (err) that is the error message return if presenting fails, or null if the
     * call succeeds. Usually called by {@link CameraComponent#enterVr}.
     * @deprecated
     */
    requestPresent(callback) {
        if (!this.display) {
            if (callback) callback(new Error("No VrDisplay to requestPresent"));
            return;
        }

        if (this.presenting) {
            if (callback) callback(new Error("VrDisplay already presenting"));
            return;
        }

        this.display.requestPresent([{ source: this._device.canvas }]).then(function () {
            if (callback) callback();
        }, function (err) {
            if (callback) callback(err);
        });
    }

    /**
     * Try to stop presenting VR content on this display.
     *
     * @param {vrDisplayCallback} callback - Called when the request is completed. Callback takes a
     * single argument (err) that is the error message return if presenting fails, or null if the
     * call succeeds. Usually called by {@link CameraComponent#exitVr}.
     * @deprecated
     */
    exitPresent(callback) {
        if (!this.display) {
            if (callback) callback(new Error("No VrDisplay to exitPresent"));
        }

        if (!this.presenting) {
            if (callback) callback(new Error("VrDisplay not presenting"));
            return;
        }

        this.display.exitPresent().then(function () {
            if (callback) callback();
        }, function () {
            if (callback) callback(new Error("exitPresent failed"));
        });
    }

    /**
     * Used in the main application loop instead of the regular `window.requestAnimationFrame`.
     * Usually only called from inside {@link Application}.
     *
     * @param {vrFrameCallback} fn - Function called when it is time to update the frame.
     * @deprecated
     */
    requestAnimationFrame(fn) {
        if (this.display) this.display.requestAnimationFrame(fn);
    }

    /**
     * Called when animation update is complete and the frame is ready to be sent to the display.
     * Usually only called from inside {@link Application}.
     *
     * @deprecated
     */
    submitFrame() {
        if (this.display) this.display.submitFrame();
    }

    /**
     * Called to reset the pose of the {@link VrDisplay}. Treating its current pose as the
     * origin/zero. This should only be called in 'sitting' experiences.
     *
     * @deprecated
     */
    reset() {
        if (this.display) this.display.resetPose();
    }

    /**
     * Set the near and far depth plans of the display. This enables mapping of values in the
     * render target depth attachment to scene coordinates.
     *
     * @param {number} n - The near depth distance.
     * @param {number} f - The far depth distance.
     * @deprecated
     */
    setClipPlanes(n, f) {
        if (this.display) {
            this.display.depthNear = n;
            this.display.depthFar = f;
        }
    }

    /**
     * Return the current frame data that is updated during polling.
     *
     * @returns {*} The frame data object.
     * @deprecated
     */
    getFrameData() {
        if (this.display) return this._frameData;
    }

    get capabilities() {
        if (this.display) return this.display.capabilities;
        return {};
    }
}

export { VrDisplay };
