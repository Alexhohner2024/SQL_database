# Тестирование API Parse

## Способы тестирования

### 1. Через тестовый скрипт (рекомендуется для начала)

```bash
cd /Users/alex/Documents/GitHub/Pdf\ Monitor1/SQL_database/api
node test-parse.js АА1234ВВ
```

Где `АА1234ВВ` - номер автомобиля для проверки.

### 2. Через локальный HTTP сервер

```bash
cd /Users/alex/Documents/GitHub/Pdf\ Monitor1/SQL_database/api
node test-server.js
```

Затем откройте браузер: http://localhost:3000

Или сделайте запрос через curl:
```bash
curl "http://localhost:3000/api/parse?plate=АА1234ВВ"
```

### 3. Через curl напрямую (если API уже развернуто)

```bash
curl "https://your-api-domain.com/api/parse?plate=АА1234ВВ"
```

### 4. Через Postman или другой HTTP клиент

**GET запрос:**
```
GET /api/parse?plate=АА1234ВВ
```

## Формат ответа

### Успешный ответ (страховка найдена):
```json
{
  "plate": "АА1234ВВ",
  "company": "ПрАТ СК \"Універсальна\"",
  "policyNumber": "АА123456",
  "expiryDate": "2024-12-31",
  "hasInsurance": true,
  "debug": {
    "htmlLength": 15000,
    "found": true,
    "bypassWorked": true,
    "htmlSnippet": "..."
  }
}
```

### Страховка не найдена:
```json
{
  "plate": "АА1234ВВ",
  "company": "Not found",
  "policyNumber": null,
  "expiryDate": null,
  "hasInsurance": false,
  "debug": {
    "message": "No insurance found for current date"
  }
}
```

## Важные замечания

1. **Время выполнения**: Поиск даты окончания может занять несколько минут, так как выполняется бинарный поиск по датам с множественными запросами.

2. **Задержки**: Между запросами есть задержки (500ms) чтобы не перегружать сервер.

3. **Ограничения**: 
   - Поиск ограничен 2 годами назад
   - Поиск в будущем запрещен
   - Максимум 50 итераций бинарного поиска

4. **Требования**: 
   - Должен быть доступен bypass сервер: `https://ab3b913c8b71.ngrok-free.app`
   - Должен быть доступен целевой сайт: `https://policy.mtsbu.ua`

## Отладка

Если что-то не работает:

1. Проверьте, что bypass сервер доступен
2. Проверьте, что номер автомобиля корректный
3. Посмотрите на `debug.htmlSnippet` в ответе - там первые 2000 символов HTML
4. Проверьте логи на наличие ошибок

