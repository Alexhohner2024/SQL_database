export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { plate } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  try {
    // Простой запрос без proxy с минимальными заголовками
    const mainPage = await fetch('https://policy.mtsbu.ua/', {
      headers: {
        'User-Agent': 'curl/7.68.0'
      }
    });
    
    if (!mainPage.ok) {
      return res.status(500).json({ 
        error: 'Failed to fetch main page',
        status: mainPage.status 
      });
    }
    
    const mainPageHtml = await mainPage.text();
    
    // Извлекаем cookies из ответа
    const cookieHeader = mainPage.headers.get('set-cookie') || '';
    const cookies = cookieHeader.split(',').map(c => c.split(';')[0]).join('; ');
    
    // Ищем токен CSRF
    const tokenMatch = mainPageHtml.match(/__RequestVerificationToken.*?value="([^"]+)"/);
    const csrfToken = tokenMatch ? tokenMatch[1] : '';
    
    if (!csrfToken) {
      return res.status(500).json({ 
        error: 'CSRF token not found',
        debug: {
          htmlSnippet: mainPageHtml.substring(0, 1000)
        }
      });
    }

    // Формируем POST данные
    const postData = new URLSearchParams({
      'RegNoModel.PlateNumber': plate,
      'RegNoModel.Date': new Date().toLocaleDateString('uk-UA'),
      'SearchType': 'Contract',
      '__RequestVerificationToken': csrfToken
    });

    // POST с cookies и правильной датой
    const searchResponse = await fetch('https://policy.mtsbu.ua/', {
      method: 'POST',
      body: postData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'curl/7.68.0',
        'Cookie': cookies,
        'Referer': 'https://policy.mtsbu.ua/'
      }
    });

    const html = await searchResponse.text();
    
    // Парсим результат - улучшенный поиск названий компаний
    let company = 'Not found';
    
    // Поиск различных форматов названий страховых компаний
    const patterns = [
      /ПрАТ СК "[^"]+"/gi,
      /ТОВ "[^"]+"/gi, 
      /АТ "[^"]+"/gi,
      /СК "[^"]+"/gi,
      /ПрАТ СК [А-ЯІЇЄa-z\s\-']+/gi,
      /ТОВ [А-ЯІЇЄa-z\s\-']+/gi,
      /АТ [А-ЯІЇЄa-z\s\-']+/gi,
      /СК [А-ЯІЇЄa-z\s\-']+/gi
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[0]) {
        company = match[0].trim();
        break;
      }
    }

    res.json({ 
      plate, 
      company,
      debug: {
        htmlLength: html.length,
        statusCode: searchResponse.status,
        url: searchResponse.url,
        tokenFound: !!csrfToken,
        htmlSnippet: html.substring(0, 1000)
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
}