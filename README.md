# NeuroHub

Десктопный хаб: встроенный браузер для веб-версий ИИ и Spotify (через Xbox DNS),
плюс набор утилит. Electron + React + TypeScript + Tailwind.

## ▶ Как открыть

Двойной клик по файлу:

```
!!! ЗАПУСТИТЬ NEUROHUB - ОТКРОЙ МЕНЯ !!!.bat
```

Он запускает готовое приложение `release\win-unpacked\NeuroHub.exe`.
(Можно открывать и сам exe напрямую — он в папке `release\win-unpacked`.)

## Если менял код

Запусти `(для разработки) Пересобрать.bat` — пересоберёт приложение.

## Структура

```
electron/   главный процесс: окно, Xbox-DoH DNS (dns.ts), IPC, preload
shared/     общие константы (адреса DNS, список сервисов ИИ)
src/        интерфейс React: вкладки (ИИ/Музыка/Утилиты/Настройки) + виджеты
release/    собранное приложение (NeuroHub.exe)
```

## Сеть (Xbox DNS)

Весь трафик встроенного браузера резолвится через Xbox DoH
`https://xbox-dns.ru/dns-query` (режим `automatic` в `electron/dns.ts`).
DNS меняет только разрешение имён и не скрывает реальный IP.
