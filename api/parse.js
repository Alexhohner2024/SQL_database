module.exports = async function handler(req, res) {
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
        // Очищаем от лишних символов но сохраняем кавычки и основной текст
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
      company = company.replace(/^["\s]+|["\s]+$/g, ''); // Убираем лишние кавычки по краям
      company = company.replace(/\s{2,}/g, ' '); // Множественные пробелы в один
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
};