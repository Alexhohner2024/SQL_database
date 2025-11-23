// Функция для парсинга номера полиса из HTML
function parsePolicyNumber(html) {
  // Паттерны для поиска номера полиса (улучшенные)
  const patterns = [
    // Поліс № 233959185 (точный формат с сайта)
    /Поліс\s+№\s*([0-9]{6,15})/gi,
    /Поліс[:\s]*№[:\s]*([0-9]{6,15})/gi,
    // Номер полиса в различных форматах
    /Номер\s+поліса[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    /№\s+поліса[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    /Contract\s+№[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    /Договір[:\s]*№[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    // Поиск в HTML структуре (h2, div, span)
    /<h[1-6][^>]*>.*?Поліс[^<]*№[^<]*([0-9]{6,15})[^<]*<\/h[1-6]>/gi,
    /<div[^>]*>.*?Поліс[^<]*№[^<]*([0-9]{6,15})[^<]*<\/div>/gi,
    /<span[^>]*>.*?Поліс[^<]*№[^<]*([0-9]{6,15})[^<]*<\/span>/gi,
    // Поиск в таблицах и структурированных данных
    /<td[^>]*>\s*[Н№][^<]*поліса?[^<]*<\/td>\s*<td[^>]*>\s*([A-ZА-Я0-9\-]{5,30})\s*<\/td>/gi,
    /<th[^>]*>[Н№][^<]*поліса?[^<]*<\/th>\s*<td[^>]*>\s*([A-ZА-Я0-9\-]{5,30})\s*<\/td>/gi,
    // Поиск после текста "Поліс"
    /Поліс[^№]*№[^0-9]*([0-9]{6,15})/gi,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      const policyNumber = match[1].trim();
      if (policyNumber.length >= 5 && policyNumber.length <= 30) {
        return policyNumber;
      }
    }
  }

  // Дополнительный поиск - ищем последовательности цифр после "Поліс"
  const policyAfterText = html.match(/Поліс[^0-9]*([0-9]{6,15})/gi);
  if (policyAfterText) {
    const numberMatch = policyAfterText[0].match(/([0-9]{6,15})/);
    if (numberMatch && numberMatch[1]) {
      return numberMatch[1];
    }
  }

  // Дополнительный поиск - ищем последовательности букв и цифр, похожие на номера
  const generalPattern = /\b([A-ZА-Я]{2,5}[\s\-]?[0-9]{4,12}|[0-9]{4,12}[\s\-]?[A-ZА-Я]{2,5})\b/g;
  const matches = html.match(generalPattern);
  if (matches && matches.length > 0) {
    // Берем первый похожий на номер полиса
    for (const match of matches) {
      const cleaned = match.replace(/[\s\-]/g, '');
      if (cleaned.length >= 6 && cleaned.length <= 20) {
        return match.trim();
      }
    }
  }

  return null;
}

// Функция для парсинга названия страховой компании
function parseCompanyName(html) {
  let company = 'Not found';
  
  // Улучшенные паттерны для полного названия страховых компаний
  const patterns = [
    // АТ "СГ "ТАС" (приватне) - формат с сайта
    /АТ\s*"[^"]{1,20}"[^"]{0,30}"[^"]{0,30}"[^"]{0,30}\([^)]+\)/gi,
    /АТ\s*"[^"]{1,50}"\s*\([^)]+\)/gi,
    // Полные названия с кавычками
    /ПрАТ\s*"[^"]{3,50}"/gi,
    /ТОВ\s*"[^"]{3,50}"/gi, 
    /АТ\s*"[^"]{3,50}"/gi,
    /СК\s*"[^"]{3,50}"/gi,
    
    // Комбинированные формы
    /ПрАТ\s+СК\s*"[^"]{3,50}"/gi,
    /ТОВ\s+СК\s*"[^"]{3,50}"/gi,
    /АТ\s+СК\s*"[^"]{3,50}"/gi,
    
    // Названия без кавычек (более осторожно)
    /(?:ПрАТ|ТОВ|АТ|СК)\s+[А-ЯІЇЄЁ][А-ЯІЇЄЁа-я\s\-'"\.]{5,40}(?=\s*(?:<|$|\n))/gi,
    
    // Поиск в HTML структуре
    /<[^>]*>\s*(?:ПрАТ|ТОВ|АТ|СК)[^<]{5,50}<\/[^>]*>/gi
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[0]) {
      let foundCompany = match[0].trim().replace(/<[^>]*>/g, '');
      foundCompany = foundCompany.replace(/[\r\n\t]+/g, ' ').trim();
      if (foundCompany.length > company.length) {
        company = foundCompany;
      }
    }
  }

  // Дополнительный поиск - ищем в контексте "Найменування" (улучшенный)
  if (company === 'Not found' || company.length < 10) {
    // Ищем более широкий контекст вокруг "Найменування"
    const companySection = html.match(/Найменування[\s\S]{0,500}?<[^>]*>\s*([^<]{10,100})\s*</i);
    if (companySection && companySection[1]) {
      let foundName = companySection[1].trim();
      // Извлекаем название компании из найденного текста
      const companyMatch = foundName.match(/(?:АТ|ТОВ|ПрАТ|СК)\s*"[^"]+"/);
      if (companyMatch) {
        foundName = companyMatch[0];
      }
      if (foundName.length > 5 && /[А-ЯІЇЄЁ]/.test(foundName)) {
        company = foundName;
      }
    }
    
    // Еще один паттерн - ищем после "Страхова компанія"
    if (company === 'Not found' || company.length < 10) {
      const afterInsurance = html.match(/Страхова\s+компанія[\s\S]{0,300}?Найменування[\s\S]{0,200}?<[^>]*>\s*([^<]{10,100})\s*</i);
      if (afterInsurance && afterInsurance[1]) {
        let foundName = afterInsurance[1].trim();
        const companyMatch = foundName.match(/(?:АТ|ТОВ|ПрАТ|СК)\s*"[^"]+"/);
        if (companyMatch) {
          foundName = companyMatch[0];
        }
        if (foundName.length > 5 && /[А-ЯІЇЄЁ]/.test(foundName)) {
          company = foundName;
        }
      }
    }
  }
  
  // Финальная очистка
  if (company !== 'Not found') {
    company = company.replace(/^["\s]+|["\s]+$/g, '');
    company = company.replace(/\s{2,}/g, ' ');
    // Убираем лишние HTML entities
    company = company.replace(/&nbsp;/g, ' ');
    company = company.replace(/&quot;/g, '"');
  }

  return company;
}

