# Embed OpenCAD in your web page

[한국어](EMBED.md)

`<opencad-viewer>` puts an OpenCAD app inside your blog, portfolio or product page:

- **DWG/DXF** 2D CAD (`.dwg`, `.dxf`)
- **STEP** 3D viewer (`.step`, `.stp`, `.p21`, `.stpz`)
- **SketchUp** 3D viewer (`.skp`)
- **NC** toolpath viewer (`.nc`, `.gcode`, `.mpf`, `.h`, `.mpr`, `.pgi` and more)

You need one script tag and one element. There is no server to run, no account and no build step.
The script, this repository and the four app repositories are public under the MIT license.

## Quick start

```html
<script type="module"
  src="https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@v0.2.0/embed/opencad-embed.js"
  integrity="sha384-CJXDL5TstGA6j3akEHj32i+tZFlP/7O4j95pFlZZ/sjt4svlLy4THa7i8gapJu5u"
  crossorigin="anonymous"></script>

<opencad-viewer src="/files/bracket.step" lang="en" style="height: 520px"></opencad-viewer>
```

- The element picks the app from the file extension of `src`.
- Your page downloads `src` itself and hands the bytes to the app. The file must be on your own site or on a server that allows CORS.
- **The app UI is Korean by default.** Set `lang` to `en`, `ja`, `zh-CN` or `de` for another language.
- Size it with CSS. The default height is 480px, and the width follows the parent.
- `@v0.2.0` pins the version. Tags never move, so the URL always serves the same bytes and the `integrity` hash keeps matching.
  If the file differs by a single byte, the browser refuses to run it.
  When you upgrade, change the URL and the hash together:

  ```bash
  curl -sL <script URL> | openssl dgst -sha384 -binary | openssl base64 -A
  ```

## Choose an install method

