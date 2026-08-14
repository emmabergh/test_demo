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
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/weather', async (req, res) => {
  const city = req.query.city;

  if (typeof city !== 'string' || !city.trim()) {
    return res.status(400).json({ error: 'City query parameter is required' });
  }

  const normalizedCity = city.trim();

  if (normalizedCity.length > 100) {
    return res.status(400).json({ error: 'City must be 100 characters or less' });
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new DOMException('Weather service timed out', 'TimeoutError'));
  }, 5000);

  try {
    const geocodeResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(normalizedCity)}&count=1&language=en&format=json`,
      { signal: abortController.signal }
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
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=celsius`,
      { signal: abortController.signal }
    );

    if (!weatherResponse.ok) {
      return res.status(502).json({ error: 'Failed to fetch weather data' });
    }

    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    const currentUnits = weatherData.current_units || {};

    if (!current) {
      return res.status(502).json({ error: 'Weather data is unavailable' });
    }

    return res.json({
      city: location.name,
      temperature: current.temperature_2m,
      conditions: WEATHER_CODE_MAP[current.weather_code] || 'Unknown',
      windSpeed: current.wind_speed_10m,
      temperatureUnit: currentUnits.temperature_2m || '°C',
      windSpeedUnit: currentUnits.wind_speed_10m || 'km/h'
    });
  } catch (error) {
    if (abortController.signal.aborted && abortController.signal.reason?.name === 'TimeoutError') {
      return res.status(504).json({ error: 'Weather service timed out' });
    }

    return res.status(500).json({ error: 'Unexpected server error' });
  } finally {
    clearTimeout(timeoutId);
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Weather app listening on port ${port}`);
  });
}

module.exports = app;
