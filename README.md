# test_demo

Small Node.js weather app built with Express.

## Run

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## API

`GET /api/weather?city=<city>`

Example response:

```json
{
  "city": "London",
  "temperature": 22.1,
  "conditions": "Partly cloudy",
  "windSpeed": 14.2
}
```
