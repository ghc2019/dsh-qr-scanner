# Vendored decoders

These files are unmodified copies of published packages, kept inside this bundle so the
plugin installs and runs without any runtime dependency resolution.

| Path | Source package | Version | License |
| --- | --- | --- | --- |
| `jsqr.js` | [`jsqr`](https://github.com/cozmo/jsQR) `dist/jsQR.js` | 1.4.0 | Apache-2.0 (`jsqr.LICENSE`) |
| `jpeg-decoder.js` | [`jpeg-js`](https://github.com/jpeg-js/jpeg-js) `lib/decoder.js` | 0.4.4 | Apache-2.0 (`jpeg-js.LICENSE`) |
| `pngjs/lib/*` | [`pngjs`](https://github.com/pngjs/pngjs) `lib/` | 7.0.0 | MIT (`pngjs/LICENSE`) |

`package.json` in this folder declares `"type": "commonjs"`, so the copies keep their
original CommonJS form while the rest of the bundle stays ESM.

The versions above are the ones installed in `qr-test/node_modules` when the copies were
taken; no source line was edited.
