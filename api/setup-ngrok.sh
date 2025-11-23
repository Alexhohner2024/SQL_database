#!/bin/bash

# Скрипт для настройки ngrok
# Использование: ./setup-ngrok.sh [порт]

PORT=${1:-8080}

echo "🔧 Настройка ngrok"
echo ""
echo "Шаг 1: Получите authtoken"
echo "1. Откройте: https://dashboard.ngrok.com/get-started/your-authtoken"
echo "2. Скопируйте ваш authtoken"
echo ""
read -p "Введите ваш authtoken: " AUTHTOKEN

if [ -z "$AUTHTOKEN" ]; then
    echo "❌ Authtoken не введен"
    exit 1
fi

echo ""
echo "🔑 Настраиваю ngrok..."
ngrok config add-authtoken "$AUTHTOKEN"

if [ $? -eq 0 ]; then
    echo "✅ Authtoken настроен!"
    echo ""
    echo "🚀 Запускаю ngrok туннель на порту $PORT..."
    echo "   (Нажмите Ctrl+C чтобы остановить)"
    echo ""
    echo "После запуска скопируйте URL вида: https://xxxx.ngrok-free.app"
    echo ""
    ngrok http $PORT
else
    echo "❌ Ошибка при настройке authtoken"
    exit 1
fi

