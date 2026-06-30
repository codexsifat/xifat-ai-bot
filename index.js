const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_TOKEN;
const groqKey = process.env.GROQ_KEY;

if(!token ||!groqKey) {
  console.log("❌ TELEGRAM_TOKEN বা GROQ_KEY সেট করো নাই Railway Variables এ!");
  process.exit();
}

const bot = new TelegramBot(token, {polling: true});
console.log('✅ XIFAT AI বট চালু হইছে @xifatai_bot');

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `হ্যালো! আমি XIFAT AI ⚡\nGroq এর সুপার ফাস্ট AI দিয়ে চালিত।\nযেকোনো কিছু জিজ্ঞেস করো।`);
});

// ইমেজ জেনারেশন কমান্ড
if (text.startsWith('/imagine ')) {
  const prompt = text.replace('/imagine ', '');
  
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendChatAction`, {
    chat_id: chatId,
    action: 'upload_photo'
  });
  
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=random`;
  
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, {
    chat_id: chatId,
    photo: imageUrl,
    caption: `🎨 Prompt: ${prompt}\nPowered by Pollinations AI`
  });
  
  return;
}



bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if(text === '/start') return;

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
          {role: "system", content: "তুমি XIFAT AI, বন্ধুসুলভ AI। বাংলায় উত্তর দিবা।"},
          {role: "user", content: text}
        ],
        max_tokens: 800
      })
    });

    let data = await res.json();
    let reply = data.choices[0].message.content;
    bot.sendMessage(chatId, reply);

  } catch(e) {
    bot.sendMessage(chatId, '❌ এরর হইছে। আবার ট্রাই করো।');
  }
});