const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const WEATHER_CODE_MAP = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm'
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/weather', async (req, res) => {
  const city = req.query.city;

  if (!city || !city.trim()) {
    return res.status(400).json({ error: 'City query parameter is required' });
  }

  try {
    const geocodeResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    if (!geocodeResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch location data' });
    }

    const geocodeData = await geocodeResponse.json();
    const location = geocodeData.results && geocodeData.results[0];

    if (!location) {
      return res.status(404).json({ error: 'City not found' });
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m`
    );

    if (!weatherResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch weather data' });
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;

    if (!current) {
      return res.status(502).json({ error: 'Weather data is unavailable' });
    }

    return res.json({
      city: location.name,
      temperature: current.temperature_2m,
      conditions: WEATHER_CODE_MAP[current.weather_code] || 'Unknown',
      windSpeed: current.wind_speed_10m
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

app.listen(port, () => {
  console.log(`Weather app listening on port ${port}`);
});
