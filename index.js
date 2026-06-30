const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
const groqKey = process.env.GROQ_KEY;

if(!token ||!groqKey) {
  console.log("❌ TELEGRAM_TOKEN বা GROQ_KEY সেট করো নাই Railway Variables এ!");
  process.exit();
}

const bot = new TelegramBot(token, {polling: true});
console.log('✅ XIFAT AI বট চালু হইছে @xifatai_bot');

// /start কমান্ড
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `হ্যালো! আমি XIFAT AI ⚡\nGroq এর সুপার ফাস্ট AI দিয়ে চালিত।\n\n🎨 ইমেজ বানাতে: /imagine একটা বিড়াল\n💬 চ্যাট করতে: যেকোনো কিছু লিখো`);
});

// সব মেসেজ হ্যান্ডলার
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if(!text) return;
  if(text === '/start') return;

  // 1. ইমেজ জেনারেশন কমান্ড - axios লাগবে না
  if (text.startsWith('/imagine ')) {
    const prompt = text.replace('/imagine ', '');

    bot.sendChatAction(chatId, 'upload_photo');

    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${Math.floor(Math.random()*99999)}&nologo=true`;

      await bot.sendPhoto(chatId, imageUrl, {
        caption: `🎨 Prompt: ${prompt}\nPowered by Pollinations AI`
      });
    } catch(e) {
      console.log(e);
      bot.sendMessage(chatId, '❌ ইমেজ বানাতে পারি নাই। Prompt ছোট করে ট্রাই করো।');
    }
    return;
  }

  // 2. নরমাল চ্যাট - Groq AI
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
        messages: [
          {role: "system", content: "তুমি XIFAT AI, বন্ধুসুলভ AI। বাংলায় সংক্ষেপে উত্তর দাও।"},
          {role: "user", content: text}
        ],
        max_tokens: 800
      })
    });

    let data = await res.json();
    let reply = data.choices[0].message.content;
    bot.sendMessage(chatId, reply);

  } catch(e) {
    console.log(e);
    bot.sendMessage(chatId, '❌ এরর হইছে। আবার ট্রাই করো।');
  }
});