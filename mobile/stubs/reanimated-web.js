// Web stub for react-native-reanimated
// All hooks and components return passthrough values for web compatibility

function noop() {}
function useSharedValue(initial) { return { value: initial }; }
function useAnimatedStyle(fn) { return fn(); }
function useAnimatedProps(fn) { return fn(); }
function useDerivedValue(fn) { return { value: fn() }; }
function useAnimatedRef() { return { current: null }; }
function useEvent(handler, deps) { return { register: noop, unregister: noop }; }
function useHandler(deps, handler) { return { onEvent: noop }; }
function useWorkletCallback(fn) { return fn; }
function useReducedMotion() { return false; }
function useAnimatedScrollHandler() { return {}; }
function useAnimatedSensor() { return { sensor: { value: {} }, unsubscribe: noop }; }
function useFrameCallback() { return { register: noop, unregister: noop, setActive: noop, setFlag: noop }; }
function useAnimatedKeyboard() { return { value: { height: 0 } }; }
function useScrollViewOffset() { return { value: 0 }; }

function withTiming() { return 0; }
function withSpring() { return 0; }
function withDecay() { return 0; }
function withRepeat() { return 0; }
function withSequence() { return 0; }
function withDelay() { return 0; }
function withClamp() { return 0; }
function cancelAnimation() {}
function defineAnimation() { return 0; }

function interpolate() { return 0; }
function interpolateColor() { return 0; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

function measure() { return { x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }; }
function dispatchCommand() {}
function scrollTo() {}
function setGestureState() {}
function setNativeProps() {}
function getRelativeCoords() { return { x: 0, y: 0 }; }

function runOnJS() { return function(fn) { return fn; }; }
function runOnUI() { return function(fn) { return fn; }; }
function createWorkletRuntime() { return { run: noop }; }
function runRuntime() {}
function makeMutable(val) { return { value: val }; }
function makeShareableCloneRecursive(val) { return val; }
function createAnimatedPropAdapter() { return {}; }

function processColor(color) { return 0; }
function isColor() { return false; }
function convertToRGBA() { return 'rgba(0,0,0,0)'; }

const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' };
const ColorSpace = { RGB: 'rgb', HSL: 'hsl' };

const Animated = {
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  createAnimatedComponent: function(C) { return C; },
};

const Easing = {
  linear: function(t) { return t; },
  ease: function(t) { return t; },
  bezier: function() { return function(t) { return t; }; },
  in: function(fn) { return fn; },
  out: function(fn) { return fn; },
  inOut: function(fn) { return fn; },
};

class BaseAnimationBuilder { static create() { return this; } }
class ComplexAnimationBuilder extends BaseAnimationBuilder {}
class Keyframe extends BaseAnimationBuilder {}

const FadeIn = { build: function() { return {}; } };
const FadeOut = FadeIn;
const FadeInRight = FadeIn;
const FadeInLeft = FadeIn;
const FadeInUp = FadeIn;
const FadeInDown = FadeIn;
const FadeOutRight = FadeOut;
const FadeOutLeft = FadeOut;
const FadeOutUp = FadeOut;
const FadeOutDown = FadeOut;

const SlideInRight = FadeIn;
const SlideInLeft = FadeIn;
const SlideOutRight = FadeOut;
const SlideOutLeft = FadeOut;
const SlideInUp = FadeIn;
const SlideInDown = FadeIn;
const SlideOutUp = FadeOut;
const SlideOutDown = FadeOut;

const ZoomIn = FadeIn;
const ZoomInRotate = FadeIn;
const ZoomInLeft = FadeIn;
const ZoomInRight = FadeIn;
const ZoomInUp = FadeIn;
const ZoomInDown = FadeIn;
const ZoomInEasyUp = FadeIn;
const ZoomInEasyDown = FadeIn;
const ZoomOut = FadeOut;
const ZoomOutRotate = FadeOut;
const ZoomOutLeft = FadeOut;
const ZoomOutRight = FadeOut;
const ZoomOutUp = FadeOut;
const ZoomOutDown = FadeOut;
const ZoomOutEasyUp = FadeOut;
const ZoomOutEasyDown = FadeOut;

const StretchInX = FadeIn;
const StretchInY = FadeIn;
const StretchOutX = FadeOut;
const StretchOutY = FadeOut;

const FlipInXUp = FadeIn;
const FlipInYLeft = FadeIn;
const FlipInXDown = FadeIn;
const FlipInYRight = FadeIn;
const FlipInEasyX = FadeIn;
const FlipInEasyY = FadeIn;
const FlipOutXUp = FadeOut;
const FlipOutYLeft = FadeOut;
const FlipOutXDown = FadeOut;
const FlipOutYRight = FadeOut;
const FlipOutEasyX = FadeOut;
const FlipOutEasyY = FadeOut;

const BounceIn = FadeIn;
const BounceInDown = FadeIn;
const BounceInUp = FadeIn;
const BounceInLeft = FadeIn;
const BounceInRight = FadeIn;
const BounceOut = FadeOut;
const BounceOutDown = FadeOut;
const BounceOutUp = FadeOut;
const BounceOutLeft = FadeOut;
const BounceOutRight = FadeOut;

module.exports = {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  useDerivedValue,
  useAnimatedRef,
  useEvent,
  useHandler,
  useWorkletCallback,
  useReducedMotion,
  useAnimatedScrollHandler,
  useAnimatedSensor,
  useFrameCallback,
  useAnimatedKeyboard,
  useScrollViewOffset,
  withTiming,
  withSpring,
  withDecay,
  withRepeat,
  withSequence,
  withDelay,
  withClamp,
  cancelAnimation,
  defineAnimation,
  interpolate,
  interpolateColor,
  clamp,
  measure,
  dispatchCommand,
  scrollTo,
  setGestureState,
  setNativeProps,
  getRelativeCoords,
  runOnJS,
  runOnUI,
  createWorkletRuntime,
  runRuntime,
  makeMutable,
  makeShareableCloneRecursive,
  createAnimatedPropAdapter,
  processColor,
  isColor,
  convertToRGBA,
  Extrapolation,
  ColorSpace,
  Animated,
  Easing,
  BaseAnimationBuilder,
  ComplexAnimationBuilder,
  Keyframe,
  FadeIn, FadeOut, FadeInRight, FadeInLeft, FadeInUp, FadeInDown,
  FadeOutRight, FadeOutLeft, FadeOutUp, FadeOutDown,
  SlideInRight, SlideInLeft, SlideOutRight, SlideOutLeft,
  SlideInUp, SlideInDown, SlideOutUp, SlideOutDown,
  ZoomIn, ZoomInRotate, ZoomInLeft, ZoomInRight, ZoomInUp, ZoomInDown,
  ZoomInEasyUp, ZoomInEasyDown, ZoomOut, ZoomOutRotate, ZoomOutLeft,
  ZoomOutRight, ZoomOutUp, ZoomOutDown, ZoomOutEasyUp, ZoomOutEasyDown,
  StretchInX, StretchInY, StretchOutX, StretchOutY,
  FlipInXUp, FlipInYLeft, FlipInXDown, FlipInYRight, FlipInEasyX, FlipInEasyY,
  FlipOutXUp, FlipOutYLeft, FlipOutXDown, FlipOutYRight, FlipOutEasyX, FlipOutEasyY,
  BounceIn, BounceInDown, BounceInUp, BounceInLeft, BounceInRight,
  BounceOut, BounceOutDown, BounceOutUp, BounceOutLeft, BounceOutRight,
};
