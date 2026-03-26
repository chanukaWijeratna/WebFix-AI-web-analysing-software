const express = require('express');
const cors = require('cors');
const { scrapeUrl } = require('./scraper');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const data = await scrapeUrl(url);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Webscraper server running on http://localhost:${PORT}`);
});
