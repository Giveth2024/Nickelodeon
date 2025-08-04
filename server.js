const express = require('express');
const fetch = require('node-fetch');

const app = express();

const cors = require('cors');
app.use(cors());


const SOURCE_BASE = 'http://23.237.104.106:8080/USA_NICKELODEON';

app.get('/playlist.m3u8', async (req, res) => {
  try {
    // Fetch the original playlist
    const response = await fetch(`${SOURCE_BASE}/tracks-v1a1/mono.m3u8`);
    let playlistText = await response.text();

    // Rewrite .ts segment URLs to proxy via this server
    // For example, if segment URL is "2025/08/04/19/21/26-05005.ts"
    // change it to "/segments/2025/08/04/19/21/26-05005.ts"
    playlistText = playlistText.replace(
      /(\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d{2}-\d+\.ts)/g,
      (match) => `/segments/${match}`
    );

    // Return modified playlist
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    res.send(playlistText);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching playlist');
  }
});

app.get('/segments/:year/:month/:day/:hour/:minute/:segment', async (req, res) => {
  try {
    const { year, month, day, hour, minute, segment } = req.params;

    const segmentUrl = `${SOURCE_BASE}/${year}/${month}/${day}/${hour}/${minute}/${segment}`;

    // Proxy the segment directly
    const segmentResponse = await fetch(segmentUrl);
    if (!segmentResponse.ok) {
      return res.status(segmentResponse.status).send('Segment not found');
    }

    // Set proper headers
    res.set('Content-Type', 'video/MP2T');

    // Pipe the segment stream to response
    segmentResponse.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching segment');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`HLS proxy server running on port ${PORT}`);
});
