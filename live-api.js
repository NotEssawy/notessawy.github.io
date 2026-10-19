// Public, key-free APIs. Each request has a bounded timeout.
export async function getJSON(url, fetcher = fetch, timeout = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Service returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function weatherCondition(code, day = 1) {
  if (code === 0) return [day ? "☀️" : "🌙", "Clear sky"];
  if ([1, 2].includes(code)) return ["⛅", "Partly cloudy"];
  if (code === 3) return ["☁️", "Overcast"];
  if ([45, 48].includes(code)) return ["🌫️", "Fog"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["🌦️", "Drizzle"];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["🌧️", "Rain"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["🌨️", "Snow"];
  if ([95, 96, 99].includes(code)) return ["⛈️", "Thunderstorm"];
  return ["🌡️", "Conditions unavailable"];
}

export async function getWeather(fetcher = fetch) {
  const data = await getJSON(
    "https://api.open-meteo.com/v1/forecast?latitude=30.0444&longitude=31.2357&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=Africa%2FCairo",
    fetcher,
  );
  const current = data?.current;
  if (
    !current ||
    !Number.isFinite(current.temperature_2m) ||
    !Number.isInteger(current.weather_code) ||
    typeof current.time !== "string"
  )
    throw new Error("Weather data unavailable");
  return current;
}

export async function getQuote(fetcher = fetch) {
  const data = await getJSON("https://dummyjson.com/quotes/random", fetcher);
  if (
    typeof data?.quote !== "string" ||
    !data.quote.trim() ||
    typeof data.author !== "string"
  )
    throw new Error("Quote data unavailable");
  return data;
}

export function normalizeNews(data) {
  if (!Array.isArray(data)) throw new Error("News data unavailable");
  return data.filter((item) => {
    try {
      const url = new URL(item.link);
      return (
        url.protocol === "https:" &&
        url.hostname === "egyptianstreets.com" &&
        typeof item.title?.rendered === "string" &&
        /^\d{4}-\d{2}-\d{2}T/.test(item.date) &&
        Number.isFinite(Date.parse(item.date))
      );
    } catch {
      return false;
    }
  });
}

export async function getNews(topic = "all", fetcher = fetch) {
  const terms =
    topic === "hyrox"
      ? ["hyrox"]
      : topic === "marathon"
        ? ["marathon"]
        : ["fitness", "marathon", "hyrox"];
  const results = await Promise.allSettled(
    terms.map((term) =>
      getJSON(
        `https://egyptianstreets.com/wp-json/wp/v2/posts/?search=${term}&per_page=20&_fields=id,date,link,title`,
        fetcher,
      ).then(normalizeNews),
    ),
  );
  const successes = results.filter((result) => result.status === "fulfilled");
  if (!successes.length) {
    console.error(
      "News requests failed",
      JSON.stringify(results.map((result) => String(result.reason))),
    );
    throw new Error("News service unavailable");
  }
  const unique = new Map();
  for (const result of successes)
    for (const item of result.value) {
      // Searches include article bodies; keep visible headlines focused on fitness.
      if (
        /hyrox|fitness|marathon|triathlon|ironman|running|runners|gym\b|workout|sport.*equipment|healthy|wellness/i.test(
          item.title.rendered,
        )
      )
        unique.set(item.link, item);
    }
  return {
    articles: [...unique.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6),
    partial: successes.length !== terms.length,
  };
}
