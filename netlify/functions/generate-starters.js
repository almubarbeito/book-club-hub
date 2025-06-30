// File: netlify/functions/generate-starters.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const GEMINI_TEXT_MODEL = 'gemini-1.5-flash';

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Get the book details from the frontend
    const { title, author, promptHint } = JSON.parse(event.body);

    if (!title || !author || !promptHint) {
      return { statusCode: 400, body: "Missing required book details." };
    }

    // --- The Secure AI Call ---
    const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const prompt = `Generate 3-4 engaging discussion starter questions for a book club reading "${title}" by ${author}. The book involves ${promptHint}. Questions should be open-ended and encourage deeper reflection on themes, characters, and plot. Present them as a simple list.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
        throw new Error("AI did not return any text.");
    }
    
    // Process the text on the server to return a clean array
    const startersArray = text.split('\n')
                              .map(s => s.trim().replace(/^- /,'').replace(/^\* /,'').replace(/^\d+\. /,''))
                              .filter(s => s.length > 5);

    // Send the clean array back to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({ starters: startersArray }),
    };

  } catch (error) {
    console.error("Error in generate-starters function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate discussion starters." }),
    };
  }
};