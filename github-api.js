// GitHub's public REST endpoint needs no API key or private account access.
export const REPOSITORIES_URL =
  "https://api.github.com/users/NotEssawy/repos?sort=updated&direction=desc&per_page=6&type=owner";

export async function fetchRepositories(fetcher = fetch, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(REPOSITORIES_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error(
          "GitHub is limiting requests right now. Please try again later or open my GitHub profile.",
        );
      }
      throw new Error(
        `GitHub could not load the projects (HTTP ${response.status}). Please try again.`,
      );
    }
    const data = await response.json();
    if (!Array.isArray(data))
      throw new Error(
        "GitHub returned an unexpected response. Please try again.",
      );
    // Validate the fields used by the UI before displaying remote data.
    return data.map((repo) => {
      if (
        !repo ||
        typeof repo.name !== "string" ||
        typeof repo.html_url !== "string"
      ) {
        throw new Error(
          "GitHub returned incomplete project data. Please try again.",
        );
      }
      const url = new URL(repo.html_url);
      if (url.origin !== "https://github.com")
        throw new Error("GitHub returned an unexpected project link.");
      return {
        name: repo.name,
        url: url.href,
        description:
          typeof repo.description === "string" && repo.description.trim()
            ? repo.description
            : "No description added on GitHub yet.",
        language:
          typeof repo.language === "string" ? repo.language : "Not specified",
        stars:
          Number.isInteger(repo.stargazers_count) && repo.stargazers_count >= 0
            ? repo.stargazers_count
            : 0,
        fork: repo.fork === true,
      };
    });
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("GitHub took too long to respond. Please try again.");
    if (error instanceof TypeError)
      throw new Error(
        "Could not reach GitHub. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
