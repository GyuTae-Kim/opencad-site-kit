// 데모 페이지: 예제 앱 고르기, 화면 언어, 내 파일 열기, 이벤트 기록, 넣은 코드 보이기
const viewer = document.getElementById('viewer');
const log = document.getElementById('log');
const buttons = [...document.querySelectorAll('[data-app]')];
const language = document.getElementById('lang');

function say(text) {
  log.textContent = text;
}

/** 이 페이지가 쓴 스크립트 줄(판·무결성 값)과 지금 요소 */
function showCode() {
  const script = document.querySelector('script[src*="opencad-embed.js"]');
  const attrs = ['app', 'src', 'lang', 'loading']
    .filter((name) => viewer.hasAttribute(name))
    .map((name) => ` ${name}="${viewer.getAttribute(name)}"`)
    .join('') + (viewer.hasAttribute('sample') ? ' sample' : '');
  document.getElementById('code').textContent =
    `<script type="module"\n  src="${script.src}"\n  integrity="${script.integrity}"\n  crossorigin="anonymous"></script>\n\n` +
    `<opencad-viewer${attrs} style="height: 480px"></opencad-viewer>`;
}

function press(app) {
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.app === app));
}

await customElements.whenDefined('opencad-viewer');
const Viewer = customElements.get('opencad-viewer');

/** 파일 이름의 확장자로 앱(요소가 쓰는 표와 같음) */
function appFor(name) {
  const ext = /\.([^./\\]+)$/.exec(name)?.[1]?.toLowerCase();
  return Object.keys(Viewer.apps).find((key) => Viewer.apps[key].extensions.includes(ext)) ?? null;
}

for (const type of ['opencad-ready', 'opencad-done', 'opencad-error'])
  viewer.addEventListener(type, (event) => say(`${type} ${JSON.stringify(event.detail)}`));

for (const button of buttons)
  button.addEventListener('click', () => {
    viewer.setAttribute('sample', '');
    viewer.setAttribute('app', button.dataset.app);
    press(button.dataset.app);
    say('불러오는 중… Loading…');
    showCode();
  });

language.addEventListener('change', () => {
  viewer.setAttribute('lang', language.value);
  say('불러오는 중… Loading…');
  showCode();
});

document.getElementById('pick').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const app = appFor(file.name);
  if (!app) {
    say(`이 형식은 열지 않습니다 (unsupported): ${file.name}`);
    return;
  }
  viewer.removeAttribute('sample');
  viewer.setAttribute('app', app);
  press(app);
  say(`여는 중… Opening ${file.name}`);
  showCode();
  try {
    await viewer.open(file);
    say(`열었습니다 (opened): ${file.name}`);
  } catch (error) {
    say(`열지 못했습니다 (failed): ${error.message}`);
  }
});

document.getElementById('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById('code').textContent);
    say('코드를 복사했습니다 (copied).');
  } catch {
    say('복사하지 못했습니다. 코드를 직접 골라 복사해 주십시오.');
  }
});

showCode();
