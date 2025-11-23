// Тестовый скрипт для проверки работы parse.js
// Запуск: node test-parse.js

const handler = require('./parse.js');

// Создаем мок объекты req и res
function createMockReq(plate) {
  return {
    method: 'GET',
    query: { plate }
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    
    json: function(data) {
      this.body = data;
      console.log('\n=== РЕЗУЛЬТАТ ===');
      console.log(JSON.stringify(data, null, 2));
      return this;
    }
  };
  
  return res;
}

// Функция для тестирования
async function test(plateNumber) {
  console.log(`\n🧪 Тестирование для номера: ${plateNumber}`);
  console.log('⏳ Ожидайте, это может занять несколько минут...\n');
  
  const req = createMockReq(plateNumber);
  const res = createMockRes();
  
  const startTime = Date.now();
  
  try {
    await handler(req, res);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n⏱️  Время выполнения: ${duration} секунд`);
    
    if (res.statusCode === 200 && res.body) {
      console.log('\n✅ Успешно!');
      if (res.body.expiryDate) {
        console.log(`📅 Дата окончания полиса: ${res.body.expiryDate}`);
      }
      if (res.body.policyNumber) {
        console.log(`🔢 Номер полиса: ${res.body.policyNumber}`);
      }
      if (res.body.company && res.body.company !== 'Not found') {
        console.log(`🏢 Компания: ${res.body.company}`);
      }
    } else {
      console.log('\n❌ Ошибка или страховка не найдена');
    }
  } catch (error) {
    console.error('\n❌ Ошибка при выполнении:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Получаем номер из аргументов командной строки
const plateNumber = process.argv[2];

if (!plateNumber) {
  console.log('Использование: node test-parse.js <НОМЕР_АВТОМОБИЛЯ>');
  console.log('Пример: node test-parse.js АА1234ВВ');
  console.log('\nИли запустите интерактивный режим:');
  console.log('node test-parse.js');
  process.exit(1);
}

// Запускаем тест
test(plateNumber);
