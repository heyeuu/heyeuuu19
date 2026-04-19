const pageviewsRoots = document.querySelectorAll("[data-pageviews-root]");

function getPageviewsValue(metric) {
  if (typeof metric === "number" && Number.isFinite(metric)) {
    return metric;
  }

  if (
    metric &&
    typeof metric === "object" &&
    typeof metric.value === "number" &&
    Number.isFinite(metric.value)
  ) {
    return metric.value;
  }

  return 0;
}

async function loadPageviews(root) {
  if (
    !(root instanceof HTMLElement) ||
    root.dataset.pageviewsLoaded === "true"
  ) {
    return;
  }

  const value = root.querySelector("[data-pageviews-value]");
  const apiUrl = root.dataset.apiUrl;

  if (!(value instanceof HTMLElement) || !apiUrl) {
    return;
  }

  root.dataset.pageviewsLoaded = "true";

  try {
    const requestUrl = new URL(apiUrl, window.location.origin);

    const response = await fetch(requestUrl.toString(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const details = await response.text();

      throw new Error(
        `Unexpected response: ${response.status}${details ? ` ${details}` : ""}`,
      );
    }

    const data = await response.json();
    const pageviews = getPageviewsValue(data.pageviews);

    value.textContent = new Intl.NumberFormat().format(pageviews);
  } catch (error) {
    console.error("Failed to load Umami pageviews.", error);
    value.textContent = "N/A";
  }
}

pageviewsRoots.forEach((root) => {
  void loadPageviews(root);
});
