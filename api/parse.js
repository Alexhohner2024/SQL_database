const { connect } = require('puppeteer-real-browser');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { plate } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  let browser;
  try {
    const { browser: realBrowser, page } = await connect({
      headless: true,
      turnstile: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    browser = realBrowser;
    
    await page.goto('https://policy.mtsbu.ua/?SearchType=Contract', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Клик на "Державний номер ТЗ" если не выбрано
    const plateRadio = await page.$('input[value="PlateNumber"]');
    if (plateRadio) {
      await plateRadio.click();
      await page.waitForTimeout(1000);
    }
    
    // Вводим номер
    const inputField = await page.$('input[name="Number"]');
    if (inputField) {
      await inputField.click();
      await inputField.type(plate);
    }
    
    // Кликаем "Перевірити"
    await page.click('button[type="submit"]');
    
    // Ждем результат
    await page.waitForTimeout(10000);
    
    // Парсим результат
    const html = await page.content();
    const companyMatch = html.match(/ПрАТ СК[^<"]+|ТОВ[^<"]+|АТ[^<"]+|СК[^<"]+/i);
    const company = companyMatch ? companyMatch[0].trim() : 'Not found';

    res.json({ 
      plate, 
      company,
      debug: {
        htmlLength: html.length,
        url: page.url()
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}