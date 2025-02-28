import { math } from '../../math/math.js';
import { Vec3 } from '../../math/vec3.js';
import { Mat4 } from '../../math/mat4.js';
import { Color } from '../../math/color.js';

import { BoundingBox } from '../../shape/bounding-box.js';

import {
    BLUR_GAUSSIAN,
    LIGHTTYPE_DIRECTIONAL, LIGHTTYPE_OMNI, LIGHTTYPE_SPOT,
    SHADER_SHADOW,
    SHADOW_PCF3, SHADOW_PCF5, SHADOW_VSM8, SHADOW_VSM32, SHADOW_COUNT,
    SHADOWUPDATE_NONE, SHADOWUPDATE_THISFRAME,
    SORTKEY_DEPTH
} from '../constants.js';
import { LightCamera } from './light-camera.js';

import { FUNC_LESSEQUAL } from '../../graphics/constants.js';
import { drawQuadWithShader } from '../../graphics/simple-post-effect.js';
import { shaderChunks } from '../../graphics/program-lib/chunks/chunks.js';
import { createShaderFromCode } from '../../graphics/program-lib/utils.js';
import { DebugGraphics } from '../../graphics/debug-graphics.js';
import { ShadowMap } from './shadow-map.js';
import { ShadowMapCache } from './shadow-map-cache.js';
import { Frustum } from '../../shape/frustum.js';

const aabbPoints = [
    new Vec3(), new Vec3(), new Vec3(), new Vec3(),
    new Vec3(), new Vec3(), new Vec3(), new Vec3()
];

// evaluate depth range the aabb takes in the space of the camera
const _depthRange = { min: 0, max: 0 };
function getDepthRange(cameraViewMatrix, aabbMin, aabbMax) {
    aabbPoints[0].x = aabbPoints[1].x = aabbPoints[2].x = aabbPoints[3].x = aabbMin.x;
    aabbPoints[1].y = aabbPoints[3].y = aabbPoints[7].y = aabbPoints[5].y = aabbMin.y;
    aabbPoints[2].z = aabbPoints[3].z = aabbPoints[6].z = aabbPoints[7].z = aabbMin.z;
    aabbPoints[4].x = aabbPoints[5].x = aabbPoints[6].x = aabbPoints[7].x = aabbMax.x;
    aabbPoints[0].y = aabbPoints[2].y = aabbPoints[4].y = aabbPoints[6].y = aabbMax.y;
    aabbPoints[0].z = aabbPoints[1].z = aabbPoints[4].z = aabbPoints[5].z = aabbMax.z;

    let minz = 9999999999;
    let maxz = -9999999999;

    for (let i = 0; i < 8; ++i) {
        cameraViewMatrix.transformPoint(aabbPoints[i], aabbPoints[i]);
        const z = aabbPoints[i].z;
        if (z < minz) minz = z;
        if (z > maxz) maxz = z;
    }

    _depthRange.min = minz;
    _depthRange.max = maxz;
    return _depthRange;
}

function gauss(x, sigma) {
    return Math.exp(-(x * x) / (2.0 * sigma * sigma));
}

const maxBlurSize = 25;
function gaussWeights(kernelSize) {
    if (kernelSize > maxBlurSize) {
        kernelSize = maxBlurSize;
    }
    const sigma = (kernelSize - 1) / (2 * 3);

    const halfWidth = (kernelSize - 1) * 0.5;
    const values = new Array(kernelSize);
    let sum = 0.0;
    for (let i = 0; i < kernelSize; ++i) {
        values[i] = gauss(i - halfWidth, sigma);
        sum += values[i];
    }

    for (let i = 0; i < kernelSize; ++i) {
        values[i] /= sum;
    }
    return values;
}

const visibleSceneAabb = new BoundingBox();
const shadowCamView = new Mat4();
const shadowCamViewProj = new Mat4();
const pixelOffset = new Float32Array(2);
const blurScissorRect = { x: 1, y: 1, z: 0, w: 0 };
const opChanId = { r: 1, g: 2, b: 3, a: 4 };
const center = new Vec3();
const viewportMatrix = new Mat4();

function getDepthKey(meshInstance) {
    const material = meshInstance.material;
    const x = meshInstance.skinInstance ? 10 : 0;
    let y = 0;
    if (material.opacityMap) {
        const opChan = material.opacityMapChannel;
        if (opChan) {
            y = opChanId[opChan];
        }
    }
    return x + y;
}

