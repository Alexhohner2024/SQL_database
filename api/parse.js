export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { plate } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  try {
    // Шаг 1: Получаем главную страницу для токена
    const bypassServer = 'http://localhost:8000';
    const mainPageUrl = 'https://policy.mtsbu.ua/?SearchType=Contract';
    
    const mainPageResponse = await fetch(`${bypassServer}/html?url=${encodeURIComponent(mainPageUrl)}`);
    const mainPageHtml = await mainPageResponse.text();
    
    // Извлекаем CSRF токен
    const tokenMatch = mainPageHtml.match(/__RequestVerificationToken.*?value="([^"]+)"/);
    const csrfToken = tokenMatch ? tokenMatch[1] : '';
    
    if (!csrfToken) {
      return res.status(500).json({ 
        error: 'CSRF token not found',
        debug: { htmlSnippet: mainPageHtml.substring(0, 1000) }
      });
    }

    // Шаг 2: Формируем POST URL с параметрами 
    const postParams = new URLSearchParams({
      'RegNoModel.PlateNumber': plate,
      'RegNoModel.Date': new Date().toLocaleDateString('uk-UA'),
      'SearchType': 'Contract',
      '__RequestVerificationToken': csrfToken
    });
    
    // Используем специальный POST endpoint через CloudflareBypass
    const postUrl = `https://policy.mtsbu.ua/`;
    const fullPostUrl = `${postUrl}?${postParams.toString()}`;
    
    // Получаем результаты поиска
    const response = await fetch(`${bypassServer}/html?url=${encodeURIComponent(fullPostUrl)}`);
    
    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Bypass server error',
        status: response.status 
      });
    }
    
    const html = await response.text();
    
    // Парсим результат - ищем страховую компанию
    let company = 'Not found';
    
    // Улучшенные паттерны для поиска компаний
    const patterns = [
      /ПрАТ\s*"[^"]+"/gi,
      /ТОВ\s*"[^"]+"/gi, 
      /АТ\s*"[^"]+"/gi,
      /СК\s*"[^"]+"/gi,
      /ПрАТ\s+СК\s*"[^"]+"/gi,
      /ТОВ\s+СК\s*"[^"]+"/gi,
      // Поиск без кавычек
      /(?:ПрАТ|ТОВ|АТ|СК)\s+[А-ЯІЇЄЁa-z\s\-'"]+(?=\s*<|$)/gi
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[0]) {
        company = match[0].trim().replace(/[<>]/g, '');
        break;
      }
    }

    // Дополнительный поиск по структуре HTML
    if (company === 'Not found') {
      // Ищем секцию со страховой компанией
      const companySection = html.match(/Страхова компанія[\s\S]*?Найменування[\s\S]*?<[^>]*>([^<]+)/i);
      if (companySection) {
        company = companySection[1].trim();
      }
      
      // Альтернативный поиск по таблице
      if (company === 'Not found') {
        const tableMatch = html.match(/<td[^>]*>[\s\S]*?(ПрАТ[^<]+|ТОВ[^<]+|АТ[^<]+|СК[^<]+)[\s\S]*?<\/td>/gi);
        if (tableMatch && tableMatch[0]) {
          const cleanMatch = tableMatch[0].replace(/<[^>]*>/g, '').trim();
          if (cleanMatch.length > 3) {
            company = cleanMatch;
          }
        }
      }
    }

    res.json({ 
      plate, 
      company,
      debug: {
        htmlLength: html.length,
        found: company !== 'Not found',
        bypassWorked: html.includes('Перевірка чинності'),
        htmlSnippet: html.substring(0, 2000)
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}