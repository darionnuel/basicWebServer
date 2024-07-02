require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

const port = process.env.PORT || 3000;

// Middleware for logging errors
app.use((err, req, res, next) => {
  console.error(`${err.message || err}`);
  res.status(500).json({ error: "Internal Server Error" });
});

// function to get address using IP
const getAddress = async (ip) => {
  // to handle localhost seperately
  if (ip === "127.0.0.1" || ip === "::1") {
    return { city: "localhost" };
  }
  try {
    // using ip-api api
    const { data } = await axios.get(`http://ip-api.com/json/${ip}`);
    return data;
  } catch (err) {
    console.error(`Error fetching location data: ${err.message}`);
    throw new Error("Could not fetch location data");
  }
};

// function to get temperature using the city
const getTemp = async (city) => {
  // check to ensure the OPENWEATHERMAP_API_KEY is set
  const key = process.env.OPENWEATHERMAP_API_KEY;
  if (!key) throw new Error("API key for OpenWeatherMap is missing");

  try {
    // using the OpenWeatherMap api
    const { data } = await axios.get(
      `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`
    );
    return data.main.temp;
  } catch (err) {
    console.error(`Error fetching temperature data: ${err.message}`);
    throw new Error("Unable to fetch temperature");
  }
};

// route handler
app.get("/api/hello", async (req, res, next) => {
  try {
    const visitorName = req.query.visitor_name || "Guest";
    const clientIp =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    const location = await getAddress(clientIp);
    const city = location.city || "Unknown";
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