// Функция для получения данных полиса на конкретную дату
async function getPolicyData(plate, date = null) {
  // URL bypass сервера можно настроить через переменную окружения BYPASS_SERVER
  // Или используйте актуальный URL вашего ngrok/сервера
  const bypassServer = process.env.BYPASS_SERVER || 'https://preoccasioned-volubly-christia.ngrok-free.dev';
  const targetUrl = 'https://policy.mtsbu.ua/?SearchType=Contract';
  
  let url = `${bypassServer}/form_submit?url=${encodeURIComponent(targetUrl)}&plate=${encodeURIComponent(plate)}`;
  
  // Если указана дата, добавляем её в запрос
  if (date) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    url += `&date=${encodeURIComponent(dateStr)}`;
  }
  
  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000 // 30 секунд таймаут
    });
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Не удалось подключиться к bypass серверу (${bypassServer}). Проверьте, что сервер запущен и доступен.`);
    }
    throw new Error(`Ошибка сети: ${error.message}`);
  }
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Bypass сервер вернул 404. Возможно:\n1. Endpoint /form_submit не существует\n2. URL ngrok изменился (${bypassServer})\n3. Сервер не запущен\n\nПроверьте URL bypass сервера в коде.`);
    }
    throw new Error(`Bypass сервер вернул ошибку: ${response.status} ${response.statusText}`);
  }
  
  const html = await response.text();
  
  // Сохраняем HTML для отладки (только если нет контента)
  const fs = require('fs');
  const path = require('path');
  
  // Проверяем, что получили HTML
  if (!html || html.length < 100) {
    return {
      policyNumber: null,
      company: 'Not found',
      html: html || '',
      hasInsurance: false,
      error: 'Empty or invalid HTML response'
    };
  }
  
  // Проверяем, что страница загрузилась корректно
  const hasPolicyContent = html.includes('Перевірка чинності') || 
                          html.includes('Поліс') || 
                          html.includes('поліс') || 
                          html.includes('Страхова') ||
                          html.includes('Найменування') ||
                          html.includes('СГ') ||
                          html.includes('ТАС');
  
  // Логируем для отладки
  console.log('HTML check:', {
    length: html.length,
    hasPolicyContent,
    hasPolis: html.includes('Поліс') || html.includes('поліс'),
    hasCompany: html.includes('Страхова') || html.includes('Найменування'),
    snippet: html.substring(0, 500)
  });
  
  // Сохраняем HTML для анализа, если нет контента
  if (!hasPolicyContent && html.length > 1000) {
    try {
      const debugDir = path.join(__dirname, 'debug');
      if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
      }
      const debugFile = path.join(debugDir, `html-${Date.now()}.html`);
      fs.writeFileSync(debugFile, html, 'utf8');
      console.log(`Debug HTML saved to: ${debugFile}`);
    } catch (e) {
      console.log('Error saving debug HTML:', e.message);
    }
  }
  
  if (!hasPolicyContent) {
    // Возможно страница загрузилась, но нет данных о страховке
    // Все равно пытаемся распарсить - может быть данные в другом формате
    console.log('No policy content found, but trying to parse anyway');
  }
  
  const policyNumber = parsePolicyNumber(html);
  const company = parseCompanyName(html);
  
  return {
    policyNumber,
    company,
    html,
    hasInsurance: policyNumber !== null || (company !== 'Not found' && company.length > 5)
  };
}

