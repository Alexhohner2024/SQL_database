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
    const mainPage = await fetch('https://policy.mtsbu.ua/?SearchType=Contract', {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'ru,uk;q=0.9,en-US;q=0.8,en;q=0.7',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
      }
    });
    
    const mainPageHtml = await mainPage.text();
    const setCookieHeaders = mainPage.headers.get('set-cookie') || '';
    
    // Ищем токен CSRF
    const tokenMatch = mainPageHtml.match(/__RequestVerificationToken.*?value="([^"]+)"/);
    const csrfToken = tokenMatch ? tokenMatch[1] : '';
    
    if (!csrfToken) {
      return res.status(500).json({ error: 'CSRF token not found' });
    }

    // Отправляем POST запрос без капчи
    const postData = new URLSearchParams({
      'RegNoModel.PlateNumber': plate,
      'RegNoModel.Date': new Date().toLocaleDateString('uk-UA'),
      'SearchType': 'Contract',
      '__RequestVerificationToken': csrfToken
    });

    const searchResponse = await fetch('https://policy.mtsbu.ua/', {
      method: 'POST',
      body: postData,
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'ru,uk;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/x-www-form-urlencoded',
        'origin': 'https://policy.mtsbu.ua',
        'referer': 'https://policy.mtsbu.ua/?SearchType=Contract',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'cookie': setCookieHeaders
      },
      redirect: 'follow'
    });

    // Парсим результат
    const html = await searchResponse.text();
    const companyMatch = html.match(/ПрАТ СК[^<"]+|ТОВ[^<"]+|АТ[^<"]+|СК[^<"]+/i);
    const company = companyMatch ? companyMatch[0].trim() : 'Not found';

    res.json({ 
      plate, 
      company,
      debug: {
        htmlLength: html.length,
        statusCode: searchResponse.status,
        url: searchResponse.url,
        htmlSnippet: html.substring(0, 500)
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message
    });
  }
}