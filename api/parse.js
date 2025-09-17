export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { plate } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  try {
    // Используем новый endpoint form_submit для автоматического заполнения формы
    const bypassServer = 'http://localhost:8000';
    const targetUrl = 'https://policy.mtsbu.ua/?SearchType=Contract';
    
    // Отправляем запрос с автоматическим заполнением и отправкой формы
    const response = await fetch(`${bypassServer}/form_submit?url=${encodeURIComponent(targetUrl)}&plate=${encodeURIComponent(plate)}`);
    
    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Form submit failed',
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