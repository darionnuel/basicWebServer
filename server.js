require('dotenv').config();

const express = require('express');
const axios = require('axios');

const app = express();

const port = process.env.PORT || 3000;

// Middleware for parsing JSON bodies
app.use(express.json());

// Middleware for logging errors
app.use((err, req, res, next) => {
  console.error(`${err.message || err}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// function to get address using IP
const getAddress = async (ip) => {
  // handle localhost seperately
  if (ip === '127.0.0.1' || ip === '::1') {
    return { city: 'localhost' };
  }
  try {
    // using ip-api api
    const { data } = await axios.get(`http://ip-api.com/json/${ip}`);
    return data;
  } catch (err) {
    throw new Error('Could not fetch location data');
  }
};

// function to get temperature using the city
const getTemp = async (city) => {
  // check to ensure the OPENWEATHERMAP_API_KEY is set
  const key = process.env.OPENWEATHERMAP_API_KEY;
  if (!key) throw new Error('API key for OpenWeatherMap is missing');

  try {
    // Configure Axios to bypass proxy if needed
    const axiosInstance = axios.create({
      baseURL: 'http://api.openweathermap.org/data/2.5/',
      proxy: false, // Disable proxy
    });

    // using the OpenWeatherMap api
    const { data } = await axiosInstance.get(`weather`, {
      params: {
        q: city,
        appid: key,
        units: 'metric',
      },
    });
    return data.main.temp;
  } catch (err) {
    if (err.response && err.response.data && err.response.data.cod === '404') {
      console.error('City not found:', city);
      throw new Error(`City not found: ${city}`);
    }
    console.error(
      'Error fetching temperature data:',
      err.response?.data || err.message || err
    );
    throw new Error('Unable to fetch temperature');
  }
};

// route handler
app.get('/api/hello', async (req, res, next) => {
  try {
    const visitorName = req.query.visitor_name || 'Guest';
    const clientIp =
      req.headers['x-forwarded-for']?.split(',').shift() ||
      req.connection.remoteAddress;

    const location = await getAddress(clientIp);
    let city = location.city || 'Unknown';

    // Use a default city if 'Unknown' or 'localhost'
    if (city === 'Unknown' || city === 'localhost') {
      city = 'New York'; // You can choose any default city
    }

    const temperature = await getTemp(city);

    const greeting = `Hello, ${visitorName}!, the temperature is ${temperature} degrees Celsius in ${city}`;

    res.json({
      client_ip: clientIp,
      location: city,
      greeting,
    });
  } catch (err) {
    next(err);
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