class ShadowRenderer {
    constructor(forwardRenderer, lightTextureAtlas) {
        this.device = forwardRenderer.device;
        this.forwardRenderer = forwardRenderer;
        this.lightTextureAtlas = lightTextureAtlas;
        const scope = this.device.scope;

        this.polygonOffsetId = scope.resolve("polygonOffset");
        this.polygonOffset = new Float32Array(2);

        // VSM
        this.sourceId = scope.resolve("source");
        this.pixelOffsetId = scope.resolve("pixelOffset");
        this.weightId = scope.resolve("weight[0]");
        this.blurVsmShaderCode = [shaderChunks.blurVSMPS, "#define GAUSS\n" + shaderChunks.blurVSMPS];
        const packed = "#define PACKED\n";
        this.blurPackedVsmShaderCode = [packed + this.blurVsmShaderCode[0], packed + this.blurVsmShaderCode[1]];

        // cache for vsm blur shaders
        this.blurVsmShader = [{}, {}];
        this.blurPackedVsmShader = [{}, {}];

        this.blurVsmWeights = {};

        // uniforms
        this.shadowMapLightRadiusId = scope.resolve('light_radius');

        // shadow map cache
        this.shadowMapCache = new ShadowMapCache();
    }

    destroy() {
        this.shadowMapCache.destroy();
        this.shadowMapCache = null;
    }

    // creates shadow camera for a light and sets up its constant properties
    static createShadowCamera(device, shadowType, type, face) {

        const shadowCam = LightCamera.create("ShadowCamera", type, face);

        // don't clear the color buffer if rendering a depth map
        if (shadowType >= SHADOW_VSM8 && shadowType <= SHADOW_VSM32) {
            shadowCam.clearColor = new Color(0, 0, 0, 0);
        } else {
            shadowCam.clearColor = new Color(1, 1, 1, 1);
        }

        shadowCam.clearDepthBuffer = true;
        shadowCam.clearStencilBuffer = false;

        return shadowCam;
    }

    static setShadowCameraSettings(shadowCam, device, shadowType, type, isClustered) {

        // normal omni shadows on webgl2 encode depth in RGBA8 and do manual PCF sampling
        // clustered omni shadows on webgl2 use depth format and hardware PCF sampling
        let hwPcf = shadowType === SHADOW_PCF5 || (shadowType === SHADOW_PCF3 && device.webgl2);
        if (type === LIGHTTYPE_OMNI && !isClustered) {
            hwPcf = false;
        }

        shadowCam.clearColorBuffer = !hwPcf;
    }

    // culls the list of meshes instances by the camera, storing visible mesh instances in the specified array
    cullShadowCasters(meshInstances, visible, camera) {

        let count = 0;
        const numInstances = meshInstances.length;
        for (let i = 0; i < numInstances; i++) {
            const meshInstance = meshInstances[i];

            if (!meshInstance.cull || meshInstance._isVisible(camera)) {
                meshInstance.visibleThisFrame = true;
                visible[count] = meshInstance;
                count++;
            }
        }

        visible.length = count;

        // TODO: we should probably sort shadow meshes by shader and not depth
        visible.sort(this.forwardRenderer.depthSortCompare);
    }

