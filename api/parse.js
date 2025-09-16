// Используем встроенный fetch

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { plate } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  try {
    // Получаем главную страницу для токенов
    const mainPage = await fetch('https://policy.mtsbu.ua/?SearchType=Contract');
    const mainPageHtml = await mainPage.text();
    
    // Ищем токен CSRF
    const tokenMatch = mainPageHtml.match(/__RequestVerificationToken.*?value="([^"]+)"/);
    const csrfToken = tokenMatch ? tokenMatch[1] : '';
    
    if (!csrfToken) {
      return res.status(500).json({ error: 'CSRF token not found' });
    }

    // Отправляем POST запрос
    const postData = new URLSearchParams({
      'RegNoModel.PlateNumber': plate,
      'RegNoModel.Date': new Date().toLocaleDateString('uk-UA'),
      'SearchType': 'Contract',
      '__RequestVerificationToken': csrfToken
    });

    const searchResponse = await fetch('https://policy.mtsbu.ua/Search/ByRegNo', {
      method: 'POST',
      body: postData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://policy.mtsbu.ua/?SearchType=Contract',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // Парсим результат
    const html = await searchResponse.text();
    const companyMatch = html.match(/<td[^>]*>([^<]+страхов[^<]+)<\/td>/i);
    const company = companyMatch ? companyMatch[1].trim() : 'Not found';

    res.json({ 
      plate, 
      company,
      debug: {
        htmlLength: html.length,
        htmlSnippet: html.substring(0, 500),
        statusCode: searchResponse.status
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message
    });
  }
}