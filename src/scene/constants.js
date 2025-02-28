/**
 * Subtract the color of the source fragment from the destination fragment and write the result to
 * the frame buffer.
 *
 * @type {number}
 */
export const BLEND_SUBTRACTIVE = 0;

/**
 * Add the color of the source fragment to the destination fragment and write the result to the
 * frame buffer.
 *
 * @type {number}
 */
export const BLEND_ADDITIVE = 1;

/**
 * Enable simple translucency for materials such as glass. This is equivalent to enabling a source
 * blend mode of {@link BLENDMODE_SRC_ALPHA} and a destination blend mode of
 * {@link BLENDMODE_ONE_MINUS_SRC_ALPHA}.
 *
 * @type {number}
 */
export const BLEND_NORMAL = 2;

/**
 * Disable blending.
 *
 * @type {number}
 */
export const BLEND_NONE = 3;

/**
 * Similar to {@link BLEND_NORMAL} expect the source fragment is assumed to have already been
 * multiplied by the source alpha value.
 *
 * @type {number}
 */
export const BLEND_PREMULTIPLIED = 4;

/**
 * Multiply the color of the source fragment by the color of the destination fragment and write the
 * result to the frame buffer.
 *
 * @type {number}
 */
export const BLEND_MULTIPLICATIVE = 5;

/**
 * Same as {@link BLEND_ADDITIVE} except the source RGB is multiplied by the source alpha.
 *
 * @type {number}
 */
export const BLEND_ADDITIVEALPHA = 6;

/**
 * Multiplies colors and doubles the result.
 *
 * @type {number}
 */
export const BLEND_MULTIPLICATIVE2X = 7;

/**
 * Softer version of additive.
 *
 * @type {number}
 */
export const BLEND_SCREEN = 8;

/**
 * Minimum color. Check app.graphicsDevice.extBlendMinmax for support.
 *
 * @type {number}
 */
export const BLEND_MIN = 9;

/**
 * Maximum color. Check app.graphicsDevice.extBlendMinmax for support.
 *
 * @type {number}
 */
export const BLEND_MAX = 10;

/**
 * No fog is applied to the scene.
 *
 * @type {string}
 */
export const FOG_NONE = 'none';

/**
 * Fog rises linearly from zero to 1 between a start and end depth.
 *
 * @type {string}
 */
export const FOG_LINEAR = 'linear';

/**
 * Fog rises according to an exponential curve controlled by a density value.
 *
 * @type {string}
 */
export const FOG_EXP = 'exp';

/**
 * Fog rises according to an exponential curve controlled by a density value.
 *
 * @type {string}
 */
export const FOG_EXP2 = 'exp2';

/**
 * No Fresnel.
 *
 * @type {number}
 */
export const FRESNEL_NONE = 0;

/**
 * Schlick's approximation of Fresnel.
 *
 * @type {number}
 */
export const FRESNEL_SCHLICK = 2;

// Legacy
export const LAYER_HUD = 0;
export const LAYER_GIZMO = 1;
export const LAYER_FX = 2;
// 3 - 14 are custom user layers
export const LAYER_WORLD = 15;

// New layers
/**
 * The world layer.
 *
 * @type {number}
 */
export const LAYERID_WORLD = 0;

/**
 * The depth layer.
 *
 * @type {number}
 */
export const LAYERID_DEPTH = 1;

/**
 * The skybox layer.
 *
 * @type {number}
 */
export const LAYERID_SKYBOX = 2;

/**
 * The immediate layer.
 *
 * @type {number}
 */
export const LAYERID_IMMEDIATE = 3;

/**
 * The UI layer.
 *
 * @type {number}
 */
export const LAYERID_UI = 4;

/**
 * Directional (global) light source.
 *
 * @type {number}
 */
export const LIGHTTYPE_DIRECTIONAL = 0;

/**
 * Omni-directional (local) light source.
 *
 * @type {number}
 */
export const LIGHTTYPE_OMNI = 1;

/**
 * Point (local) light source.
 *
 * @type {number}
 * @ignore
 */
export const LIGHTTYPE_POINT = LIGHTTYPE_OMNI;

/**
 * Spot (local) light source.
 *
 * @type {number}
 */
export const LIGHTTYPE_SPOT = 2;

/**
 * Infinitesimally small point light source shape.
 *
 * @type {number}
 */
export const LIGHTSHAPE_PUNCTUAL = 0;

/**
 * Rectangle shape of light source.
 *
 * @type {number}
 */
export const LIGHTSHAPE_RECT = 1;

/**
 * Disk shape of light source.
 *
 * @type {number}
 */
export const LIGHTSHAPE_DISK = 2;

/**
 * Sphere shape of light source.
 *
 * @type {number}
 */
export const LIGHTSHAPE_SPHERE = 3;

