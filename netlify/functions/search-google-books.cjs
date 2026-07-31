console.log("search-google-books function hit");
const axios = require('axios');

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_BOOKS_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

const OPEN_LIBRARY_API_URL = 'https://openlibrary.org/search.json';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGoogleBooksWithRetry(url, attempts = 3) {
  let lastError = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;

      // Reintenta solo en errores temporales
      if ((status === 503 || status === 429 || (status >= 500 && status < 600)) && i < attempts - 1) {
        await sleep(400 * (i + 1));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

async function fetchOpenLibraryFallback(query) {
  const url = `${OPEN_LIBRARY_API_URL}?q=${encodeURIComponent(query.trim())}&limit=10`;
  const response = await axios.get(url, { timeout: 10000 });
  const data = response.data;

  const results = (data.docs || []).map(doc => ({
    title: doc.title || 'No Title',
    author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : 'Unknown Author',
    cover: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    pageCount: null
  }));

  return results;
}

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

    // 1) Intentar Google Books
    if (GOOGLE_BOOKS_API_KEY) {
      try {
        const fullUrl = `${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query.trim())}&maxResults=10&key=${GOOGLE_BOOKS_API_KEY}`;
        const data = await fetchGoogleBooksWithRetry(fullUrl, 3);

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
          body: JSON.stringify({ results, source: 'google-books' })
        };
      } catch (error) {
        console.error('Google Books search failed, falling back to Open Library...');
        if (error.response) {
          console.error('Google Books error (data):', error.response.data);
          console.error('Google Books error (status):', error.response.status);
        } else {
          console.error('Google Books error (message):', error.message);
        }
      }
    } else {
      console.error('GOOGLE_BOOKS_API_KEY is not set in environment.');
    }

    // 2) Fallback a Open Library
    const fallbackResults = await fetchOpenLibraryFallback(query.trim());

    return {
      statusCode: 200,
      body: JSON.stringify({ results: fallbackResults, source: 'open-library' })
    };
  } catch (error) {
    console.error('Error searching books:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to search books.' })
    };
  }
};