    // cull local shadow map
    cullLocal(light, drawCalls) {

        const isClustered = this.forwardRenderer.scene.clusteredLightingEnabled;

        // force light visibility if function was manually called
        light.visibleThisFrame = true;

        // allocate shadow map unless in clustered lighting mode
        if (!isClustered) {
            if (!light._shadowMap) {
                light._shadowMap = ShadowMap.create(this.device, light);
            }
        }

        const type = light._type;
        const faceCount = type === LIGHTTYPE_SPOT ? 1 : 6;

        for (let face = 0; face < faceCount; face++) {

            // render data are shared between cameras for local lights, so pass null for camera
            const lightRenderData = light.getRenderData(null, face);
            const shadowCam = lightRenderData.shadowCamera;

            shadowCam.nearClip = light.attenuationEnd / 1000;
            shadowCam.farClip = light.attenuationEnd;

            const shadowCamNode = shadowCam._node;
            const lightNode = light._node;
            shadowCamNode.setPosition(lightNode.getPosition());

            if (type === LIGHTTYPE_SPOT) {
                shadowCam.fov = light._outerConeAngle * 2;

                // Camera looks down the negative Z, and spot light points down the negative Y
                shadowCamNode.setRotation(lightNode.getRotation());
                shadowCamNode.rotateLocal(-90, 0, 0);

            } else if (type === LIGHTTYPE_OMNI) {

                // when rendering omni shadows to an atlas, use larger fov by few pixels to allow shadow filtering to stay on a single face
                if (isClustered) {
                    const tileSize = this.lightTextureAtlas.shadowAtlasResolution * light.atlasViewport.z / 3;    // using 3x3 for cubemap
                    const texelSize = 2 / tileSize;
                    const filterSize = texelSize * this.lightTextureAtlas.shadowEdgePixels;
                    shadowCam.fov = Math.atan(1 + filterSize) * math.RAD_TO_DEG * 2;
                } else {
                    shadowCam.fov = 90;
                }
            }

            // cull shadow casters
            this.forwardRenderer.updateCameraFrustum(shadowCam);
            this.cullShadowCasters(drawCalls, lightRenderData.visibleCasters, shadowCam);
        }
    }

    // function to generate frustum split distances
    generateSplitDistances(light, nearDist, farDist) {

        light._shadowCascadeDistances.fill(farDist);
        for (let i = 1; i < light.numCascades; i++) {

            //  lerp between linear and logarithmic distance, called practical split distance
            const fraction = i / light.numCascades;
            const linearDist = nearDist + (farDist - nearDist) * fraction;
            const logDist = nearDist * (farDist / nearDist) ** fraction;
            const dist = math.lerp(linearDist, logDist, light.cascadeDistribution);
            light._shadowCascadeDistances[i - 1] = dist;
        }
    }

    // cull directional shadow map
    cullDirectional(light, drawCalls, camera) {

        // force light visibility if function was manually called
        light.visibleThisFrame = true;

        if (!light._shadowMap) {
            light._shadowMap = ShadowMap.create(this.device, light);
        }

        // generate splits for the cascades
        const nearDist = camera._nearClip;
        this.generateSplitDistances(light, nearDist, light.shadowDistance);

        for (let cascade = 0; cascade < light.numCascades; cascade++) {

            const lightRenderData = light.getRenderData(camera, cascade);
            const shadowCam = lightRenderData.shadowCamera;

            // assign render target
            // Note: this is done during rendering for all shadow maps, but do it here for the case shadow rendering for the directional light
            // is disabled - we need shadow map to be assigned for rendering to work even in this case. This needs further refactoring - as when
            // shadow rendering is set to SHADOWUPDATE_NONE, we should not even execute shadow map culling
            shadowCam.renderTarget = light._shadowMap.renderTargets[0];

            // viewport
            lightRenderData.shadowViewport.copy(light.cascades[cascade]);
            lightRenderData.shadowScissor.copy(light.cascades[cascade]);

            const shadowCamNode = shadowCam._node;
            const lightNode = light._node;

            shadowCamNode.setPosition(lightNode.getPosition());

            // Camera looks down the negative Z, and directional light points down the negative Y
            shadowCamNode.setRotation(lightNode.getRotation());
            shadowCamNode.rotateLocal(-90, 0, 0);

            // get camera's frustum corners for the cascade, convert them to world space and find their center
            const frustumNearDist = cascade === 0 ? nearDist : light._shadowCascadeDistances[cascade - 1];
            const frustumFarDist = light._shadowCascadeDistances[cascade];
            const frustumPoints = Frustum.getPoints(camera, frustumNearDist, frustumFarDist);
            center.set(0, 0, 0);
            const cameraWorldMat = camera.node.getWorldTransform();
            for (let i = 0; i < 8; i++) {
                cameraWorldMat.transformPoint(frustumPoints[i], frustumPoints[i]);
                center.add(frustumPoints[i]);
            }
            center.mulScalar(1 / 8);

            // radius of the world space bounding sphere for the frustum slice
            let radius = 0;
            for (let i = 0; i < 8; i++) {
                const dist = frustumPoints[i].sub(center).length();
                if (dist > radius)
                    radius = dist;
            }

            // axis of light coordinate system
            const right = shadowCamNode.right;
            const up = shadowCamNode.up;
            const lightDir = shadowCamNode.forward;

            // transform the sphere's center into the center of the shadow map, pixel aligned.
            // this makes the shadow map stable and avoids shimmering on the edges when the camera moves
            const sizeRatio = 0.25 * light._shadowResolution / radius;
            const x = Math.ceil(center.dot(up) * sizeRatio) / sizeRatio;
            const y = Math.ceil(center.dot(right) * sizeRatio) / sizeRatio;

            const scaledUp = up.mulScalar(x);
            const scaledRight = right.mulScalar(y);
            const dot = center.dot(lightDir);
            const scaledDir = lightDir.mulScalar(dot);
            center.add2(scaledUp, scaledRight).add(scaledDir);

            // look at the center from far away to include all casters during culling
            shadowCamNode.setPosition(center);
            shadowCamNode.translateLocal(0, 0, 1000000);
            shadowCam.nearClip = 0;
            shadowCam.farClip = 2000000;
            shadowCam.orthoHeight = radius;

            // cull shadow casters
            this.forwardRenderer.updateCameraFrustum(shadowCam);
            this.cullShadowCasters(drawCalls, lightRenderData.visibleCasters, shadowCam);

            // find out AABB of visible shadow casters
            let emptyAabb = true;
            const visibleCasters = lightRenderData.visibleCasters;
            for (let i = 0; i < visibleCasters.length; i++) {
                const meshInstance = visibleCasters[i];

                if (emptyAabb) {
                    emptyAabb = false;
                    visibleSceneAabb.copy(meshInstance.aabb);
                } else {
                    visibleSceneAabb.add(meshInstance.aabb);
                }
            }

            // calculate depth range of the caster's AABB from the point of view of the shadow camera
            shadowCamView.copy(shadowCamNode.getWorldTransform()).invert();
            const depthRange = getDepthRange(shadowCamView, visibleSceneAabb.getMin(), visibleSceneAabb.getMax());

            // adjust shadow camera's near and far plane to the depth range of casters to maximize precision
            // of values stored in the shadow map. Make it slightly larger to avoid clipping on near / far plane.
            shadowCamNode.translateLocal(0, 0, depthRange.max + 0.1);
            shadowCam.farClip = depthRange.max - depthRange.min + 0.2;
        }
    }

