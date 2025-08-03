// 📚 Express + Axios + Cheerio API to scrape books.toscrape.com

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = 3000;

// 🧠 In-memory cache to simulate local storage
const bookCache = {}; // { 1: [...books], 2: [...books], etc }

// 📘 Scrape a specific page from books.toscrape.com
async function scrapeBooksPage(pageNumber = 1) {
  const url = `http://books.toscrape.com/catalogue/page-${pageNumber}.html`;
  try {
    const res = await axios.get(url);
    const $ = cheerio.load(res.data);

    const books = [];
    $('.product_pod').each((i, el) => {
      const title = $(el).find('h3 a').attr('title');
      const price = $(el).find('.price_color').text();
      const image = $(el).find('img').attr('src');
      const fullImage = image ? `http://books.toscrape.com/${image.replace('../', '')}` : '';

      books.push({ title, price, image: fullImage });
    });

    return books;
  } catch (err) {
    return null; // Invalid or non-existent page
  }
}

// 🚀 API endpoint: /books?pageNumber=1
app.get('/books', async (req, res) => {
  const pageNumber = parseInt(req.query.pageNumber) || 1;

  // Check cache first
  if (bookCache[pageNumber]) {
    return res.json({ page: pageNumber, cached: true, books: bookCache[pageNumber] });
  }

  const books = await scrapeBooksPage(pageNumber);

  if (!books) {
    return res.status(404).json({ error: 'Page not found or failed to scrape.' });
  }

  // Store in memory (simulate local storage)
  bookCache[pageNumber] = books;
  res.json({ page: pageNumber, cached: false, books });
});

// 🔍 API: /booksearch?q=alice
app.get('/booksearch', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing search query.' });

  try {
    const result = await axios.get(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`);
    const books = result.data.results.map((book, i) => {
      const plainText = Object.entries(book.formats).find(([type]) => type.includes('text/plain'))?.[1];
      return {
        id: book.id,
        index: i + 1,
        title: book.title,
        author: book.authors?.[0]?.name || 'Unknown',
        text_url: plainText || null
      };
    }).filter(b => b.text_url);

    res.json({ results: books });
  } catch (err) {
    console.error("booksearch error:", err.message);
    res.status(500).json({ error: 'Failed to fetch book search.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
