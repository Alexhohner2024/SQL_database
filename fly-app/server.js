const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Главный endpoint для парсинга
app.get('/api/parse', async (req, res) => {
  const { plate } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  let browser;
  try {
    // Запускаем браузер
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Устанавливаем User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    // Переходим на сайт
    await page.goto('https://policy.mtsbu.ua/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Заполняем форму
    await page.type('#RegNoModel_PlateNumber', plate);
    
    // Устанавливаем текущую дату
    const currentDate = new Date().toLocaleDateString('uk-UA');
    await page.evaluate((date) => {
      document.getElementById('numDate').value = date;
    }, currentDate);

    // Ждем появления капчи и кликаем submit
    await page.click('#submitBtn');
    
    // Ждем загрузки результатов (или капчи)
    try {
      // Ждем либо результаты, либо капчу Turnstile
      await page.waitForSelector('.cf-turnstile, .result, .error', { 
        timeout: 10000 
      });
      
      // Проверяем есть ли капча
      const captcha = await page.$('.cf-turnstile');
      if (captcha) {
        // Ждем решения капчи (Turnstile обычно решается автоматически)
        await page.waitForTimeout(5000);
        
        // Пробуем снова кликнуть submit после решения капчи
        const submitBtn = await page.$('#submitBtn');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
      
    } catch (error) {
      console.log('Timeout waiting for elements');
    }

    // Получаем HTML страницы
    const html = await page.content();
    
    // Парсим результат
    let company = 'Not found';
    
    const patterns = [
      /ПрАТ\s*"[^"]+"/gi,
      /ТОВ\s*"[^"]+"/gi, 
      /АТ\s*"[^"]+"/gi,
      /СК\s*"[^"]+"/gi,
      /ПрАТ\s+СК\s*"[^"]+"/gi
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[0]) {
        company = match[0].trim();
        break;
      }
    }

    // Также ищем в тексте страницы более широко
    if (company === 'Not found') {
      const companyKeywords = ['Страхова компанія', 'Найменування'];
      const lines = html.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (companyKeywords.some(keyword => lines[i].includes(keyword))) {
          // Проверяем следующие несколько строк
          for (let j = i + 1; j < i + 5 && j < lines.length; j++) {
            const lineMatch = lines[j].match(/ПрАТ[^<>]+|ТОВ[^<>]+|АТ[^<>]+/gi);
            if (lineMatch) {
              company = lineMatch[0].trim().replace(/[<>]/g, '');
              break;
            }
          }
          if (company !== 'Not found') break;
        }
      }
    }

    await browser.close();

    res.json({
      plate,
      company,
      debug: {
        htmlLength: html.length,
        found: company !== 'Not found',
        htmlSnippet: html.substring(0, 2000)
      }
    });

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Endpoint для form_submit (совместим с parse.js)
app.get('/form_submit', async (req, res) => {
  const { url, plate, date } = req.query;
  
  if (!plate) {
    return res.status(400).json({ error: 'Plate number required' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
    
    // Используем переданный URL или дефолтный
    const targetUrl = url || 'https://policy.mtsbu.ua/?SearchType=Contract';
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Заполняем форму
    await page.type('#RegNoModel_PlateNumber', plate);
    
    // Устанавливаем дату (если передана, иначе текущая)
    let dateToUse;
    if (date) {
      dateToUse = date;
    } else {
      dateToUse = new Date().toLocaleDateString('uk-UA');
    }
    
    await page.evaluate((date) => {
      const dateInput = document.getElementById('numDate');
      if (dateInput) {
        dateInput.value = date;
      }
    }, dateToUse);

    // Кликаем submit
    await page.click('#submitBtn');
    
    // Ждем загрузки результатов
    try {
      await page.waitForSelector('.cf-turnstile, .result, .error, table, .policy-info', { 
        timeout: 10000 
      });
      
      const captcha = await page.$('.cf-turnstile');
      if (captcha) {
        await page.waitForTimeout(5000);
        const submitBtn = await page.$('#submitBtn');
        if (submitBtn) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    } catch (error) {
      console.log('Timeout waiting for elements');
    }

    // Получаем HTML страницы
    const html = await page.content();
    await browser.close();

    // Возвращаем HTML (как ожидает parse.js)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Bypass server ready at http://localhost:${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/form_submit`);
});