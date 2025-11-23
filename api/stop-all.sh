#!/bin/bash

# Скрипт для остановки всех серверов и процессов проекта

echo "🛑 Останавливаю все серверы и процессы..."

# Останавливаем API сервер (порт 3000)
API_PID=$(lsof -ti:3000)
if [ -n "$API_PID" ]; then
    echo "   Останавливаю API сервер (PID: $API_PID)..."
    kill $API_PID 2>/dev/null
    sleep 1
    if kill -0 $API_PID 2>/dev/null; then
        kill -9 $API_PID 2>/dev/null
    fi
    echo "   ✅ API сервер остановлен"
else
    echo "   ℹ️  API сервер не запущен"
fi

# Останавливаем Bypass сервер (порт 8080)
BYPASS_PID=$(lsof -ti:8080)
if [ -n "$BYPASS_PID" ]; then
    echo "   Останавливаю Bypass сервер (PID: $BYPASS_PID)..."
    kill $BYPASS_PID 2>/dev/null
    sleep 1
    if kill -0 $BYPASS_PID 2>/dev/null; then
        kill -9 $BYPASS_PID 2>/dev/null
    fi
    echo "   ✅ Bypass сервер остановлен"
else
    echo "   ℹ️  Bypass сервер не запущен"
fi

# Останавливаем процессы node server.js
NODE_SERVERS=$(ps aux | grep "node.*server.js" | grep -v grep | awk '{print $2}')
if [ -n "$NODE_SERVERS" ]; then
    echo "   Останавливаю процессы Node.js серверов..."
    echo "$NODE_SERVERS" | while read pid; do
        if [ -n "$pid" ]; then
            kill $pid 2>/dev/null
        fi
    done
    sleep 1
    echo "$NODE_SERVERS" | while read pid; do
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null
        fi
    done
    echo "   ✅ Node.js серверы остановлены"
else
    echo "   ℹ️  Node.js серверы не найдены"
fi

# Останавливаем ngrok
NGROK_PID=$(ps aux | grep "ngrok http" | grep -v grep | awk '{print $2}')
if [ -n "$NGROK_PID" ]; then
    echo "   Останавливаю ngrok (PID: $NGROK_PID)..."
    kill $NGROK_PID 2>/dev/null
    sleep 1
    if kill -0 $NGROK_PID 2>/dev/null; then
        kill -9 $NGROK_PID 2>/dev/null
    fi
    echo "   ✅ ngrok остановлен"
else
    echo "   ℹ️  ngrok не запущен"
fi

# Останавливаем процессы Chrome/Chromium, запущенные через Puppeteer
# (те, что имеют --remote-debugging-port или другие признаки Puppeteer)
PUPPETEER_CHROME=$(ps aux | grep -i "chrome.*--remote-debugging\|chromium.*--remote-debugging" | grep -v grep | awk '{print $2}')
if [ -n "$PUPPETEER_CHROME" ]; then
    echo "   Останавливаю процессы Chrome/Chromium от Puppeteer..."
    echo "$PUPPETEER_CHROME" | while read pid; do
        if [ -n "$pid" ]; then
            kill $pid 2>/dev/null
        fi
    done
    sleep 1
    echo "$PUPPETEER_CHROME" | while read pid; do
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null
        fi
    done
    echo "   ✅ Chrome/Chromium процессы остановлены"
else
    echo "   ℹ️  Chrome/Chromium процессы от Puppeteer не найдены"
fi

echo ""
echo "✅ Все процессы остановлены!"
echo ""
echo "Проверка портов:"
lsof -ti:3000 > /dev/null 2>&1 && echo "   ⚠️  Порт 3000 все еще занят" || echo "   ✅ Порт 3000 свободен"
lsof -ti:8080 > /dev/null 2>&1 && echo "   ⚠️  Порт 8080 все еще занят" || echo "   ✅ Порт 8080 свободен"

