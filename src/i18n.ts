import { useStore, type Lang } from './store/useStore';

type Dict = Record<string, Record<Lang, string>>;

const D: Dict = {
  // ---- Навигация ----
  'nav.ai': { ru: 'ИИ Хаб', en: 'AI Hub', de: 'KI-Hub' },
  'nav.search': { ru: 'Поиск', en: 'Search', de: 'Suche' },
  'nav.work': { ru: 'Рабочее', en: 'Workspace', de: 'Arbeit' },
  'nav.tools': { ru: 'Утилиты', en: 'Tools', de: 'Tools' },
  'nav.settings': { ru: 'Настройки', en: 'Settings', de: 'Einstellungen' },
  'nav.panel': { ru: 'Панель', en: 'Panel', de: 'Panel' },

  // ---- Боковая панель / заголовки утилит ----
  'side.utils': { ru: 'Утилиты', en: 'Utilities', de: 'Werkzeuge' },
  'side.notes': { ru: 'Быстрые заметки', en: 'Quick notes', de: 'Schnellnotizen' },
  'side.prompts': { ru: 'Менеджер промптов', en: 'Prompt manager', de: 'Prompt-Manager' },
  'side.translator': { ru: 'Переводчик', en: 'Translator', de: 'Übersetzer' },
  'side.currency': { ru: 'Конвертер валют', en: 'Currency', de: 'Währungen' },
  'side.passgen': { ru: 'Генератор паролей', en: 'Password generator', de: 'Passwort-Generator' },
  'side.vault': { ru: 'Сейф паролей', en: 'Password vault', de: 'Passwort-Tresor' },

  // ---- Общее ----
  'c.copy': { ru: 'Копировать', en: 'Copy', de: 'Kopieren' },
  'c.copied': { ru: '✓ Скопировано', en: '✓ Copied', de: '✓ Kopiert' },
  'c.cancel': { ru: 'Отмена', en: 'Cancel', de: 'Abbrechen' },
  'c.save': { ru: 'Сохранить', en: 'Save', de: 'Speichern' },
  'c.clear': { ru: 'Очистить', en: 'Clear', de: 'Leeren' },

  // ---- Заметки ----
  'notes.ph': { ru: 'Быстрые заметки (сохраняются автоматически)…', en: 'Quick notes (auto-saved)…', de: 'Schnellnotizen (auto-gespeichert)…' },
  'notes.saved': { ru: 'Автосохранение', en: 'Auto-saved', de: 'Auto-gespeichert' },
  'notes.chars': { ru: 'симв.', en: 'chars', de: 'Zeichen' },

  // ---- Промпты ----
  'pm.name': { ru: 'Название (необязательно)', en: 'Title (optional)', de: 'Titel (optional)' },
  'pm.text': { ru: 'Текст промпта…', en: 'Prompt text…', de: 'Prompt-Text…' },
  'pm.add': { ru: '+ Добавить', en: '+ Add', de: '+ Hinzufügen' },
  'pm.empty': { ru: 'Пока нет сохранённых промптов.', en: 'No saved prompts yet.', de: 'Noch keine Prompts.' },

  // ---- Переводчик ----
  'tr.ph': { ru: 'Текст для перевода…', en: 'Text to translate…', de: 'Text zum Übersetzen…' },
  'tr.go': { ru: 'Перевести', en: 'Translate', de: 'Übersetzen' },
  'tr.going': { ru: 'Перевожу…', en: 'Translating…', de: 'Übersetze…' },
  'tr.err': { ru: 'Ошибка перевода (проверь интернет).', en: 'Translation error (check internet).', de: 'Übersetzungsfehler (Internet prüfen).' },
  'tr.auto': { ru: 'Авто', en: 'Auto', de: 'Auto' },

  // ---- Валюты ----
  'cur.loading': { ru: 'загрузка…', en: 'loading…', de: 'lädt…' },
  'cur.updated': { ru: 'обновлено', en: 'updated', de: 'aktualisiert' },
  'cur.failed': { ru: 'не удалось получить курсы', en: 'failed to fetch rates', de: 'Kurse fehlgeschlagen' },
  'cur.swap': { ru: 'Поменять местами', en: 'Swap', de: 'Tauschen' },
  'cur.refresh': { ru: 'Обновить', en: 'Refresh', de: 'Aktualisieren' },
  'cur.chartNA': { ru: 'график для этой пары недоступен', en: 'chart unavailable for this pair', de: 'Diagramm für dieses Paar nicht verfügbar' },
  'cur.h1': { ru: '1 час', en: '1H', de: '1 Std' },
  'cur.d1': { ru: '1 день', en: '1D', de: '1 Tag' },
  'cur.y1': { ru: '1 год', en: '1Y', de: '1 Jahr' },

  // ---- Генератор паролей ----
  'pg.empty': { ru: 'выбери хотя бы один набор', en: 'select at least one set', de: 'mind. einen Satz wählen' },
  'pg.length': { ru: 'длина', en: 'length', de: 'Länge' },
  'pg.regen': { ru: '↻ Сгенерировать', en: '↻ Generate', de: '↻ Generieren' },
  'pg.lower': { ru: 'строчные', en: 'lowercase', de: 'Kleinbuchst.' },
  'pg.upper': { ru: 'ЗАГЛАВНЫЕ', en: 'UPPERCASE', de: 'GROSSBUCHST.' },
  'pg.digits': { ru: 'цифры', en: 'digits', de: 'Ziffern' },
  'pg.symbols': { ru: 'символы', en: 'symbols', de: 'Symbole' },

  // ---- Сейф ----
  'v.unavailable': { ru: 'Сейф доступен только в среде Electron.', en: 'Vault is only available in Electron.', de: 'Tresor nur in Electron verfügbar.' },
  'v.noenc': { ru: '⚠ Системное шифрование недоступно — данные без шифрования.', en: '⚠ OS encryption unavailable — data stored unencrypted.', de: '⚠ OS-Verschlüsselung nicht verfügbar — Daten unverschlüsselt.' },
  'v.site': { ru: 'Сайт (напр. chatgpt.com)', en: 'Site (e.g. chatgpt.com)', de: 'Seite (z. B. chatgpt.com)' },
  'v.login': { ru: 'Логин / email', en: 'Login / email', de: 'Login / E-Mail' },
  'v.password': { ru: 'Пароль', en: 'Password', de: 'Passwort' },
  'v.add': { ru: '+ Добавить', en: '+ Add', de: '+ Hinzufügen' },
  'v.import': { ru: '⬆ Импорт из браузера (CSV)', en: '⬆ Import from browser (CSV)', de: '⬆ Aus Browser importieren (CSV)' },
  'v.empty': { ru: 'Сейф пуст. Добавь запись или импортируй CSV.', en: 'Vault is empty. Add an entry or import CSV.', de: 'Tresor leer. Eintrag hinzufügen oder CSV importieren.' },
  'v.howto': { ru: 'Как перенести пароли из Chrome', en: 'How to import passwords from Chrome', de: 'Passwörter aus Chrome importieren' },
  'v.howtoText': {
    ru: 'Chrome → Настройки → Менеджер паролей → «⋮» → Экспорт → сохрани CSV. Затем нажми «Импорт».',
    en: 'Chrome → Settings → Password Manager → “⋮” → Export → save CSV. Then click “Import”.',
    de: 'Chrome → Einstellungen → Passwortmanager → „⋮“ → Exportieren → CSV speichern. Dann „Import“.',
  },

  // ---- Статус-бар ----
  'sb.active': { ru: 'Активен', en: 'Active', de: 'Aktiv' },
  'sb.error': { ru: 'Ошибка', en: 'Error', de: 'Fehler' },
  'sb.checking': { ru: 'проверка…', en: 'checking…', de: 'prüfe…' },
  'sb.probe': { ru: 'проба', en: 'probe', de: 'Test' },

  // ---- AI Hub ----
  'ah.back': { ru: 'Назад', en: 'Back', de: 'Zurück' },
  'ah.fwd': { ru: 'Вперёд', en: 'Forward', de: 'Vorwärts' },
  'ah.reload': { ru: 'Обновить', en: 'Reload', de: 'Neu laden' },
  'ah.addr': { ru: 'Введите URL или запрос…', en: 'Enter URL or search…', de: 'URL oder Suche eingeben…' },
  'ah.find': { ru: 'Поиск по странице (Ctrl+F)', en: 'Find on page (Ctrl+F)', de: 'Auf Seite suchen (Strg+F)' },
  'ah.split': { ru: 'Сплит-экран (2 сайта рядом)', en: 'Split screen (2 sites)', de: 'Geteilter Bildschirm (2 Seiten)' },
  'ah.full': { ru: 'Во весь экран', en: 'Fullscreen', de: 'Vollbild' },
  'ah.more': { ru: 'Ещё', en: 'More', de: 'Mehr' },
  'ah.autofill': { ru: '🔑 Автозаполнение', en: '🔑 Autofill', de: '🔑 Auto-Ausfüllen' },
  'ah.bookmarkAdd': { ru: '★ В закладки', en: '★ Bookmark', de: '★ Lesezeichen' },
  'ah.bookmarks': { ru: '☰ Закладки', en: '☰ Bookmarks', de: '☰ Lesezeichen' },
  'ah.translate': { ru: '🌐 Перевод страницы', en: '🌐 Translate page', de: '🌐 Seite übersetzen' },
  'ah.reader': { ru: '📖 Режим чтения', en: '📖 Reader mode', de: '📖 Lesemodus' },
  'ah.mute': { ru: '🔊 Заглушить', en: '🔊 Mute', de: '🔊 Stumm' },
  'ah.unmute': { ru: '🔇 Вкл. звук', en: '🔇 Unmute', de: '🔇 Ton an' },
  'ah.voice': { ru: '🎙️ Голосовой ввод', en: '🎙️ Voice input', de: '🎙️ Spracheingabe' },
  'ah.unload': { ru: '⏏ Выгрузить сайт', en: '⏏ Unload site', de: '⏏ Seite entladen' },
  'ah.addSite': { ru: 'Добавить свой сайт', en: 'Add your site', de: 'Eigene Seite hinzufügen' },
  'ah.siteAddr': { ru: 'адрес сайта', en: 'site address', de: 'Seitenadresse' },
  'ah.siteName': { ru: 'имя (необяз.)', en: 'name (optional)', de: 'Name (optional)' },
  'ah.noBookmarks': { ru: 'Закладок пока нет. Жми ★', en: 'No bookmarks yet. Press ★', de: 'Keine Lesezeichen. ★ drücken' },
  'ah.inMemory': { ru: 'в памяти', en: 'in memory', de: 'im Speicher' },
  'ah.willLoad': { ru: 'будет загружен', en: 'will load', de: 'wird geladen' },
  'ah.deleteSite': { ru: 'Удалить сайт', en: 'Delete site', de: 'Seite löschen' },
  'ah.hideSite': { ru: 'Скрыть с панели (вернуть в Настройках)', en: 'Hide from bar (restore in Settings)', de: 'Ausblenden (in Einstellungen zurück)' },
  'ah.muteSite': { ru: 'Заглушить', en: 'Mute', de: 'Stumm' },
  'ah.unmuteSite': { ru: 'Включить звук', en: 'Unmute', de: 'Ton an' },
  'ah.unloadSite': { ru: 'Выгрузить из памяти', en: 'Unload from memory', de: 'Aus Speicher entladen' },
  'ah.unloaded': { ru: 'выгружен из памяти', en: 'unloaded from memory', de: 'aus Speicher entladen' },
  'ah.load': { ru: 'Загрузить', en: 'Load', de: 'Laden' },
  'ah.failLoad': { ru: 'Не удалось загрузить', en: 'Failed to load', de: 'Laden fehlgeschlagen' },
  'ah.retry': { ru: '↻ Повторить', en: '↻ Retry', de: '↻ Wiederholen' },
  'ah.findPh': { ru: 'Поиск на странице…', en: 'Find on page…', de: 'Auf Seite suchen…' },
  'ah.notElectron': { ru: 'Встроенный браузер доступен только в среде Electron.', en: 'Embedded browser only available in Electron.', de: 'Eingebetteter Browser nur in Electron.' },
  'ah.voiceNA': { ru: 'Голосовой ввод недоступен в этой среде.', en: 'Voice input unavailable in this environment.', de: 'Spracheingabe hier nicht verfügbar.' },
  'ah.noVault': { ru: 'Нет сохранённого пароля для этого сайта.', en: 'No saved password for this site.', de: 'Kein gespeichertes Passwort für diese Seite.' },

  // ---- Поиск (вкладка) ----
  'se.home': { ru: 'На главную Google', en: 'Google home', de: 'Google-Startseite' },
  'se.ph': { ru: 'Поиск в Google или адрес сайта…', en: 'Search Google or enter URL…', de: 'Google-Suche oder URL…' },

  // ---- Настройки ----
  'set.appearance': { ru: 'Оформление', en: 'Appearance', de: 'Darstellung' },
  'set.theme.dark': { ru: '🌑 Тёмная', en: '🌑 Dark', de: '🌑 Dunkel' },
  'set.theme.light': { ru: '☀️ Светлая', en: '☀️ Light', de: '☀️ Hell' },
  'set.theme.cyber': { ru: '🌃 Киберпанк', en: '🌃 Cyberpunk', de: '🌃 Cyberpunk' },
  'set.theme.blackhole': { ru: '🕳️ Чёрная дыра', en: '🕳️ Black Hole', de: '🕳️ Schwarzes Loch' },
  'set.gradSave': { ru: 'Сохранить градиент', en: 'Save gradient', de: 'Verlauf speichern' },
  'set.gradSaved': { ru: 'Мои градиенты', en: 'My gradients', de: 'Meine Verläufe' },
  'set.hotkeys': { ru: 'Горячие клавиши', en: 'Hotkeys', de: 'Tastenkürzel' },
  'set.hkHint': { ru: 'Нажми на сочетание и задай своё. Esc — отмена.', en: 'Click a shortcut and set your own. Esc to cancel.', de: 'Klicke auf ein Kürzel und lege ein eigenes fest. Esc bricht ab.' },
  'set.hkPress': { ru: 'Нажми клавиши…', en: 'Press keys…', de: 'Tasten drücken…' },
  'set.hkReset': { ru: 'Сбросить по умолчанию', en: 'Reset to defaults', de: 'Zurücksetzen' },
  'hk.tabAI': { ru: 'Вкладка: ИИ', en: 'Tab: AI', de: 'Tab: KI' },
  'hk.tabSearch': { ru: 'Вкладка: Поиск', en: 'Tab: Search', de: 'Tab: Suche' },
  'hk.tabWork': { ru: 'Вкладка: Рабочее', en: 'Tab: Workspace', de: 'Tab: Arbeit' },
  'hk.tabTools': { ru: 'Вкладка: Утилиты', en: 'Tab: Tools', de: 'Tab: Tools' },
  'hk.tabSettings': { ru: 'Вкладка: Настройки', en: 'Tab: Settings', de: 'Tab: Einstellungen' },
  'hk.fullscreen': { ru: 'Полный экран', en: 'Fullscreen', de: 'Vollbild' },
  'hk.find': { ru: 'Поиск по странице', en: 'Find in page', de: 'Auf Seite suchen' },
  'hk.split': { ru: 'Сплит-экран', en: 'Split screen', de: 'Splitscreen' },
  'hk.nav': { ru: 'Левая панель', en: 'Left panel', de: 'Linke Leiste' },
  'hk.sidebar': { ru: 'Правая панель', en: 'Right panel', de: 'Rechte Leiste' },
  'hk.topbar': { ru: 'Верхний бар', en: 'Top bar', de: 'Obere Leiste' },
  'upd.title': { ru: 'Доступно обновление', en: 'Update available', de: 'Update verfügbar' },
  'upd.download': { ru: 'Скачать', en: 'Download', de: 'Herunterladen' },
  'upd.later': { ru: 'Позже', en: 'Later', de: 'Später' },
  'set.gradients': { ru: 'Градиенты (фон и панели)', en: 'Gradients (background & bars)', de: 'Verläufe (Hintergrund & Leisten)' },
  'set.accent': { ru: 'Цвет акцента / градиента', en: 'Accent / gradient color', de: 'Akzent-/Verlauffarbe' },
  'set.language': { ru: 'Язык интерфейса', en: 'Interface language', de: 'Sprache' },
  'set.adblockTitle': { ru: 'Блокировщик рекламы', en: 'Ad blocker', de: 'Werbeblocker' },
  'set.adblockLabel': { ru: 'Блокировать рекламу и трекеры', en: 'Block ads and trackers', de: 'Werbung und Tracker blockieren' },
  'set.sysmon': { ru: 'Системный монитор', en: 'System monitor', de: 'Systemmonitor' },
  'set.ram': { ru: 'ОЗУ', en: 'RAM', de: 'RAM' },
  'set.cpu': { ru: 'ЦП', en: 'CPU', de: 'CPU' },
  'set.procs': { ru: 'процессов', en: 'processes', de: 'Prozesse' },
  'set.network': { ru: 'Сеть · Xbox DNS', en: 'Network · Xbox DNS', de: 'Netzwerk · Xbox DNS' },
  'set.status': { ru: 'Статус', en: 'Status', de: 'Status' },
  'set.active': { ru: 'Активен', en: 'Active', de: 'Aktiv' },
  'set.error': { ru: 'Ошибка', en: 'Error', de: 'Fehler' },
  'set.recheck': { ru: 'Проверить', en: 'Re-check', de: 'Prüfen' },
  'set.cookies': { ru: 'Данные и куки', en: 'Data & cookies', de: 'Daten & Cookies' },
  'set.clearCookies': { ru: '🍪 Очистить куки', en: '🍪 Clear cookies', de: '🍪 Cookies löschen' },
  'set.clearAll': { ru: '🧹 Очистить все данные', en: '🧹 Clear all data', de: '🧹 Alle Daten löschen' },
  'set.aiSites': { ru: 'Сайты ИИ на панели', en: 'AI sites in the bar', de: 'KI-Seiten in der Leiste' },
  'set.aiSitesHint': {
    ru: 'Сними галочку, чтобы скрыть сайт с верхней панели (можно вернуть в любой момент).',
    en: 'Uncheck to hide a site from the top bar (restore anytime).',
    de: 'Abwählen, um eine Seite auszublenden (jederzeit wiederherstellbar).',
  },
};

export function useT() {
  const lang = useStore((s) => s.lang);
  return (key: string): string => D[key]?.[lang] ?? D[key]?.ru ?? key;
}
