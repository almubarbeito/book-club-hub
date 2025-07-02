// File: netlify/functions/get-book-details.cjs

const axios = require('axios'); // Uses the new, reliable library
const admin = require('firebase-admin'); // Keep your firebase admin

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { title, author } = JSON.parse(event.body);
    if (!title) {
      return { statusCode: 400, body: "Title is required." };
    }
    if (!GOOGLE_BOOKS_API_KEY) {
      console.error("CRITICAL: GOOGLE_BOOKS_API_KEY is not set in environment.");
      return { statusCode: 500, body: "Server configuration error." };
    }

    const query = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
    const fullUrl = `${GOOGLE_BOOKS_API_URL}?q=${query}&maxResults=1&key=${GOOGLE_BOOKS_API_KEY}`;
    
    // --- The Axios GET Request ---
    const response = await axios.get(fullUrl);
    const data = response.data; // The JSON is automatically parsed into response.data
    // ----------------------------

    let description = "No summary available for this title.";
    if (data.items && data.items.length > 0 && data.items[0].volumeInfo.description) {
      description = data.items[0].volumeInfo.description;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ description: description }),
    };

  } catch (error) {
    // Axios provides more detailed error info
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Error fetching book details (data):", error.response.data);
      console.error("Error fetching book details (status):", error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Error fetching book details (request):", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error fetching book details (message):', error.message);
    }
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to get book details." }) };
  }
};