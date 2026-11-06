/**
 * remotion.config.js  (Step 2)
 * Purpose : Global Remotion CLI/Studio defaults for every render (local + GitHub Action).
 * Exports : none (CommonJS config file, executed by the Remotion CLI).
 * Notes   : - Values here are DEFAULTS; flags passed by render.yml (--scale, --crf,
 *             --concurrency, --props ...) always override them.
 *           - Every call goes through safe() so a renamed/removed Config method
 *             only prints a warning instead of crashing the whole render.
 *           - No WebGL is used in this project (pure SVG/CSS), so the OpenGL
 *             renderer is left at Remotion's default (see the commented line below).
 */
const {Config} = require('@remotion/cli/config');

function safe(method, ...args) {
  if (Config && typeof Config[method] === 'function') {
    Config[method](...args);
  } else {
    console.warn('[remotion.config.js] Config.' + method + ' is not available - skipped');
  }
}

// Frames are rendered as JPEG (faster + smaller than PNG; the video has no transparency).
safe('setVideoImageFormat', 'jpeg');
safe('setJpegQuality', 92);

// Output container/codec defaults: H.264 + yuv420p is accepted by YouTube and Facebook.
safe('setCodec', 'h264');
safe('setPixelFormat', 'yuv420p');

// Re-running the Action must replace an existing out/<label>.mp4 without prompting.
safe('setOverwriteOutput', true);

// Concurrency is intentionally NOT set here: render.yml passes --concurrency=2 for the
// 2-vCPU runner; local Studio/CLI runs then use Remotion's automatic value.

// Google Fonts (Bengali subsets) can take a while to download on a cold runner.
// Default delayRender timeout is 30 s; give fonts/assets 2 minutes.
safe('setDelayRenderTimeoutInMilliseconds', 120000);

// Only if a CPU-only runner ever shows WebGL errors (not expected for this SVG project):
// safe('setChromiumOpenGlRenderer', 'angle');
