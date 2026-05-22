const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_PROMPT = `
You are the AI Assistant for "SHOPPER", a modern e-commerce platform. 
Your goal is to help customers with their inquiries regarding products, orders, and general shipping information.
Be polite, professional, and helpful. 

Our categories are: Women, Men, and Kids.
We offer a wide range of clothing, from flutter sleeve blouses to bomber jackets and sweatshirts.

If you don't know the answer to a specific question (like order status for a specific ID), ask the user for their email or order number and tell them a human support representative will look into it, but try to answer general questions yourself.
Keep your responses relatively concise.
`;

async function getAIResponse(userMessage, chatHistory = []) {
  if (!genAI) {
    return "Hello! Our AI Assistant is currently being configured. How can I help you today? (Note: GEMINI_API_KEY is missing in backend)";
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3.5-flash",
      systemInstruction: SYSTEM_PROMPT
    });

    const chat = model.startChat({
      history: chatHistory.map(msg => ({
        role: msg.isAdmin ? "model" : "user",
        parts: [{ text: msg.message }],
      })),
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "I'm sorry, I'm having trouble processing your request right now. Please try again later.";
  }
}

module.exports = { getAIResponse };