    setupRenderState(device, light) {

        const isClustered = this.forwardRenderer.scene.clusteredLightingEnabled;

        // depth bias
        if (device.webgl2) {
            if (light._type === LIGHTTYPE_OMNI && !isClustered) {
                device.setDepthBias(false);
            } else {
                device.setDepthBias(true);
                device.setDepthBiasValues(light.shadowBias * -1000.0, light.shadowBias * -1000.0);
            }
        } else if (device.extStandardDerivatives) {
            if (light._type === LIGHTTYPE_OMNI) {
                this.polygonOffset[0] = 0;
                this.polygonOffset[1] = 0;
                this.polygonOffsetId.setValue(this.polygonOffset);
            } else {
                this.polygonOffset[0] = light.shadowBias * -1000.0;
                this.polygonOffset[1] = light.shadowBias * -1000.0;
                this.polygonOffsetId.setValue(this.polygonOffset);
            }
        }

        // Set standard shadowmap states
        device.setBlending(false);
        device.setDepthWrite(true);
        device.setDepthTest(true);
        device.setDepthFunc(FUNC_LESSEQUAL);

        const useShadowSampler = isClustered ?
            light._isPcf && device.webgl2 :     // both spot and omni light are using shadow sampler on webgl2 when clustered
            light._isPcf && device.webgl2 && light._type !== LIGHTTYPE_OMNI;    // for non-clustered, point light is using depth encoded in color buffer (should change to shadow sampler)
        if (useShadowSampler) {
            device.setColorWrite(false, false, false, false);
        } else {
            device.setColorWrite(true, true, true, true);
        }
    }

    restoreRenderState(device) {

        if (device.webgl2) {
            device.setDepthBias(false);
        } else if (device.extStandardDerivatives) {
            this.polygonOffset[0] = 0;
            this.polygonOffset[1] = 0;
            this.polygonOffsetId.setValue(this.polygonOffset);
        }
    }

