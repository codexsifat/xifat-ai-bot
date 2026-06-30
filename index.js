const TelegramBot = require('node-telegram-bot-api');
const archiver = require('archiver');
const fs = require('fs');

const token = process.env.TELEGRAM_TOKEN;
const groqKey = process.env.GROQ_KEY;

const bot = new TelegramBot(token, {polling: true});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if(!text) return;

  // /start কমান্ড
  if(text === '/start') {
    bot.sendMessage(chatId, 'হ্যালো ভাই! আমি XIFAT AI 🤖\n\n/imagine + Prompt = ছবি বানাবো\n/build + Prompt = ওয়েবসাইট zip দিবো\nযেমন: /build simple portfolio');
    return;
  }

  // /imagine কমান্ড - ছবি জেনারেট
  if(text.toLowerCase().startsWith('/imagine')) {
    const prompt = text.replace(/\/imagine\s*/i, '').trim();

    if(!prompt) {
      bot.sendMessage(chatId, '❌ Prompt দাও ভাই। যেমন: /imagine একটা সুন্দর ল্যান্ডস্কেপ');
      return;
    }

    bot.sendMessage(chatId, '⏳ ছবি বানাচ্ছি... 10 সেকেন্ড');
    bot.sendChatAction(chatId, 'upload_photo');

    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt + ', 4k, highly detailed')}`;

      await bot.sendPhoto(chatId, imageUrl, {
        caption: `✅ ছবি রেডি!\n📝 Prompt: ${prompt}`
      });
    } catch(e) {
      bot.sendMessage(chatId, '❌ ছবি বানাতে পারি নাই। আবার ট্রাই করো।');
    }
    return;
  }

  // /build কমান্ড - ওয়েবসাইট zip জেনারেটর v2.0
  if(text.toLowerCase().startsWith('/build')) {
    const prompt = text.replace(/\/build\s*/i, '').trim();

    if(!prompt) {
      bot.sendMessage(chatId, '❌ Prompt দাও ভাই। যেমন: /build simple portfolio');
      return;
    }

    bot.sendMessage(chatId, '⏳ XIFAT AI ওয়েবসাইট বানাচ্ছে... 15-20 সেকেন্ড');
    bot.sendChatAction(chatId, 'upload_document');

    try {
      // Groq দিয়ে কোড জেনারেট - শক্ত System Prompt
      let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + groqKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {role: "system", content: "তুমি expert web developer। শুধু কোড দিবা, কোনো কথা বলবা না। অবশ্যই এই 3টা মার্কার ঠিক এইভাবে দিবা: ---index.html--- তারপর HTML কোড ---style.css--- তারপর CSS কোড ---script.js--- তারপর JS কোড। মার্কার ছাড়া অন্য কিছু লিখবা না।"},
            {role: "user", content: `Make a website: ${prompt}. Use only 3 files: index.html, style.css, script.js. Make it responsive, clean UI.`}
          ],
          max_tokens: 4000,
          temperature: 0.2
        })
      });

      let data = await res.json();
      let code = data.choices[0].message.content;
      console.log("Groq Response:", code);

      // মার্কার চেক
      if(!code.includes('---index.html---') ||!code.includes('---style.css---') ||!code.includes('---script.js---')) {
        bot.sendMessage(chatId, '❌ AI কোডের ফরম্যাট ভুল দিছে। আবার /build দাও।');
        return;
      }

      // ফাইল আলাদা করো
      const html = code.split('---index.html---')[1].split('---style.css---')[0].trim();
      const css = code.split('---style.css---')[1].split('---script.js---')[0].trim();
      const js = code.split('---script.js---')[1].replace(/```/g, '').replace(/javascript/gi, '').trim();

      // Temp ফোল্ডার বানাও
      const folderName = `website_${Date.now()}`;
      fs.mkdirSync(folderName);
      fs.writeFileSync(`${folderName}/index.html`, html);
      fs.writeFileSync(`${folderName}/style.css`, css);
      fs.writeFileSync(`${folderName}/script.js`, js);

      // Zip বানাও
      const zipName = `${folderName}.zip`;
      const output = fs.createWriteStream(zipName);
      const archive = archiver('zip', { zlib: { level: 9 } });

      await new Promise((resolve, reject) => {
        archive.on('error', reject);
        output.on('close', resolve);
        archive.pipe(output);
        archive.directory(folderName, false);
        archive.finalize();
      });

      // Telegram এ পাঠাও
      await bot.sendDocument(chatId, zipName, {
        caption: `✅ ওয়েবসাইট রেডি!\n📝 Prompt: ${prompt}\n\nunzip করে index.html ওপেন করো`
      });

      // ফাইল ডিলিট
      fs.rmSync(folderName, { recursive: true, force: true });
      fs.unlinkSync(zipName);

    } catch(e) {
      console.log("BUILD ERROR:", e.message);
      bot.sendMessage(chatId, '❌ এরর হইছে: ' + e.message);
    }
    return;
  }

  // নরমাল চ্যাট - Groq AI
  bot.sendChatAction(chatId, 'typing');

  try {
    let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + groqKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{role: "user", content: text}],
        max_tokens: 500
      })
    });

    let data = await res.json();
    let reply = data.choices[0].message.content;
    bot.sendMessage(chatId, reply);
  } catch(e) {
    bot.sendMessage(chatId, '❌ এরর হইছে ভাই। আবার লিখো।');
  }
});