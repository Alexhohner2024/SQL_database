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
    // Запускаем браузер (используем ту же логику, что и в form_submit)
    const useHeadless = process.env.HEADLESS === 'true' || req.query.headless === 'true';
    browser = await puppeteer.launch({
      headless: useHeadless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
      defaultViewport: { width: 1280, height: 720 }
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
  let page;
  const maxRetries = 2;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`Attempt ${attempt} for plate: ${plate}`);
      
      // Используем видимый браузер для прохождения капчи
      // Можно управлять через параметр запроса ?headless=true или переменную окружения
      const requestHeadless = req.query.headless === 'true';
      const envHeadless = process.env.HEADLESS === 'true';
      const useHeadless = requestHeadless || envHeadless; // По умолчанию ВИДИМЫЙ браузер
      
      console.log(`Browser mode: ${useHeadless ? 'HEADLESS' : 'VISIBLE (headless=false)'}`);
      console.log(`HEADLESS env: ${process.env.HEADLESS}, request param: ${req.query.headless}`);
      
      browser = await puppeteer.launch({
        headless: useHeadless ? 'new' : false, // 'new' для нового headless режима, false для видимого
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security'
        ],
        // Для видимого браузера можно указать размер окна
        defaultViewport: { width: 1280, height: 720 }
      });
      
      if (!useHeadless) {
        console.log('⚠️  Видимый браузер запущен - вы сможете видеть процесс и пройти капчу вручную');
      }

      page = await browser.newPage();
      
      // Устанавливаем таймауты
      page.setDefaultNavigationTimeout(30000);
      page.setDefaultTimeout(30000);
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
      
      // Используем переданный URL или дефолтный
      const targetUrl = url || 'https://policy.mtsbu.ua/?SearchType=Contract';
      
      try {
        await page.goto(targetUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      } catch (navError) {
        console.log('Navigation error, trying networkidle0:', navError.message);
        await page.goto(targetUrl, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });
      }

      // Ждем появления формы
      await page.waitForSelector('#RegNoModel_PlateNumber', { timeout: 10000 });

      // Заполняем форму
      await page.type('#RegNoModel_PlateNumber', plate, { delay: 100 });
      
      // Устанавливаем дату (если передана, иначе текущая)
      let dateToUse;
      if (date) {
        dateToUse = date;
      } else {
        dateToUse = new Date().toLocaleDateString('uk-UA');
      }
      
      try {
        await page.evaluate((date) => {
          const dateInput = document.getElementById('numDate');
          if (dateInput) {
            dateInput.value = date;
          }
        }, dateToUse);
      } catch (e) {
        console.log('Date input error:', e.message);
      }

      // Кликаем submit
      console.log('Clicking submit button...');
      await page.click('#submitBtn');
      
      // Ждем начала загрузки
      await page.waitForTimeout(2000);
      
      // Проверяем наличие капчи
      let hasCaptcha = false;
      try {
        const captcha = await page.$('.cf-turnstile, iframe[src*="turnstile"]');
        if (captcha) {
          console.log('Captcha detected, waiting for solution...');
          hasCaptcha = true;
          // Ждем решения капчи (может занять до 15 секунд)
          await page.waitForTimeout(15000);
          
          // Проверяем, решена ли капча
          const captchaStillThere = await page.$('.cf-turnstile');
          if (captchaStillThere) {
            console.log('Captcha still present, waiting more...');
            await page.waitForTimeout(10000);
          }
        }
      } catch (e) {
        console.log('Captcha check error:', e.message);
      }
      
      // Ждем появления результатов - ищем ключевые элементы
      console.log('Waiting for results...');
      let resultsFound = false;
      const maxWaitTime = 30000; // 30 секунд максимум
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime && !resultsFound) {
        await page.waitForTimeout(2000);
        
        // Проверяем наличие данных о полисе
        const hasPolicyData = await page.evaluate(() => {
          const text = document.body ? document.body.innerText : '';
          return text.includes('Поліс') || 
                 text.includes('Страхова компанія') || 
                 text.includes('Найменування') ||
                 text.includes('Перевірка чинності');
        });
        
        if (hasPolicyData) {
          console.log('Policy data found!');
          resultsFound = true;
          break;
        }
        
        // Проверяем, не появилась ли ошибка
        const hasError = await page.evaluate(() => {
          const text = document.body ? document.body.innerText : '';
          return text.includes('не знайдено') || 
                 text.includes('помилка') ||
                 text.includes('error');
        });
        
        if (hasError) {
          console.log('Error message detected');
          resultsFound = true; // Все равно возвращаем HTML
          break;
        }
      }
      
      // Дополнительное ожидание для полной загрузки
      await page.waitForTimeout(2000);

      // Получаем HTML страницы
      let html = '';
      try {
        html = await page.content();
        console.log(`HTML length: ${html.length}`);
        
        // Проверяем наличие контента в body
        const bodyText = await page.evaluate(() => {
          return document.body ? document.body.innerText : '';
        });
        console.log(`Body text length: ${bodyText.length}`);
        console.log(`Body contains 'Поліс': ${bodyText.includes('Поліс')}`);
        console.log(`Body contains 'Страхова': ${bodyText.includes('Страхова')}`);
        
        // Если body пустой, пробуем получить полный HTML
        if (bodyText.length < 50) {
          console.log('Body text too short, trying to get full HTML');
          html = await page.evaluate(() => document.documentElement.outerHTML);
        }
      } catch (e) {
        console.log('Error getting HTML:', e.message);
        // Пробуем получить хотя бы часть HTML
        try {
          html = await page.evaluate(() => document.documentElement.outerHTML);
        } catch (e2) {
          console.log('Error getting HTML fallback:', e2.message);
        }
      }
      
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.log('Browser close error:', e.message);
        }
        browser = null;
      }

      // Проверяем, что есть контент
      if (!html || html.length < 100) {
        console.log('Empty or too short HTML, returning error');
        res.status(500).json({
          error: 'Empty HTML response from bypass server',
          htmlLength: html ? html.length : 0,
          htmlSnippet: html ? html.substring(0, 200) : ''
        });
        return;
      }

      // Возвращаем HTML (как ожидает parse.js)
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.log('Browser close error:', e.message);
        }
        browser = null;
      }
      
      if (attempt >= maxRetries) {
        console.error(`All ${maxRetries} attempts failed. Last error:`, error.message);
        res.status(500).json({
          error: error.message,
          stack: error.stack,
          attempts: attempt,
          message: 'Bypass server failed to get data after multiple attempts'
        });
        return;
      }
      
      // Ждем перед повтором
      console.log(`Retrying in 2 seconds... (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
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