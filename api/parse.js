import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

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
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.goto('https://policy.mtsbu.ua/?SearchType=Contract');
    
    // Клик на "Державний номер ТЗ" если не выбрано
    const plateRadio = await page.$('input[value="PlateNumber"]');
    if (plateRadio) {
      await plateRadio.click();
    }
    
    // Вводим номер
    await page.type('input[name="Number"]', plate);
    
    // Кликаем "Перевірити"
    await page.click('button[type="submit"]');
    
    // Ждем результат
    await page.waitForTimeout(5000);
    
    // Парсим результат (нужно будет уточнить селектор)
    const company = await page.$eval('.company-name', el => el.textContent) || 'Not found';
    
    res.json({ plate, company });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}