/**
 * Linear distance falloff model for light attenuation.
 *
 * @type {number}
 */
export const LIGHTFALLOFF_LINEAR = 0;

/**
 * Inverse squared distance falloff model for light attenuation.
 *
 * @type {number}
 */
export const LIGHTFALLOFF_INVERSESQUARED = 1;

/**
 * Render depth (color-packed on WebGL 1.0), can be used for PCF 3x3 sampling.
 *
 * @type {number}
 */
export const SHADOW_PCF3 = 0;
export const SHADOW_DEPTH = 0; // alias for SHADOW_PCF3 for backwards compatibility

/**
 * Render packed variance shadow map. All shadow receivers must also cast shadows for this mode to
 * work correctly.
 *
 * @type {number}
 */
export const SHADOW_VSM8 = 1;

/**
 * Render 16-bit exponential variance shadow map. Requires OES_texture_half_float extension. Falls
 * back to {@link SHADOW_VSM8}, if not supported.
 *
 * @type {number}
 */
export const SHADOW_VSM16 = 2;

/**
 * Render 32-bit exponential variance shadow map. Requires OES_texture_float extension. Falls back
 * to {@link SHADOW_VSM16}, if not supported.
 *
 * @type {number}
 */
export const SHADOW_VSM32 = 3;

/**
 * Render depth buffer only, can be used for hardware-accelerated PCF 5x5 sampling. Requires
 * WebGL 2. Falls back to {@link SHADOW_PCF3} on WebGL 1.
 *
 * @type {number}
 */
export const SHADOW_PCF5 = 4;

/**
 * Render depth (color-packed on WebGL 1.0), can be used for PCF 1x1 sampling.
 *
 * @type {number}
 */
export const SHADOW_PCF1 = 5;

// non-public: number of supported depth shadow modes
export const SHADOW_COUNT = 6;

/**
 * map of engine SHADOW__*** to a string representation
 *
 * @type {object}
 * @ignore
 */
export const shadowTypeToString = {};
shadowTypeToString[SHADOW_PCF3] = "PCF3";
shadowTypeToString[SHADOW_VSM8] = "VSM8";
shadowTypeToString[SHADOW_VSM16] = "VSM16";
shadowTypeToString[SHADOW_VSM32] = "VSM32";
shadowTypeToString[SHADOW_PCF5] = "PCF5";
shadowTypeToString[SHADOW_PCF1] = "PCF1";

/**
 * Box filter.
 *
 * @type {number}
 */
export const BLUR_BOX = 0;

/**
 * Gaussian filter. May look smoother than box, but requires more samples.
 *
 * @type {number}
 */
export const BLUR_GAUSSIAN = 1;

/**
 * No sorting, particles are drawn in arbitrary order. Can be simulated on GPU.
 *
 * @type {number}
 */
export const PARTICLESORT_NONE = 0;

/**
 * Sorting based on distance to the camera. CPU only.
 *
 * @type {number}
 */
export const PARTICLESORT_DISTANCE = 1;

/**
 * Newer particles are drawn first. CPU only.
 *
 * @type {number}
 */
export const PARTICLESORT_NEWER_FIRST = 2;

/**
 * Older particles are drawn first. CPU only.
 *
 * @type {number}
 */
export const PARTICLESORT_OLDER_FIRST = 3;

export const PARTICLEMODE_GPU = 0;
export const PARTICLEMODE_CPU = 1;

/**
 * Box shape parameterized by emitterExtents. Initial velocity is directed towards local Z axis.
 *
 * @type {number}
 */
export const EMITTERSHAPE_BOX = 0;

/**
 * Sphere shape parameterized by emitterRadius. Initial velocity is directed outwards from the
 * center.
 *
 * @type {number}
 */
export const EMITTERSHAPE_SPHERE = 1;

/**
 * Particles are facing camera.
 *
 * @type {number}
 */
export const PARTICLEORIENTATION_SCREEN = 0;

/**
 * User defines world space normal (particleNormal) to set planes orientation.
 *
 * @type {number}
 */
export const PARTICLEORIENTATION_WORLD = 1;

/**
 * Similar to previous, but the normal is affected by emitter(entity) transformation.
 *
 * @type {number}
 */
export const PARTICLEORIENTATION_EMITTER = 2;

/**
 * A perspective camera projection where the frustum shape is essentially pyramidal.
 *
 * @type {number}
 */
export const PROJECTION_PERSPECTIVE = 0;

/**
 * An orthographic camera projection where the frustum shape is essentially a cuboid.
 *
 * @type {number}
 */
export const PROJECTION_ORTHOGRAPHIC = 1;

/**
 * Render mesh instance as solid geometry.
 *
 * @type {number}
 */
export const RENDERSTYLE_SOLID = 0;

