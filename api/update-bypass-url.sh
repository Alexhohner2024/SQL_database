#!/bin/bash

# Скрипт для обновления URL bypass сервера
# Использование: ./update-bypass-url.sh [новый-url]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARSE_FILE="$SCRIPT_DIR/parse.js"

if [ -z "$1" ]; then
    echo "Использование: $0 <новый-url-ngrok>"
    echo ""
    echo "Пример:"
    echo "  $0 https://abc123.ngrok-free.app"
    echo ""
    echo "Или установите через переменную окружения:"
    echo "  export BYPASS_SERVER='https://abc123.ngrok-free.app'"
    exit 1
fi

NEW_URL="$1"

# Проверяем формат URL
if [[ ! "$NEW_URL" =~ ^https?:// ]]; then
    echo "❌ Ошибка: URL должен начинаться с http:// или https://"
    exit 1
fi

# Обновляем URL в файле
if [ -f "$PARSE_FILE" ]; then
    # Используем sed для замены (macOS совместимый)
    sed -i '' "s|const bypassServer = process.env.BYPASS_SERVER || 'https://[^']*'|const bypassServer = process.env.BYPASS_SERVER || '${NEW_URL}'|" "$PARSE_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ URL обновлен в файле parse.js"
        echo "   Новый URL: $NEW_URL"
        echo ""
        echo "💡 Совет: Перезапустите сервер для применения изменений:"
        echo "   ./server-control.sh restart"
    else
        echo "❌ Ошибка при обновлении файла"
        exit 1
    fi
else
    echo "❌ Файл parse.js не найден"
    exit 1
fi

