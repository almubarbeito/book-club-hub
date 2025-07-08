// File: netlify/functions/onboarding.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Securely get the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const GEMINI_MODEL = 'gemini-1.5-pro-latest';

exports.handler = async function (event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Get the user's preferences from the frontend
    const { genre, pace, adventure, userId } = JSON.parse(event.body);

    if (!genre || !pace || !adventure || !userId) {
      return { statusCode: 400, body: "Missing required preferences." };
    }

// --- NEW: The Single, Combined Prompt ---
    const uniqueSeedForImage = userId.substring(0, 5) + userId.slice(-3);
    const combinedPrompt = `
      Based on these literary preferences:
      - Genre: ${genre}
      - Reading Pace: ${pace}
      - Preferred Literary Adventure: "${adventure}"

      Follow these two steps:
      1. First, suggest ONE famous and iconic protagonist from a well-known classic or popular novel that aligns with these preferences.
      2. Second, generate a stylized, artistic profile avatar of that literary character. The style should be suitable for a small profile picture. If the character is human, show their face. Use this unique style seed: ${uniqueSeedForImage}.

      Your response MUST contain both the character name and the generated image.
    `;

    // --- The Single AI Call ---
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent([combinedPrompt]); // We only call the AI once
    const response = await result.response;

    let characterName = "The Ardent Reader"; // Default fallback
    let imageBase64Data = ''; // Default fallback

    // --- Process the Multi-Part Response ---
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        // Find the text part
        const textPart = response.candidates[0].content.parts.find(part => part.text);
        if (textPart) {
            characterName = textPart.text.trim().replace(/["']/g, '') || characterName;
        }

        // Find the image part
        const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            imageBase64Data = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
    }

    // --- Final Step: Send BOTH results back to the frontend ---
    return {
      statusCode: 200,
      body: JSON.stringify({
        pseudonym: characterName,
        imageBase64: imageBase64Data,
      }),
    };

  } catch (error) {
    console.error("Error in onboarding function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process onboarding request." }),
    };
  }
};