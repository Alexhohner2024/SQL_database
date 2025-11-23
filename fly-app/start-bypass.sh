#!/bin/bash

# Скрипт для запуска bypass сервера и ngrok
# Использование: ./start-bypass.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=8080

echo "🚀 Запускаю bypass сервер на порту $PORT..."

# Запускаем сервер в фоне
cd "$SCRIPT_DIR"
node server.js > server.log 2>&1 &
SERVER_PID=$!

echo "✅ Bypass сервер запущен (PID: $SERVER_PID)"
echo "   Логи: $SCRIPT_DIR/server.log"
echo ""

# Ждем немного, чтобы сервер запустился
sleep 2

# Проверяем, что сервер запустился
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Ошибка при запуске сервера. Проверьте server.log"
    exit 1
fi

echo "🌐 Запускаю ngrok туннель..."
echo ""
echo "После запуска ngrok вы увидите URL вида:"
echo "   Forwarding  https://xxxx.ngrok-free.app -> http://localhost:$PORT"
echo ""
echo "Скопируйте этот URL и обновите его в parse.js:"
echo "   cd ../api"
echo "   ./update-bypass-url.sh https://xxxx.ngrok-free.app"
echo ""
echo "Нажмите Ctrl+C чтобы остановить ngrok (сервер продолжит работать)"
echo ""

# Запускаем ngrok
ngrok http $PORT

# После остановки ngrok, останавливаем и сервер
echo ""
echo "🛑 Останавливаю bypass сервер..."
kill $SERVER_PID 2>/dev/null