/**
 * Render mesh instance as wireframe.
 *
 * @type {number}
 */
export const RENDERSTYLE_WIREFRAME = 1;

/**
 * Render mesh instance as points.
 *
 * @type {number}
 */
export const RENDERSTYLE_POINTS = 2;

/**
 * The cube map is treated as if it is infinitely far away.
 *
 * @type {number}
 */
export const CUBEPROJ_NONE = 0;

/**
 * The cube map is box-projected based on a world space axis-aligned bounding box.
 *
 * @type {number}
 */
export const CUBEPROJ_BOX = 1;

/**
 * Phong without energy conservation. You should only use it as a backwards compatibility with
 * older projects.
 *
 * @type {number}
 */
export const SPECULAR_PHONG = 0;

/**
 * Energy-conserving Blinn-Phong.
 *
 * @type {number}
 */
export const SPECULAR_BLINN = 1;

/**
 * Multiply together the primary and secondary colors.
 *
 * @type {string}
 */
export const DETAILMODE_MUL = 'mul';

/**
 * Add together the primary and secondary colors.
 *
 * @type {string}
 */
export const DETAILMODE_ADD = 'add';

/**
 * Softer version of {@link DETAILMODE_ADD}.
 *
 * @name DETAILMODE_SCREEN
 */
export const DETAILMODE_SCREEN = 'screen';

/**
 * Multiplies or screens the colors, depending on the primary color.
 *
 * @type {string}
 */
export const DETAILMODE_OVERLAY = 'overlay';

/**
 * Select whichever of the primary and secondary colors is darker, component-wise.
 *
 * @type {string}
 */
export const DETAILMODE_MIN = 'min';

/**
 * Select whichever of the primary and secondary colors is lighter, component-wise.
 *
 * @type {string}
 */
export const DETAILMODE_MAX = 'max';

/**
 * No gamma correction.
 *
 * @type {number}
 */
export const GAMMA_NONE = 0;

/**
 * Apply sRGB gamma correction.
 *
 * @type {number}
 */
export const GAMMA_SRGB = 1;

/**
 * Apply sRGB (fast) gamma correction.
 *
 * @type {number}
 * @deprecated
 */
export const GAMMA_SRGBFAST = 2; // deprecated

/**
 * Apply sRGB (HDR) gamma correction.
 *
 * @type {number}
 */
export const GAMMA_SRGBHDR = 3;

/**
 * Linear tonemapping.
 *
 * @type {number}
 */
export const TONEMAP_LINEAR = 0;

/**
 * Filmic tonemapping curve.
 *
 * @type {number}
 */
export const TONEMAP_FILMIC = 1;

/**
 * Hejl filmic tonemapping curve.
 *
 * @type {number}
 */
export const TONEMAP_HEJL = 2;

/**
 * ACES filmic tonemapping curve.
 *
 * @type {number}
 */
export const TONEMAP_ACES = 3;

/**
 * ACES v2 filmic tonemapping curve.
 *
 * @type {number}
 */
export const TONEMAP_ACES2 = 4;

/**
 * No specular occlusion.
 *
 * @type {number}
 */
export const SPECOCC_NONE = 0;

/**
 * Use AO directly to occlude specular.
 *
 * @type {number}
 */
export const SPECOCC_AO = 1;

/**
 * Modify AO based on material glossiness/view angle to occlude specular.
 *
 * @type {number}
 */
export const SPECOCC_GLOSSDEPENDENT = 2;

// 16 bits for shader defs
export const SHADERDEF_NOSHADOW = 1;
export const SHADERDEF_SKIN = 2;
export const SHADERDEF_UV0 = 4;
export const SHADERDEF_UV1 = 8;
export const SHADERDEF_VCOLOR = 16;
export const SHADERDEF_INSTANCING = 32;
export const SHADERDEF_LM = 64;
export const SHADERDEF_DIRLM = 128;
export const SHADERDEF_SCREENSPACE = 256;
export const SHADERDEF_TANGENTS = 512;
export const SHADERDEF_MORPH_POSITION = 1024;
export const SHADERDEF_MORPH_NORMAL = 2048;
export const SHADERDEF_MORPH_TEXTURE_BASED = 4096;
export const SHADERDEF_LMAMBIENT = 8192; // lightmaps contain ambient

export const LINEBATCH_WORLD = 0;
export const LINEBATCH_OVERLAY = 1;
export const LINEBATCH_GIZMO = 2;

/**
 * The shadow map is not to be updated.
 *
 * @type {number}
 */
export const SHADOWUPDATE_NONE = 0;

/**
 * The shadow map is regenerated this frame and not on subsequent frames.
 *
 * @type {number}
 */
export const SHADOWUPDATE_THISFRAME = 1;

/**
 * The shadow map is regenerated every frame.
 *
 * @type {number}
 */
