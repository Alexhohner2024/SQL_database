# Настройка Bypass сервера

## Проблема: Ngrok туннель offline

Текущий URL `https://ab3b913c8b71.ngrok-free.app` неактивен (ERR_NGROK_3200).

## Решение 1: Запустить ngrok локально

### Шаг 1: Установите ngrok (если еще не установлен)

```bash
# Через Homebrew
brew install ngrok/ngrok/ngrok

# Или скачайте с https://ngrok.com/download
```

### Шаг 2: Запустите ваш bypass сервер локально

Убедитесь, что ваш bypass сервер (который обрабатывает запросы к policy.mtsbu.ua) запущен на локальном порту, например `localhost:8080`.

### Шаг 3: Запустите ngrok туннель

```bash
ngrok http 8080
```

(Замените `8080` на порт, на котором работает ваш bypass сервер)

### Шаг 4: Получите новый URL

После запуска ngrok вы увидите что-то вроде:
```
Forwarding  https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:8080
```

Скопируйте этот URL.

### Шаг 5: Обновите URL в коде

Откройте `parse.js` и замените строку ~101:
```javascript
const bypassServer = process.env.BYPASS_SERVER || 'https://xxxx-xxxx-xxxx.ngrok-free.app';
```

Или установите через переменную окружения:
```bash
export BYPASS_SERVER="https://xxxx-xxxx-xxxx.ngrok-free.app"
```

## Решение 2: Использовать переменную окружения

Вы можете установить URL bypass сервера через переменную окружения без изменения кода:

```bash
# В текущей сессии терминала
export BYPASS_SERVER="https://your-new-ngrok-url.ngrok-free.app"

# Затем запустите сервер
cd "/Users/alex/Documents/GitHub/Pdf Monitor1/SQL_database/api"
node test-server.js
```

Или создайте файл `.env` (если используете dotenv):
```
BYPASS_SERVER=https://your-new-ngrok-url.ngrok-free.app
```

## Решение 3: Проверить актуальный URL ngrok

Если ngrok уже запущен, проверьте URL:

### Через веб-интерфейс:
Откройте http://localhost:4040 в браузере

### Через API:
```bash
curl http://localhost:4040/api/tunnels | python3 -m json.tool
```

Или:
```bash
curl http://localhost:4040/api/tunnels | grep -o '"public_url":"[^"]*"' | head -1
```

## Проверка работы bypass сервера

После настройки проверьте, что endpoint работает:

```bash
curl "https://your-ngrok-url.ngrok-free.app/form_submit?url=https://policy.mtsbu.ua&plate=TEST123"
```

Если получаете 404, проверьте:
1. Правильный ли endpoint? (может быть `/api/form_submit` или другой)
2. Запущен ли ваш bypass сервер?
3. Правильный ли порт в ngrok?

## Альтернатива: Прямой доступ (если не нужен bypass)

Если ваш сервер может напрямую обращаться к policy.mtsbu.ua, можно временно убрать bypass и делать запросы напрямую (но это может не работать из-за CORS/защиты сайта).