    dispatchUniforms(light, shadowCam, lightRenderData, face) {

        const shadowCamNode = shadowCam._node;

        // position / range
        if (light._type !== LIGHTTYPE_DIRECTIONAL) {
            this.forwardRenderer.dispatchViewPos(shadowCamNode.getPosition());
            this.shadowMapLightRadiusId.setValue(light.attenuationEnd);
        }

        // view-projection shadow matrix
        shadowCamView.setTRS(shadowCamNode.getPosition(), shadowCamNode.getRotation(), Vec3.ONE).invert();
        shadowCamViewProj.mul2(shadowCam.projectionMatrix, shadowCamView);

        // viewport handling
        const rectViewport = lightRenderData.shadowViewport;
        shadowCam.rect = rectViewport;
        shadowCam.scissorRect = lightRenderData.shadowScissor;

        viewportMatrix.setViewport(rectViewport.x, rectViewport.y, rectViewport.z, rectViewport.w);
        lightRenderData.shadowMatrix.mul2(viewportMatrix, shadowCamViewProj);

        if (light._type === LIGHTTYPE_DIRECTIONAL) {
            // copy matrix to shadow cascade palette
            light._shadowMatrixPalette.set(lightRenderData.shadowMatrix.data, face * 16);
        }
    }

    submitCasters(visibleCasters, light) {

        const device = this.device;
        const forwardRenderer = this.forwardRenderer;
        const shadowPass = 1 << SHADER_SHADOW;

        // Sort shadow casters
        const shadowType = light._shadowType;
        const smode = shadowType + light._type * SHADOW_COUNT;

        // Render
        const count = visibleCasters.length;
        for (let i = 0; i < count; i++) {
            const meshInstance = visibleCasters[i];
            const mesh = meshInstance.mesh;
            const material = meshInstance.material;

            // set basic material states/parameters
            forwardRenderer.setBaseConstants(device, material);
            forwardRenderer.setSkinning(device, meshInstance, material);

            if (material.dirty) {
                material.updateUniforms(device, forwardRenderer.scene);
                material.dirty = false;
            }

            if (material.chunks) {

                forwardRenderer.setCullMode(true, false, meshInstance);

                // Uniforms I (shadow): material
                material.setParameters(device);

                // Uniforms II (shadow): meshInstance overrides
                meshInstance.setParameters(device, shadowPass);
            }

            // set shader
            let shadowShader = meshInstance._shader[SHADER_SHADOW + smode];
            if (!shadowShader) {
                forwardRenderer.updateShader(meshInstance, meshInstance._shaderDefs, null, SHADER_SHADOW + smode);
                shadowShader = meshInstance._shader[SHADER_SHADOW + smode];
                meshInstance._key[SORTKEY_DEPTH] = getDepthKey(meshInstance);
            }
            device.setShader(shadowShader);

            // set buffers
            forwardRenderer.setVertexBuffers(device, mesh);
            forwardRenderer.setMorphing(device, meshInstance.morphInstance);

            const style = meshInstance.renderStyle;
            device.setIndexBuffer(mesh.indexBuffer[style]);

            // draw
            i += forwardRenderer.drawInstance(device, meshInstance, mesh, style);
            forwardRenderer._shadowDrawCalls++;
        }
    }

