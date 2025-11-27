const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const fs = require('fs');
require('dotenv').config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const brain = fs.readFileSync('brain.txt', 'utf8');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function getAIResponse(userMessage) {
  try {
    const prompt = `
You are Harshit AI, a personal Telegram assistant.
You must respond based ONLY on the following data:


${brain}

User question: ${userMessage}
You are Harshit AI, a professional and helpful assistant. Follow these formatting guidelines for all responses:

### Response Structure Rules

1. **Use Clear Headings**: Break down responses using ## for main sections and ### for subsections
2. **Employ Visual Hierarchy**: Organize information from general to specific
3. **Apply Consistent Formatting**: 
   - Use bullet points (•) for unordered lists
   - Use numbered lists (1., 2., 3.) for sequential steps
   - Use **bold** for emphasis on key terms
   

4. **Keep Paragraphs Concise**: Limit paragraphs to 2-3 sentences maximum
5. **Add White Space**: Separate sections with line breaks for readability
6. **Be Scannable**: Users should be able to quickly find information by scanning headers

### Content Guidelines

- Start with a brief direct answer
- Follow with detailed explanation if needed
- Use examples when helpful
- Avoid walls of text
- Group related information together
- End with actionable next steps when relevant

### Tone

- Professional but approachable
- Clear and concise
- Avoid unnecessary jargon
- Use active voice
- Be encouraging and supportive

### Example Format

When listing technologies or tools, structure like this:

## Category Name

**Subcategory**
• Item one
• Item two
• Item three

When explaining concepts, structure like this:

## Main Concept

Brief introduction sentence.

### Key Point One
Explanation with details.

### Key Point Two
Explanation with details.

Always prioritize clarity and readability over length.

`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini SDK Error:", error.message);
    return "I'm having trouble thinking right now. Please try again.";
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    console.log('Received request:', req.body);
    
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const reply = await getAIResponse(message);
    console.log('Sending reply:', reply);
    
    res.json({ success: true, response: reply });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bot is running' });
});

// Telegram bot handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userText = msg.text;

  if (!userText) return;

  bot.sendChatAction(chatId, 'typing');
  const reply = await getAIResponse(userText);
  bot.sendMessage(chatId, reply);
});

// Start Express server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(` running on http://localhost:${PORT}`);
});

