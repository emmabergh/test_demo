'use strict';

const request = require('supertest');
const app = require('../server');

// Mock global fetch
global.fetch = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/weather', () => {
  test('returns 400 when city is missing', async () => {
    const res = await request(app).get('/api/weather');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('City query parameter is required');
  });

  test('returns 400 when city is empty', async () => {
    const res = await request(app).get('/api/weather?city=');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('City query parameter is required');
  });

  test('returns 400 when city is an array', async () => {
    const res = await request(app).get('/api/weather?city=a&city=b');
    expect(res.status).toBe(400);
  });

  test('returns 400 when city exceeds 100 characters', async () => {
    const longCity = 'a'.repeat(101);
    const res = await request(app).get(`/api/weather?city=${longCity}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('City must be 100 characters or less');
  });

  test('returns 404 when city is not found', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: null }),
    });

    const res = await request(app).get('/api/weather?city=UnknownCity');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('City not found');
  });

  test('returns weather data for a valid city', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ name: 'London', latitude: 51.5, longitude: -0.1 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 15,
            weather_code: 1,
            wind_speed_10m: 10,
          },
          current_units: {
            temperature_2m: '°C',
            wind_speed_10m: 'km/h',
          },
        }),
      });

    const res = await request(app).get('/api/weather?city=London');
    expect(res.status).toBe(200);
    expect(res.body.city).toBe('London');
    expect(res.body.temperature).toBe(15);
    expect(res.body.conditions).toBe('Mainly clear');
    expect(res.body.windSpeed).toBe(10);
  });

  test('returns 502 when geocode API fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    const res = await request(app).get('/api/weather?city=London');
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Failed to fetch location data');
  });

  test('returns 502 when weather API fails', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ name: 'London', latitude: 51.5, longitude: -0.1 }],
        }),
      })
      .mockResolvedValueOnce({ ok: false });

    const res = await request(app).get('/api/weather?city=London');
    expect(res.status).toBe(502);
    expect(res.body.error).toBe('Failed to fetch weather data');
  });
});
