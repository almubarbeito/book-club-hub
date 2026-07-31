const axios = require('axios');

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { query } = JSON.parse(event.body || '{}');

    if (!query || !query.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing search query' })
      };
    }

    if (!GOOGLE_BOOKS_API_KEY) {
      console.error('CRITICAL: GOOGLE_BOOKS_API_KEY is not set in environment.');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error.' })
      };
    }

    const fullUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query.trim())}&maxResults=10&key=${GOOGLE_BOOKS_API_KEY}`;
    const response = await axios.get(fullUrl);
    const data = response.data;

    const results = (data.items || []).map(item => {
      const v = item.volumeInfo || {};
      return {
        title: v.title || 'No Title',
        author: Array.isArray(v.authors) ? v.authors.join(', ') : 'Unknown Author',
        cover: v.imageLinks?.thumbnail?.replace('http:', 'https:') || v.imageLinks?.smallThumbnail?.replace('http:', 'https:') || null,
        pageCount: v.pageCount || null
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ results })
    };
  } catch (error) {
    if (error.response) {
      console.error('Error searching books (data):', error.response.data);
      console.error('Error searching books (status):', error.response.status);
      return {
        statusCode: error.response.status,
        body: JSON.stringify({
          error: error.response.data?.error?.message || 'Google Books search failed.'
        })
      };
    }

    console.error('Error searching books (message):', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to search books.' })
    };
  }
};