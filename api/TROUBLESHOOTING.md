# Решение проблем

## Ошибка 404: Form submit failed

Если вы получаете ошибку `Form submit failed: 404`, это означает, что bypass сервер недоступен или endpoint не существует.

### Решения:

#### 1. Проверьте URL bypass сервера

URL ngrok может измениться при каждом перезапуске. Проверьте актуальный URL:

```bash
# Если у вас запущен ngrok локально
curl http://localhost:4040/api/tunnels
```

Или проверьте в веб-интерфейсе ngrok: http://localhost:4040

#### 2. Обновите URL в коде

Откройте файл `parse.js` и найдите строку:
```javascript
const bypassServer = 'https://ab3b913c8b71.ngrok-free.app';
```

Замените на актуальный URL вашего ngrok сервера.

#### 3. Используйте переменную окружения

Вы можете установить URL через переменную окружения:

```bash
export BYPASS_SERVER="https://your-new-ngrok-url.ngrok-free.app"
node test-server.js
```

Или создайте файл `.env`:
```
BYPASS_SERVER=https://your-new-ngrok-url.ngrok-free.app
```

#### 4. Проверьте, что bypass сервер запущен

Убедитесь, что ваш bypass сервер (который обрабатывает `/form_submit`) запущен и доступен.

Проверьте доступность:
```bash
curl "https://your-ngrok-url.ngrok-free.app/form_submit?url=test&plate=test"
```

Если получаете 404, значит:
- Endpoint `/form_submit` не существует на сервере
- Нужно проверить правильный endpoint в документации вашего bypass сервера

#### 5. Альтернатива: используйте другой bypass сервер

Если у вас есть другой сервер для обхода, обновите URL в коде.

## Другие ошибки

### Ошибка сети / таймаут
- Проверьте интернет-соединение
- Убедитесь, что bypass сервер доступен
- Проверьте, не блокирует ли файрвол запросы

### Страховка не найдена
- Убедитесь, что номер автомобиля правильный
- Проверьте, что на сайте policy.mtsbu.ua есть данные для этого номера

## Тестирование bypass сервера

Проверьте, что ваш bypass сервер работает:

```bash
# Проверка базового доступа
curl "https://your-ngrok-url.ngrok-free.app/"

# Проверка endpoint (если известен)
curl "https://your-ngrok-url.ngrok-free.app/form_submit?url=https://policy.mtsbu.ua&plate=TEST123"
```