// Бинарный поиск даты окончания полиса
async function findPolicyExpiryDate(plate, currentPolicyNumber) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Максимальная глубина поиска - 2 года назад
  const maxSearchDate = new Date(today);
  maxSearchDate.setFullYear(maxSearchDate.getFullYear() - 2);
  
  // Минимальный шаг - 1 день
  const minStepDays = 1;
  
  let left = maxSearchDate;
  let right = today;
  let lastKnownSameDate = today; // Последняя дата, когда номер был тот же
  let lastKnownDifferentDate = null; // Первая дата, когда номер был другой
  
  const maxIterations = 50; // Защита от бесконечного цикла
  let iterations = 0;
  
  // Шаг 1: Проверяем полгода назад
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  
  try {
    const sixMonthsData = await getPolicyData(plate, sixMonthsAgo);
    await new Promise(resolve => setTimeout(resolve, 500)); // Задержка между запросами
    
    if (!sixMonthsData || !sixMonthsData.hasInsurance) {
      // Если полгода назад страховки не было, ищем ближе к сегодня
      right = sixMonthsAgo;
      left = new Date(today);
      left.setMonth(left.getMonth() - 3); // 3 месяца назад
    } else if (sixMonthsData.policyNumber === currentPolicyNumber) {
      // Тот же номер - идем еще 3 месяца назад (9 месяцев назад от сегодня)
      lastKnownSameDate = sixMonthsAgo;
      const nineMonthsAgo = new Date(sixMonthsAgo);
      nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 3);
      nineMonthsAgo.setHours(0, 0, 0, 0);
      
      try {
        const nineMonthsData = await getPolicyData(plate, nineMonthsAgo);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (nineMonthsData && nineMonthsData.hasInsurance && 
            nineMonthsData.policyNumber === currentPolicyNumber) {
          // Тот же номер и на 9 месяцах - продолжаем поиск дальше назад
          lastKnownSameDate = nineMonthsAgo;
          left = nineMonthsAgo;
        } else {
          // Другой номер или нет страховки - граница между 6 и 9 месяцами
          if (nineMonthsData && nineMonthsData.policyNumber !== currentPolicyNumber) {
            lastKnownDifferentDate = nineMonthsAgo;
          }
          right = nineMonthsAgo;
          left = sixMonthsAgo;
        }
      } catch (error) {
        console.error('Error checking 9 months ago:', error);
        left = nineMonthsAgo;
      }
    } else {
      // Другой номер на полгода назад - идем 3 месяца назад от сегодня
      lastKnownDifferentDate = sixMonthsAgo;
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      threeMonthsAgo.setHours(0, 0, 0, 0);
      
      try {
        const threeMonthsData = await getPolicyData(plate, threeMonthsAgo);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (threeMonthsData && threeMonthsData.hasInsurance && 
            threeMonthsData.policyNumber === currentPolicyNumber) {
          // Тот же номер на 3 месяцах - граница между 3 и 6 месяцами
          lastKnownSameDate = threeMonthsAgo;
          left = threeMonthsAgo;
          right = sixMonthsAgo;
        } else {
          // Другой номер или нет страховки - граница между сегодня и 3 месяцами
          if (threeMonthsData && threeMonthsData.policyNumber !== currentPolicyNumber) {
            lastKnownDifferentDate = threeMonthsAgo;
          }
          left = threeMonthsAgo;
          right = today;
        }
      } catch (error) {
        console.error('Error checking 3 months ago:', error);
        left = threeMonthsAgo;
        right = sixMonthsAgo;
      }
    }
  } catch (error) {
    console.error('Error checking 6 months ago:', error);
    // Продолжаем с базовым поиском
    left = maxSearchDate;
    right = today;
  }
  
  // Бинарный поиск по половине срока
  while (iterations < maxIterations) {
    iterations++;
    
    // Вычисляем среднюю дату (половина между left и right)
    const diffTime = right.getTime() - left.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= minStepDays) {
      // Достигли минимального шага
      break;
    }
    
    const midDate = new Date(left.getTime() + diffTime / 2);
    midDate.setHours(0, 0, 0, 0);
    
    // Запрет на поиск в будущем
    if (midDate > today) {
      right = today;
      break;
    }
    
    try {
      const midData = await getPolicyData(plate, midDate);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!midData || !midData.hasInsurance) {
        // Страховки нет - идем вперед
        right = midDate;
        continue;
      }
      
      if (midData.policyNumber === currentPolicyNumber) {
        // Тот же номер - полис еще действует, идем дальше назад
        lastKnownSameDate = midDate;
        left = midDate;
      } else {
        // Другой номер - полис уже закончился, идем вперед
        lastKnownDifferentDate = midDate;
        right = midDate;
      }
    } catch (error) {
      console.error(`Error checking date ${midDate.toISOString()}:`, error);
      // При ошибке идем немного вперед
      right = midDate;
    }
  }
  
  // Определяем дату окончания
  // Это последний день, когда номер полиса был тот же
  let expiryDate = lastKnownSameDate;
  
  // Уточняем границу, проверяя дни вокруг найденной границы
  if (lastKnownDifferentDate && lastKnownSameDate < lastKnownDifferentDate) {
    // Проверяем несколько дней между lastKnownSameDate и lastKnownDifferentDate
    const startCheck = new Date(lastKnownSameDate);
    const endCheck = new Date(lastKnownDifferentDate);
    
    for (let checkDate = new Date(startCheck); checkDate <= endCheck; checkDate.setDate(checkDate.getDate() + 1)) {
      checkDate.setHours(0, 0, 0, 0);
      
      // Защита от проверки будущего
      if (checkDate > today) {
        break;
      }
      
      try {
        const checkData = await getPolicyData(plate, checkDate);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        if (checkData && checkData.hasInsurance) {
          if (checkData.policyNumber !== currentPolicyNumber) {
            // Нашли первый день с другим номером
            expiryDate = new Date(checkDate);
            expiryDate.setDate(expiryDate.getDate() - 1); // День перед этим
            break;
          } else {
            // Обновляем последнюю дату с тем же номером
            lastKnownSameDate = new Date(checkDate);
            expiryDate = lastKnownSameDate;
          }
        }
      } catch (error) {
        // Продолжаем поиск
      }
    }
  }
  
  return expiryDate;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { plate } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  try {
    // Получаем данные на текущую дату
    const currentData = await getPolicyData(plate);
    
    if (!currentData) {
      return res.json({
        plate,
        company: 'Not found',
        policyNumber: null,
        expiryDate: null,
        hasInsurance: false,
        debug: {
          message: 'No response from bypass server',
          error: currentData?.error || 'Unknown error'
        }
      });
    }
    
    if (!currentData.hasInsurance) {
      return res.json({
        plate,
        company: currentData.company || 'Not found',
        policyNumber: currentData.policyNumber || null,
        expiryDate: null,
        hasInsurance: false,
        debug: {
          message: 'No insurance found for current date',
          htmlLength: currentData.html?.length || 0,
          htmlSnippet: currentData.html?.substring(0, 500) || '',
          foundPolicyNumber: currentData.policyNumber !== null,
          foundCompany: currentData.company !== 'Not found'
        }
      });
    }
    
    const company = currentData.company;
    const currentPolicyNumber = currentData.policyNumber;
    
    // Если номер полиса найден, ищем дату окончания
    let expiryDate = null;
    if (currentPolicyNumber) {
      try {
        expiryDate = await findPolicyExpiryDate(plate, currentPolicyNumber);
      } catch (error) {
        console.error('Error finding expiry date:', error);
        // Продолжаем без даты окончания
      }
    }

    res.json({ 
      plate, 
      company,
      policyNumber: currentPolicyNumber,
      expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : null,
      hasInsurance: true,
      debug: {
        htmlLength: currentData.html.length,
        found: company !== 'Not found',
        bypassWorked: currentData.html.includes('Перевірка чинності'),
        htmlSnippet: currentData.html.substring(0, 2000)
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
};