import { getWeather, getQuote, getNews, weatherCondition } from "./live-api.js";

const node = (tag, text, className) => {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
};
const checkedAt = () =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  }).format(new Date()) + " Cairo time";
// Detached parsing decodes headline entities; API markup is never inserted into the page.
const plainText = (text) =>
  new DOMParser().parseFromString(text, "text/html").body.textContent || "";

function connectFeed(name, load, render) {
  const button = document.getElementById(`refresh-${name}`);
  const content = document.getElementById(`${name}-content`);
  const status = document.getElementById(`${name}-status`);
  let busy = false;
  button.hidden = false;
  async function refresh() {
    if (busy) return;
    busy = true;
    button.disabled = true;
    content.setAttribute("aria-busy", "true");
    status.classList.remove("api-error");
    status.textContent = `Loading ${name === "weather" ? "Cairo weather" : name === "news" ? "Egypt fitness news" : "a quote"}…`;
    try {
      const result = await load();
      content.replaceChildren();
      const message = render(result, content);
      status.textContent = message || `Updated ${checkedAt()}`;
    } catch {
      status.textContent = `Couldn’t load ${name} right now. Please try again.${content.childElementCount ? " Previously loaded content remains below." : ""}`;
      status.classList.add("api-error");
    } finally {
      busy = false;
      button.disabled = false;
      content.setAttribute("aria-busy", "false");
    }
  }
  button.addEventListener("click", refresh);
  refresh();
  return refresh;
}

connectFeed("weather", getWeather, (weather, content) => {
  const [icon, condition] = weatherCondition(
    weather.weather_code,
    weather.is_day,
  );
  const value = node("p", "", "weather-value");
  const symbol = node("span", icon);
  symbol.setAttribute("aria-hidden", "true");
  value.append(
    symbol,
    document.createTextNode(` ${Math.round(weather.temperature_2m)}°C`),
  );
  content.append(
    value,
    node("p", condition),
    node(
      "p",
      `${Number.isFinite(weather.wind_speed_10m) ? `Wind ${weather.wind_speed_10m} km/h · ` : ""}Cairo · ${weather.time.replace("T", " ")} (local time)`,
      "weather-details",
    ),
  );
});

connectFeed("quote", getQuote, (quote, content) => {
  content.append(
    node("blockquote", `“${quote.quote}”`),
    node("p", `— ${quote.author}`, "quote-author"),
  );
});

const topic = document.getElementById("news-topic");
const refreshNews = connectFeed(
  "news",
  async () => {
    topic.disabled = true;
    try {
      return await getNews(topic.value);
    } finally {
      topic.disabled = false;
    }
  },
  (result, content) => {
    for (const item of result.articles) {
      const card = node("article", "", "news-card");
      const date = node(
        "time",
        new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(new Date(item.date.slice(0, 10) + "T12:00:00")),
        "news-date",
      );
      date.dateTime = item.date.slice(0, 10);
      const heading = node("h4", "");
      const link = node("a", plainText(item.title.rendered));
      link.href = item.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      heading.append(link);
      card.append(date, heading, node("p", "EGYPTIAN STREETS ↗", "text-link"));
      content.append(card);
    }
    if (!result.articles.length)
      return topic.value === "hyrox"
        ? "No HYROX articles found in this source. Check the official race calendar below for confirmed events."
        : "No matching articles found in this source. Try another topic.";
    return `${result.partial ? "Some topics couldn’t load. " : ""}${result.articles.length} stories · Checked ${checkedAt()}`;
  },
);
topic.addEventListener("change", refreshNews);
