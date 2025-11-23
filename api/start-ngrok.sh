#!/bin/bash

# Скрипт для запуска ngrok туннеля
# Использование: ./start-ngrok.sh [порт]

PORT=${1:-8080}

echo "🚀 Запускаю ngrok туннель на порту $PORT..."
echo ""
echo "После запуска вы увидите URL вида:"
echo "   Forwarding  https://xxxx.ngrok-free.app -> http://localhost:$PORT"
echo ""
echo "Скопируйте этот URL и обновите его в коде:"
echo "   ./update-bypass-url.sh https://xxxx.ngrok-free.app"
echo ""
echo "Нажмите Ctrl+C чтобы остановить ngrok"
echo ""

ngrok http $PORT

