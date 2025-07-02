// File: netlify/functions/onboarding.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Securely get the API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const GEMINI_TEXT_MODEL = 'gemini-1.5-flash'; // Using a modern text model
const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002';      // Using a modern image model

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

    // --- First AI Call: Generate Character Name ---
    const characterPrompt = `Based on these literary preferences:
Genre - ${genre},
Reading Pace - ${pace},
Preferred Literary Adventure - "${adventure}",
suggest ONE famous and iconic protagonist from a well-known classic or popular novel that aligns with these preferences.
Return ONLY the full name of the character as a string.`;

    const textModel = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const characterResult = await textModel.generateContent(characterPrompt);
    const characterResponse = await characterResult.response;
    let characterName = characterResponse.text().trim().replace(/^["']|["']$/g, '');

    if (!characterName) {
      characterName = "The Ardent Reader"; // Fallback name
    }

    // --- Second AI Call: Generate Image ---
    let imageBase64Data = ''; // Default empty string
    const uniqueSeedForImage = userId.substring(0, 5) + userId.slice(-3);
    const imagePrompt = `A stylized profile avatar representing the literary character: ${characterName}. Emphasize iconic visual features or themes associated with them, suitable for a small profile picture. If the character is human, show their face. Make it artistic and visually appealing. Unique style variation seed: ${uniqueSeedForImage}.`;

    try {
        const imageModel = genAI.getGenerativeModel({ model: GEMINI_IMAGE_MODEL });
        const imageResult = await imageModel.generateContent([imagePrompt]);
        const imageResponse = await imageResult.response;

        // Assuming the response structure for images might be different, adapt as necessary.
        // This is a placeholder for how you might get the base64 data.
        // You'll need to check the actual response structure from the Gemini API.
        const firstPart = imageResponse.candidates[0].content.parts[0];
        if (firstPart && firstPart.inlineData) {
            imageBase64Data = `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
        }
    } catch (imgError) {
      console.error("Image generation failed, proceeding without image:", imgError);
      // We don't return an error here, we just proceed without an image
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