    render(light, camera) {

        if (light.enabled && light.castShadows && light.shadowUpdateMode !== SHADOWUPDATE_NONE && light.visibleThisFrame) {
            const device = this.device;

            if (light.shadowUpdateMode === SHADOWUPDATE_THISFRAME) {
                light.shadowUpdateMode = SHADOWUPDATE_NONE;
            }

            const type = light._type;
            const shadowType = light._shadowType;
            const faceCount = light.numShadowFaces;

            const forwardRenderer = this.forwardRenderer;
            forwardRenderer._shadowMapUpdates += faceCount;
            const isClustered = forwardRenderer.scene.clusteredLightingEnabled;

            DebugGraphics.pushGpuMarker(device, `SHADOW ${light._node.name}`);

            this.setupRenderState(device, light);

            for (let face = 0; face < faceCount; face++) {

                DebugGraphics.pushGpuMarker(device, `FACE ${face}`);

                // directional shadows are per camera, so get appropriate render data
                const lightRenderData = light.getRenderData(type === LIGHTTYPE_DIRECTIONAL ? camera : null, face);
                const shadowCam = lightRenderData.shadowCamera;

                // camera clear setting
                // Note: when clustered lighting is the only light type, this code can be moved to createShadowCamera function
                ShadowRenderer.setShadowCameraSettings(shadowCam, device, shadowType, type, isClustered);

                // assign render target for the face
                const renderTargetIndex = type === LIGHTTYPE_DIRECTIONAL ? 0 : face;
                shadowCam.renderTarget = light._shadowMap.renderTargets[renderTargetIndex];

                this.dispatchUniforms(light, shadowCam, lightRenderData, face);

                forwardRenderer.setCamera(shadowCam, shadowCam.renderTarget, true);

                // render mesh instances
                this.submitCasters(lightRenderData.visibleCasters, light);

                DebugGraphics.popGpuMarker(device);
            }

            // VSM blur
            if (light._isVsm && light._vsmBlurSize > 1) {

                // all non-clustered and directional lights support vsm
                const isClustered = this.forwardRenderer.scene.clusteredLightingEnabled;
                if (!isClustered || type === LIGHTTYPE_DIRECTIONAL) {
                    this.applyVsmBlur(light, camera);
                }
            }

            this.restoreRenderState(device);

            DebugGraphics.popGpuMarker(device);
        }
    }

    getVsmBlurShader(isVsm8, blurMode, filterSize) {

        let blurShader = (isVsm8 ? this.blurPackedVsmShader : this.blurVsmShader)[blurMode][filterSize];
        if (!blurShader) {
            this.blurVsmWeights[filterSize] = gaussWeights(filterSize);

            const blurVS = shaderChunks.fullscreenQuadVS;
            let blurFS = "#define SAMPLES " + filterSize + "\n";
            if (isVsm8) {
                blurFS += this.blurPackedVsmShaderCode[blurMode];
            } else {
                blurFS += this.blurVsmShaderCode[blurMode];
            }
            const blurShaderName = "blurVsm" + blurMode + "" + filterSize + "" + isVsm8;
            blurShader = createShaderFromCode(this.device, blurVS, blurFS, blurShaderName);

            if (isVsm8) {
                this.blurPackedVsmShader[blurMode][filterSize] = blurShader;
            } else {
                this.blurVsmShader[blurMode][filterSize] = blurShader;
            }
        }

        return blurShader;
    }

    applyVsmBlur(light, camera) {

        const device = this.device;

        DebugGraphics.pushGpuMarker(device, "VSM");

        const lightRenderData = light.getRenderData(light._type === LIGHTTYPE_DIRECTIONAL ? camera : null, 0);
        const shadowCam = lightRenderData.shadowCamera;
        const origShadowMap = shadowCam.renderTarget;

        // temporary render target for blurring
        // TODO: this is probably not optimal and shadow map could have depth buffer on in addition to color buffer,
        // and for blurring only one buffer is needed.
        const tempShadowMap = this.shadowMapCache.get(device, light);
        const tempRt = tempShadowMap.renderTargets[0];

        const isVsm8 = light._shadowType === SHADOW_VSM8;
        const blurMode = light.vsmBlurMode;
        const filterSize = light._vsmBlurSize;
        const blurShader = this.getVsmBlurShader(isVsm8, blurMode, filterSize);

        blurScissorRect.z = light._shadowResolution - 2;
        blurScissorRect.w = blurScissorRect.z;

        // Blur horizontal
        this.sourceId.setValue(origShadowMap.colorBuffer);
        pixelOffset[0] = 1 / light._shadowResolution;
        pixelOffset[1] = 0;
        this.pixelOffsetId.setValue(pixelOffset);
        if (blurMode === BLUR_GAUSSIAN) this.weightId.setValue(this.blurVsmWeights[filterSize]);
        drawQuadWithShader(device, tempRt, blurShader, null, blurScissorRect);

        // Blur vertical
        this.sourceId.setValue(tempRt.colorBuffer);
        pixelOffset[1] = pixelOffset[0];
        pixelOffset[0] = 0;
        this.pixelOffsetId.setValue(pixelOffset);
        drawQuadWithShader(device, origShadowMap, blurShader, null, blurScissorRect);

        // return the temporary shadow map back to the cache
        this.shadowMapCache.add(light, tempShadowMap);

        DebugGraphics.popGpuMarker(device);
    }
}

export { ShadowRenderer };
