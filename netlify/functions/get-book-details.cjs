// File: netlify/functions/get-book-details.js
//const fetch = require('node-fetch');
const admin = require('firebase-admin');

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const fetch = (await import('node-fetch')).default;
    const { title, author } = JSON.parse(event.body);
    if (!title) return { statusCode: 400, body: "Title is required." };

    const query = encodeURIComponent(`intitle:${title}+inauthor:${author}`);
    const fullUrl = `${GOOGLE_BOOKS_API_URL}?q=${query}&maxResults=1&key=${GOOGLE_BOOKS_API_KEY}`;
    
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error("Google Books API request failed.");

    const data = await response.json();
    let description = "No description found for this book.";

    if (data.items && data.items.length > 0) {
      description = data.items[0].volumeInfo.description || description;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ description: description }),
    };

  } catch (error) {
    console.error("Error in get-book-details function:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to get book details." }) };
  }
};