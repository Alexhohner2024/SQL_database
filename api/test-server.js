// Простой HTTP сервер для тестирования API
// Запуск: node test-server.js
// Затем откройте: http://localhost:3000/api/parse?plate=АА1234ВВ

const http = require('http');
const url = require('url');
const handler = require('./parse.js');

const PORT = 3000;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  
  // Обработка запросов к /api/parse
  if (parsedUrl.pathname === '/api/parse') {
    const mockReq = {
      method: req.method,
      query: parsedUrl.query
    };
    
    const mockRes = {
      statusCode: 200,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        res.writeHead(this.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
      }
    };
    
    try {
      await handler(mockReq, mockRes);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }, null, 2));
    }
  } else if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
    // Простая HTML страница для тестирования
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Тест API Parse</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        input { padding: 10px; width: 200px; font-size: 16px; }
        button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
        #result { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .loading { color: #666; }
        .success { color: green; }
        .error { color: red; }
        pre { background: #fff; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🧪 Тест API Parse</h1>
    <div>
        <input type="text" id="plate" placeholder="Номер автомобиля (например: АА1234ВВ)" />
        <button onclick="testAPI()">Проверить</button>
    </div>
    <div id="result"></div>
    
    <script>
        async function testAPI() {
            const plate = document.getElementById('plate').value;
            const resultDiv = document.getElementById('result');
            
            if (!plate) {
                resultDiv.innerHTML = '<p class="error">Введите номер автомобиля</p>';
                return;
            }
            
            resultDiv.innerHTML = '<p class="loading">⏳ Запрос выполняется, это может занять несколько минут...</p>';
            
            try {
                const startTime = Date.now();
                const response = await fetch(\`/api/parse?plate=\${encodeURIComponent(plate)}\`);
                const data = await response.json();
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                
                let html = \`<h3>Результат (время: \${duration} сек)</h3>\`;
                
                if (data.error) {
                    html += \`<p class="error">❌ Ошибка: \${data.error}</p>\`;
                } else if (data.hasInsurance) {
                    html += \`<p class="success">✅ Страховка найдена</p>\`;
                    html += \`<p><strong>Номер полиса:</strong> \${data.policyNumber || 'Не найден'}</p>\`;
                    html += \`<p><strong>Компания:</strong> \${data.company}</p>\`;
                    html += \`<p><strong>Дата окончания:</strong> \${data.expiryDate || 'Не определена'}</p>\`;
                } else {
                    html += \`<p class="error">❌ Страховка не найдена</p>\`;
                }
                
                html += '<h4>Полный ответ:</h4>';
                html += \`<pre>\${JSON.stringify(data, null, 2)}</pre>\`;
                
                resultDiv.innerHTML = html;
            } catch (error) {
                resultDiv.innerHTML = \`<p class="error">❌ Ошибка: \${error.message}</p>\`;
            }
        }
        
        // Enter для отправки
        document.getElementById('plate').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                testAPI();
            }
        });
    </script>
</body>
</html>
    `);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Тестовый сервер запущен на http://localhost:${PORT}`);
  console.log(`📝 Пример запроса: http://localhost:${PORT}/api/parse?plate=АА1234ВВ`);
  console.log(`🌐 Или откройте браузер: http://localhost:${PORT}`);
});

