import { fetchRepositories } from "./github-api.js";

const grid = document.querySelector("#repository-grid");
const feedback = document.querySelector("#repository-status");
const refresh = document.querySelector("#refresh-projects");
const updated = document.querySelector("#repository-updated");
let loading = false;

function textElement(tag, text, className) {
  const element = document.createElement(tag);
  // Remote descriptions are text, never executable HTML.
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function repositoryCard(repo) {
  const card = document.createElement("article");
  card.className = "repository-card";
  card.append(
    textElement(
      "p",
      repo.fork ? "FORKED REPOSITORY" : "PUBLIC REPOSITORY",
      "eyebrow",
    ),
  );
  const heading = document.createElement("h3");
  const link = textElement("a", repo.name);
  link.href = repo.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  heading.append(link);
  card.append(
    heading,
    textElement("p", repo.description, "repository-description"),
  );
  const metadata = document.createElement("div");
  metadata.className = "repository-metadata";
  metadata.append(
    textElement("span", `Language: ${repo.language}`),
    textElement(
      "span",
      `★ ${repo.stars} ${repo.stars === 1 ? "star" : "stars"}`,
    ),
  );
  card.append(metadata);
  return card;
}

async function loadProjects() {
  if (loading) return;
  loading = true;
  refresh.disabled = true;
  refresh.textContent = "Loading…";
  grid.setAttribute("aria-busy", "true");
  feedback.textContent = "Loading public projects from GitHub…";
  feedback.classList.remove("api-error");
  grid.replaceChildren();
  updated.textContent = "";
  try {
    const repositories = await fetchRepositories();
    grid.replaceChildren(...repositories.map(repositoryCard));
    feedback.textContent = repositories.length
      ? `Showing ${repositories.length} recently updated public ${repositories.length === 1 ? "repository" : "repositories"}.`
      : "No public repositories are available yet. You can explore my other work above.";
    updated.textContent = `Last loaded at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch (error) {
    feedback.textContent =
      error.message || "Could not load projects. Please try again.";
    feedback.classList.add("api-error");
  } finally {
    loading = false;
    grid.setAttribute("aria-busy", "false");
    refresh.disabled = false;
    refresh.textContent = "Refresh projects";
  }
}

refresh.hidden = false;
refresh.addEventListener("click", loadProjects);
loadProjects();
