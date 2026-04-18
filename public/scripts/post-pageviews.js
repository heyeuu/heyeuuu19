const pageviewsRoots = document.querySelectorAll("[data-pageviews-root]");

async function loadPageviews(root) {
  if (
    !(root instanceof HTMLElement) ||
    root.dataset.pageviewsLoaded === "true"
  ) {
    return;
  }

  const value = root.querySelector("[data-pageviews-value]");
  const apiUrl = root.dataset.apiUrl;
  const fallbackPath = root.dataset.fallbackPath;

  if (!(value instanceof HTMLElement) || !apiUrl) {
    return;
  }

  root.dataset.pageviewsLoaded = "true";

  try {
    const path = window.location.pathname || fallbackPath;
    const requestUrl = new URL(apiUrl);

    requestUrl.searchParams.set("path", path || "/");

    const response = await fetch(requestUrl.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    const data = await response.json();
    const pageviews = Number(data.pageviews ?? 0);

    value.textContent = new Intl.NumberFormat().format(pageviews);
  } catch (error) {
    console.error("Failed to load Umami pageviews.", error);
    value.textContent = "N/A";
  }
}

pageviewsRoots.forEach((root) => {
  void loadPageviews(root);
});
