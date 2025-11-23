#!/bin/bash

# Скрипт для управления тестовым сервером
# Использование: ./server-control.sh [start|stop|restart|status]

PORT=3000
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_SCRIPT="$SCRIPT_DIR/test-server.js"

# Функция для получения PID процесса на порту
get_pid() {
    lsof -ti:$PORT 2>/dev/null
}

# Функция для проверки статуса
status() {
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "✅ Сервер запущен"
        echo "   PID: $PID"
        echo "   Порт: $PORT"
        echo "   URL: http://localhost:$PORT"
        
        # Проверяем, что это именно наш сервер
        if ps -p $PID > /dev/null 2>&1; then
            echo "   Процесс активен"
            return 0
        else
            echo "   ⚠️  Процесс не найден"
            return 1
        fi
    else
        echo "❌ Сервер не запущен"
        return 1
    fi
}

# Функция для остановки
stop() {
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "🛑 Останавливаю сервер (PID: $PID)..."
        kill $PID 2>/dev/null
        sleep 1
        
        # Проверяем, остановился ли
        if [ -z "$(get_pid)" ]; then
            echo "✅ Сервер остановлен"
        else
            echo "⚠️  Сервер не остановился, пробую принудительно..."
            kill -9 $PID 2>/dev/null
            sleep 1
            if [ -z "$(get_pid)" ]; then
                echo "✅ Сервер остановлен принудительно"
            else
                echo "❌ Не удалось остановить сервер"
                return 1
            fi
        fi
    else
        echo "ℹ️  Сервер не запущен"
    fi
}

# Функция для запуска
start() {
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "⚠️  Сервер уже запущен (PID: $PID)"
        echo "   Используйте './server-control.sh restart' для перезапуска"
        return 1
    fi
    
    if [ ! -f "$SERVER_SCRIPT" ]; then
        echo "❌ Файл $SERVER_SCRIPT не найден"
        return 1
    fi
    
    echo "🚀 Запускаю сервер..."
    cd "$SCRIPT_DIR"
    node "$SERVER_SCRIPT" > /dev/null 2>&1 &
    
    sleep 2
    
    PID=$(get_pid)
    if [ -n "$PID" ]; then
        echo "✅ Сервер запущен"
        echo "   PID: $PID"
        echo "   URL: http://localhost:$PORT"
        echo "   Логи: проверьте вывод процесса"
    else
        echo "❌ Не удалось запустить сервер"
        return 1
    fi
}

# Функция для перезапуска
restart() {
    stop
    sleep 1
    start
}

# Основная логика
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    *)
        echo "Использование: $0 {start|stop|restart|status}"
        echo ""
        echo "Команды:"
        echo "  start   - Запустить сервер"
        echo "  stop    - Остановить сервер"
        echo "  restart - Перезапустить сервер"
        echo "  status  - Показать статус сервера"
        exit 1
        ;;
esac

exit $?

