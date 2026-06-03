// Выполняется ВНУТРИ встроенного сайта (в основном мире, до скриптов страницы).
// Скрывает признаки Electron/автоматизации. На доменах Google прикидываемся
// Firefox (Google пускает Firefox, но режет встроенный Chromium); на остальных
// сайтах — обычным Chrome на Windows (так проходит Cloudflare и др.).

const CHROME_MAJOR = '130'; // Chromium в Electron 33
const FIREFOX_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0';

function def(obj: any, prop: string, getter: () => any) {
  try {
    Object.defineProperty(obj, prop, { get: getter, configurable: true });
  } catch {}
}

(function stealth() {
  const host = location.hostname || '';
  const isGoogle =
    host === 'google.com' || host.endsWith('.google.com') || host === 'accounts.youtube.com';

  // Признак автоматизации убираем везде.
  def(navigator, 'webdriver', () => false);
  try {
    // @ts-ignore
    delete (Navigator.prototype as any).webdriver;
  } catch {}

  if (isGoogle) {
    // === Профиль Firefox (консистентно с UA-заголовком) ===
    def(navigator, 'userAgent', () => FIREFOX_UA);
    def(navigator, 'appVersion', () => '5.0 (Windows)');
    def(navigator, 'vendor', () => '');
    def(navigator, 'platform', () => 'Win32');
    def(navigator, 'oscpu', () => 'Windows NT 10.0; Win64; x64');
    def(navigator, 'productSub', () => '20100101');
    def(navigator, 'languages', () => ['ru-RU', 'ru', 'en-US', 'en']);
    // Firefox НЕ поддерживает userAgentData и window.chrome — убираем.
    try {
      Object.defineProperty(navigator, 'userAgentData', { get: () => undefined, configurable: true });
    } catch {}
    try {
      delete (window as any).chrome;
    } catch {}
    return;
  }

  // === Профиль Chrome (для всех остальных сайтов) ===
  const brands = [
    { brand: 'Chromium', version: CHROME_MAJOR },
    { brand: 'Google Chrome', version: CHROME_MAJOR },
    { brand: 'Not?A_Brand', version: '99' },
  ];
  try {
    const w = window as any;
    if (!w.chrome) w.chrome = { runtime: {}, app: { isInstalled: false }, csi() {}, loadTimes() {} };
  } catch {}
  def(navigator, 'userAgentData', () => ({
    brands,
    mobile: false,
    platform: 'Windows',
    getHighEntropyValues: async () => ({
      architecture: 'x86',
      bitness: '64',
      brands,
      mobile: false,
      model: '',
      platform: 'Windows',
      platformVersion: '15.0.0',
      uaFullVersion: `${CHROME_MAJOR}.0.0.0`,
      fullVersionList: brands.map((b) => ({ brand: b.brand, version: `${b.version}.0.0.0` })),
      wow64: false,
    }),
    toJSON: () => ({ brands, mobile: false, platform: 'Windows' }),
  }));
  def(navigator, 'languages', () => ['ru-RU', 'ru', 'en-US', 'en']);
  try {
    const w = window as any;
    delete w.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete w.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete w.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  } catch {}
})();