| Your site | Method |
|---|---|
| You can add HTML (static site, blog theme, HTML block in a CMS) | [1. One script tag from the CDN](#quick-start) |
| You don't load scripts from outside CDNs | [2. Host the script yourself](#2-host-the-script-yourself) |
| A bundled web app (Vite, webpack, Next.js and so on) | [3. Install with npm](#3-install-with-npm) |
| You can't add scripts at all | [4. Plain iframe](#4-plain-iframe) |
| You want to serve the apps from your own server too | [5. Deploy the apps yourself](#5-deploy-the-apps-yourself) |

### 2. Host the script yourself

The element is a single file with no dependencies (12.6 KB, 4.8 KB gzipped). Download it and serve it from your site.

```bash
curl -L -o opencad-embed.js https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@v0.2.0/embed/opencad-embed.js
```

```html
<script type="module" src="/js/opencad-embed.js"></script>
```

Keep the copyright and permission notice from [LICENSE](../LICENSE) with the file, as the MIT license requires.
The apps themselves still load from `https://gyutae-kim.github.io/`.

### 3. Install with npm

The package isn't on the npm registry, so install it from the GitHub tag (git must be installed on the machine).

```bash
npm install "opencad-site-kit@github:GyuTae-Kim/opencad-site-kit#v0.2.0"
```

```js
import 'opencad-site-kit/embed';   // registers <opencad-viewer>; only this one file ends up in your bundle
```

- No runtime dependencies and no build step on install. `jsdom` and `vite` are optional peers and aren't installed.
- Type declarations are included, so `document.querySelector('opencad-viewer')` is typed as `OpenCadViewer` in TypeScript.
- Importing it during server-side rendering is safe. Outside a browser it doesn't register anything; the element renders in the browser.
- Listen for events with `addEventListener('opencad-done', …)` on the element. In React and similar frameworks, get the element through a ref.

### 4. Plain iframe

Where scripts aren't allowed (some blog editors), load an app page in an iframe. Visitors open their own files inside it.
To pass files in or get results back, use methods 1–3.

```html
<iframe src="https://gyutae-kim.github.io/opencad-step/en/" title="OpenCAD STEP viewer"
  allow="fullscreen; clipboard-write" style="width:100%;height:520px;border:0"></iframe>
```

App URLs are `https://gyutae-kim.github.io/` followed by `opencad-dwgdxf/`, `opencad-step/`, `opencad-skp/` or `opencad-nc/`.
For another language add `en/`, `ja/`, `zh-CN/` or `de/` after that. Korean has no language segment.

### 5. Deploy the apps yourself

Fork the app repositories, publish them (for example on GitHub Pages) and point the element at them with `base`:

```html
<opencad-viewer base="https://me.github.io/" src="/models/plan.dxf"></opencad-viewer>
<!-- loads https://me.github.io/opencad-dwgdxf/ -->
```

If you renamed a repository, change the element's app list after the script loads and before the element renders:

```js
import { OpenCadViewer, APPS } from './opencad-embed.js';
OpenCadViewer.apps = { ...APPS, dwgdxf: { ...APPS.dwgdxf, path: 'my-cad/' } };
```

In your fork, replace the analytics and language-URL settings in `site/i18n-core.mjs` and `src/app/main.ts` with your own
(see "다른 사이트에서 쓰기" in the [README](../README.md#다른-사이트에서-쓰기)).
Even if you leave them, analytics only turns on at `gyutae-kim.github.io`, so your visitors are never counted as OpenCAD visits.

## Let visitors open their own files

Give `app` without `src`, then call `open()` with the file the visitor picks.

```html
<input type="file" id="pick" accept=".dwg,.dxf">
<opencad-viewer id="viewer" app="dwgdxf" lang="en"></opencad-viewer>
<script type="module">
  const viewer = document.getElementById('viewer');
  document.getElementById('pick').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { await viewer.open(file); }                              // resolves when the app has opened it
    catch (error) { console.warn('Could not open', error.message); }  // unsupported, too-large, timeout …
  });
</script>
```

Without `app`, `open()` switches to whichever app handles the file's extension.

## Attributes, methods and events

| Attribute | Meaning |
|---|---|
| `src` | File your page downloads and passes to the app. **Same origin as your page, or a URL that allows CORS** |
| `app` | `dwgdxf`, `step`, `skp` or `nc`. If omitted, chosen from the extension of `name` or `src` |
| `name` | File name shown in the app (defaults to the last segment of `src`) |
| `lang` | App UI language: `ko` (default), `en`, `ja`, `zh-CN`, `de` |
| `base` | Where the apps live (default `https://gyutae-kim.github.io/`). Your own address if you deploy the apps yourself |
| `sample` | Opens the app's sample instead of a file (use with `app`) |
| `title` | Accessible name of the iframe (defaults to "OpenCAD STEP viewer" and so on) |

- `viewer.open(fileOrBlob, name?)` returns `Promise<void>`. It resolves when the app has finished opening the file and rejects with `Error(code)` if the app can't take it.
- `viewer.app` is the name of the app currently shown.
- Events bubble from the element: `opencad-ready` (`detail.accept`: extensions the app takes), `opencad-done` (`detail.id`), `opencad-error` (`detail.code`).

| `code` | Reason |
|---|---|
| `fetch-failed` | Your page couldn't download `src` (check the URL and CORS) |
| `unsupported` | The app doesn't open this format, or no app matches the extension |
| `too-large` | Larger than the app accepts at once (1 GiB) |
| `timeout` | The app didn't answer within 30 seconds (check the app URL and `base`). If the app becomes ready later, `opencad-ready` still fires and the `src` file is downloaded and opened then. Files passed with `open()` must be passed again after `opencad-ready` |
| `bad-request`, `open-failed` | The data was invalid, or the app failed while opening |

A broken or unreadable file is reported inside the app. `open()` still resolves in that case, because the app did finish handling it.
`open()` can also reject with `replaced` (the element switched to another app) or `disconnected` (the element was removed from the page).

## Where your files go

1. Your page downloads `src` itself, or uses the file you passed to `open()`.
2. It sends the bytes to the app in the iframe with `postMessage`, addressed to the app's origin, and only listens to replies from that origin.
3. The app opens the bytes in the browser. It calls no other address and sends the file's contents and name nowhere except back to your page.

Inside your page, the app turns off analytics, shows no consent banner and registers no service worker (offline mode, update prompts).
The browser keeps the app's storage, such as recent documents, separate for your site, so it never mixes with the OpenCAD site's own history.

## Browser support

The element works in Chrome and Edge 84+, Firefox 90+ and Safari 15+. Each app's README lists anything more it needs, such as WebGL.

## Message protocol (for custom hosts)

You only need this if you write your own host script instead of using the element.
Every message has the form `{ type, protocol: 1, … }`.
The app side is `embed/app.ts` (`acceptEmbeddedFiles`), and the host side is `embed/opencad-embed.js`.

| Direction | `type` | Contents |
|---|---|---|
| app → parent | `opencad:ready` | `accept`: extensions the app takes. Sent once when the app is ready, to any origin (it carries no file or URL), and again to the asker's origin on `opencad:ping` |
| parent → app | `opencad:ping` | Asks whether the app is ready |
| parent → app | `opencad:open` | `id` (up to 64 characters), `files: [{ name, data }]`. `data` is an `ArrayBuffer` or `Blob`, names contain no `/` or `\`, at most 32 files and 1 GiB |
| app → parent | `opencad:done` | `id`: the app has finished opening |
| app → parent | `opencad:error` | `id`, `code` (`bad-request`, `unsupported`, `too-large`, `open-failed`) |

The app only accepts messages from its direct parent (`window.parent`) and replies only to the origin that sent the message.
It passes on only the files whose extensions it accepts.

## License

MIT. See [LICENSE](../LICENSE).