export const SHADOWUPDATE_REALTIME = 2;

export const SORTKEY_FORWARD = 0;
export const SORTKEY_DEPTH = 1;

// flags used on the mask property of the Light, and also on mask property of the MeshInstance
export const MASK_AFFECT_DYNAMIC = 1;
export const MASK_AFFECT_LIGHTMAPPED = 2;
export const MASK_BAKE = 4;

/**
 * Render shaded materials with gamma correction and tonemapping.
 *
 * @type {number}
 */
export const SHADER_FORWARD = 0;

/**
 * Render shaded materials without gamma correction and tonemapping.
 *
 * @type {number}
 */
export const SHADER_FORWARDHDR = 1;

/**
 * Render RGBA-encoded depth value.
 *
 * @type {number}
 */
export const SHADER_DEPTH = 2;

// next are undocumented
export const SHADER_SHADOW = 3; // PCF3
// 4 = VSM8,
// 5 = VSM16,
// 6 = VSM32,
// 7 = PCF5,
// 8 = PCF3 POINT
// 9 = VSM8 POINT,
// 10 = VSM16 POINT,
// 11 = VSM32 POINT,
// 12 = PCF5 POINT
// 13 = PCF3 SPOT
// 14 = VSM8 SPOT,
// 15 = VSM16 SPOT,
// 16 = VSM32 SPOT,
// 17 = PCF5 SPOT
export const SHADER_PICK = 18;

/**
 * This mode renders a sprite as a simple quad.
 *
 * @type {number}
 */
export const SPRITE_RENDERMODE_SIMPLE = 0;

/**
 * This mode renders a sprite using 9-slicing in 'sliced' mode. Sliced mode stretches the top and
 * bottom regions of the sprite horizontally, the left and right regions vertically and the middle
 * region both horizontally and vertically.
 *
 * @type {number}
 */
export const SPRITE_RENDERMODE_SLICED = 1;

/**
 * This mode renders a sprite using 9-slicing in 'tiled' mode. Tiled mode tiles the top and bottom
 * regions of the sprite horizontally, the left and right regions vertically and the middle region
 * both horizontally and vertically.
 *
 * @type {number}
 */
export const SPRITE_RENDERMODE_TILED = 2;

/**
 * Single color lightmap.
 *
 * @type {number}
 */
export const BAKE_COLOR = 0;

/**
 * Single color lightmap + dominant light direction (used for bump/specular).
 *
 * @type {number}
 */
export const BAKE_COLORDIR = 1;

/**
 * Center of view.
 *
 * @type {number}
 */
export const VIEW_CENTER = 0;

/**
 * Left of view. Only used in stereo rendering.
 *
 * @type {number}
 */
export const VIEW_LEFT = 1;

/**
 * Right of view. Only used in stereo rendering.
 *
 * @type {number}
 */
export const VIEW_RIGHT = 2;

/**
 * No sorting is applied. Mesh instances are rendered in the same order they were added to a layer.
 *
 * @type {number}
 */
export const SORTMODE_NONE = 0;

/**
 * Mesh instances are sorted based on {@link MeshInstance#drawOrder}.
 *
 * @type {number}
 */
export const SORTMODE_MANUAL = 1;

/**
 * Mesh instances are sorted to minimize switching between materials and meshes to improve
 * rendering performance.
 *
 * @type {number}
 */
export const SORTMODE_MATERIALMESH = 2;

/**
 * Mesh instances are sorted back to front. This is the way to properly render many
 * semi-transparent objects on different depth, one is blended on top of another.
 *
 * @type {number}
 */
export const SORTMODE_BACK2FRONT = 3;

/**
 * Mesh instances are sorted front to back. Depending on GPU and the scene, this option may give
 * better performance than {@link SORTMODE_MATERIALMESH} due to reduced overdraw.
 *
 * @type {number}
 */
export const SORTMODE_FRONT2BACK = 4;

/**
 * Provide custom functions for sorting drawcalls and calculating distance.
 *
 * @type {number}
 * @ignore
 */
export const SORTMODE_CUSTOM = 5;

export const COMPUPDATED_INSTANCES = 1;
export const COMPUPDATED_LIGHTS = 2;
export const COMPUPDATED_CAMERAS = 4;
export const COMPUPDATED_BLEND = 8;

/**
 * Automatically set aspect ratio to current render target's width divided by height.
 *
 * @type {number}
 */
export const ASPECT_AUTO = 0;

/**
 * Use the manual aspect ratio value.
 *
 * @type {number}
 */
export const ASPECT_MANUAL = 1;

/**
 * Horizontal orientation.
 *
 * @type {number}
 */
export const ORIENTATION_HORIZONTAL = 0;

/**
 * Vertical orientation.
 *
 * @type {number}
 */
export const ORIENTATION_VERTICAL = 1;
