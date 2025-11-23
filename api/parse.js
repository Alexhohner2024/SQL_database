// Функция для парсинга номера полиса из HTML
function parsePolicyNumber(html) {
  // Паттерны для поиска номера полиса
  const patterns = [
    // Номер полиса в различных форматах
    /Номер\s+поліса[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    /Поліс[:\s]*№[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    /№\s+поліса[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    /Contract\s+№[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    /Договір[:\s]*№[:\s]*([A-ZА-Я0-9\-]{5,30})/gi,
    // Поиск в таблицах и структурированных данных
    /<td[^>]*>\s*[Н№][^<]*поліса?[^<]*<\/td>\s*<td[^>]*>\s*([A-ZА-Я0-9\-]{5,30})\s*<\/td>/gi,
    /<th[^>]*>[Н№][^<]*поліса?[^<]*<\/th>\s*<td[^>]*>\s*([A-ZА-Я0-9\-]{5,30})\s*<\/td>/gi,
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

  // Дополнительный поиск - ищем в контексте "Найменування"
  if (company === 'Not found' || company.length < 10) {
    const companySection = html.match(/Найменування[\s\S]{0,200}?<[^>]*>\s*([^<]{10,80})\s*</i);
    if (companySection && companySection[1]) {
      const foundName = companySection[1].trim();
      if (foundName.length > 5 && /[А-ЯІЇЄЁ]/.test(foundName)) {
        company = foundName;
      }
    }
  }
  
  // Финальная очистка
  if (company !== 'Not found') {
    company = company.replace(/^["\s]+|["\s]+$/g, '');
    company = company.replace(/\s{2,}/g, ' ');
  }

  return company;
}

// Функция для получения данных полиса на конкретную дату
async function getPolicyData(plate, date = null) {
  const bypassServer = 'https://ab3b913c8b71.ngrok-free.app';
  const targetUrl = 'https://policy.mtsbu.ua/?SearchType=Contract';
  
  let url = `${bypassServer}/form_submit?url=${encodeURIComponent(targetUrl)}&plate=${encodeURIComponent(plate)}`;
  
  // Если указана дата, добавляем её в запрос
  if (date) {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    url += `&date=${encodeURIComponent(dateStr)}`;
  }
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Form submit failed: ${response.status}`);
  }
  
  const html = await response.text();
  
  // Проверяем, что страница загрузилась корректно
  if (!html.includes('Перевірка чинності') && !html.includes('поліс')) {
    return null; // Страховка не найдена или страница не загрузилась
  }
  
  const policyNumber = parsePolicyNumber(html);
  const company = parseCompanyName(html);
  
  return {
    policyNumber,
    company,
    html,
    hasInsurance: policyNumber !== null || company !== 'Not found'
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
    
    if (!currentData || !currentData.hasInsurance) {
      return res.json({
        plate,
        company: 'Not found',
        policyNumber: null,
        expiryDate: null,
        hasInsurance: false,
        debug: {
          message: 'No insurance found for current date'
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