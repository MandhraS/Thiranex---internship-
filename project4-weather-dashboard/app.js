const form = document.querySelector("#weather-form");
const cityInput = document.querySelector("#city-input");
const statusLine = document.querySelector("#status-line");
const searchButton = form.querySelector("button");

const fields = {
  locationName: document.querySelector("#location-name"),
  weatherArt: document.querySelector("#weather-art"),
  temperature: document.querySelector("#temperature"),
  condition: document.querySelector("#condition"),
  observedTime: document.querySelector("#observed-time"),
  humidity: document.querySelector("#humidity"),
  windSpeed: document.querySelector("#wind-speed"),
  pressure: document.querySelector("#pressure"),
  feelsLike: document.querySelector("#feels-like"),
  hourlyList: document.querySelector("#hourly-list"),
};

const weatherCodes = {
  0: ["Clear sky", "clear"],
  1: ["Mostly clear", "clear"],
  2: ["Partly cloudy", "cloud"],
  3: ["Overcast", "cloud"],
  45: ["Fog", "fog"],
  48: ["Rime fog", "fog"],
  51: ["Light drizzle", "rain"],
  53: ["Drizzle", "rain"],
  55: ["Dense drizzle", "rain"],
  56: ["Freezing drizzle", "rain"],
  57: ["Freezing drizzle", "rain"],
  61: ["Light rain", "rain"],
  63: ["Rain", "rain"],
  65: ["Heavy rain", "rain"],
  66: ["Freezing rain", "rain"],
  67: ["Freezing rain", "rain"],
  71: ["Light snow", "snow"],
  73: ["Snow", "snow"],
  75: ["Heavy snow", "snow"],
  77: ["Snow grains", "snow"],
  80: ["Rain showers", "rain"],
  81: ["Rain showers", "rain"],
  82: ["Heavy showers", "rain"],
  85: ["Snow showers", "snow"],
  86: ["Heavy snow showers", "snow"],
  95: ["Thunderstorm", "storm"],
  96: ["Thunderstorm with hail", "storm"],
  99: ["Thunderstorm with hail", "storm"],
};

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle("error", isError);
}

function setLoading(isLoading) {
  searchButton.disabled = isLoading;
  searchButton.querySelector("span").textContent = isLoading ? "Loading" : "Search";
}

async function fetchJson(url, errorMessage) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`${errorMessage} Check your internet connection.`);
  }

  if (!response.ok) {
    throw new Error(`${errorMessage} The server returned ${response.status}.`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${errorMessage} The response was not valid JSON.`);
  }
}

async function geocodeCity(city) {
  const params = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });
  const data = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    "Could not search for that city."
  );

  if (!Array.isArray(data.results) || data.results.length === 0) {
    throw new Error(`No weather location found for "${city}".`);
  }

  return data.results[0];
}

async function fetchWeather(location) {
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "surface_pressure",
      "wind_speed_10m",
    ].join(","),
    hourly: "temperature_2m,relative_humidity_2m",
    forecast_days: "1",
    timezone: "auto",
  });

  return fetchJson(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    "Could not fetch live weather."
  );
}

function formatObservedTime(isoTime) {
  return new Intl.DateTimeFormat([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoTime));
}

function renderCurrentWeather(location, weather) {
  const current = weather.current;
  const units = weather.current_units;

  if (!current || !units) {
    throw new Error("The weather API returned an unexpected data shape.");
  }

  const [conditionText, artClass] = weatherCodes[current.weather_code] || ["Current conditions", "cloud"];
  const region = [location.admin1, location.country].filter(Boolean).join(", ");

  fields.locationName.textContent = `${location.name}${region ? `, ${region}` : ""}`;
  fields.weatherArt.className = `weather-art ${artClass}`;
  fields.temperature.textContent = `${Math.round(current.temperature_2m)}${units.temperature_2m}`;
  fields.condition.textContent = conditionText;
  fields.observedTime.textContent = `Observed ${formatObservedTime(current.time)}`;
  fields.humidity.textContent = `${current.relative_humidity_2m}${units.relative_humidity_2m}`;
  fields.windSpeed.textContent = `${Math.round(current.wind_speed_10m)} ${units.wind_speed_10m}`;
  fields.pressure.textContent = `${Math.round(current.surface_pressure)} ${units.surface_pressure}`;
  fields.feelsLike.textContent = `${Math.round(current.apparent_temperature)}${units.apparent_temperature}`;
}

function renderHourlyForecast(weather) {
  const hourly = weather.hourly;
  const units = weather.hourly_units;

  if (!hourly?.time || !hourly?.temperature_2m || !hourly?.relative_humidity_2m) {
    fields.hourlyList.innerHTML = "";
    return;
  }

  const now = new Date(weather.current.time).getTime();
  const nextHours = hourly.time
    .map((time, index) => ({
      time,
      temp: hourly.temperature_2m[index],
      humidity: hourly.relative_humidity_2m[index],
    }))
    .filter((hour) => new Date(hour.time).getTime() >= now)
    .slice(0, 6);

  fields.hourlyList.innerHTML = nextHours
    .map((hour) => {
      const time = new Intl.DateTimeFormat([], { hour: "numeric" }).format(new Date(hour.time));
      return `
        <div class="hour">
          <time datetime="${hour.time}">${time}</time>
          <strong>${Math.round(hour.temp)}${units.temperature_2m}</strong>
          <span>${hour.humidity}${units.relative_humidity_2m} humidity</span>
        </div>
      `;
    })
    .join("");
}

async function loadWeather(city) {
  const trimmedCity = city.trim();

  if (!trimmedCity) {
    setStatus("Enter a city name to get live weather.", true);
    cityInput.focus();
    return;
  }

  setLoading(true);
  setStatus(`Fetching live weather for ${trimmedCity}...`);

  try {
    const location = await geocodeCity(trimmedCity);
    const weather = await fetchWeather(location);
    renderCurrentWeather(location, weather);
    renderHourlyForecast(weather);
    setStatus(`Updated with live data from Open-Meteo.`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadWeather(cityInput.value);
});

loadWeather(cityInput.value);
