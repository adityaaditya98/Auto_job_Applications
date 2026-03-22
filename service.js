import { chromium } from "playwright";

const DEFAULT_TIMEOUT = 60000000;
const DEFAULT_NAVIGATION_TIMEOUT = 45000;
const DEFAULT_SELECTOR_TIMEOUT = 15000;

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasUsableUrl(value) {
  return typeof value === "string" && value.trim() !== "" && value.trim() !== "N/A";
}

async function gotoAndWaitForSelector(page, url, selector, options = {}) {
  const timeout = Number(options.timeout ?? DEFAULT_NAVIGATION_TIMEOUT);
  const waitUntil = options.waitUntil || "domcontentloaded";
  const selectorTimeout = Number(options.selectorTimeout ?? DEFAULT_SELECTOR_TIMEOUT);

  await page.goto(url, {
    waitUntil,
    timeout
  });

  await page.waitForSelector(selector, { timeout: selectorTimeout });
}

function buildNormalizedJob(job) {
  return {
    jobTitle: normalizeString(job.jobTitle || job.title || job.fullTitle),
    companyName: normalizeString(job.companyName || job.company),
    location: normalizeString(job.location || job.workplace),
    jobDescription: normalizeString(job.jobDescription || job.description),
    jobUrl: hasUsableUrl(job.jobUrl)
      ? job.jobUrl.trim()
      : hasUsableUrl(job.link)
        ? job.link.trim()
        : ""
  };
}

function mergeTextValues(...values) {
  const merged = [];

  for (const value of values) {
    const normalized = normalizeString(value);
    if (!normalized) {
      continue;
    }

    const alreadyIncluded = merged.some((existing) => existing.toLowerCase() === normalized.toLowerCase());
    if (!alreadyIncluded) {
      merged.push(normalized);
    }
  }

  return merged.join(" | ");
}

function matchesFilters(job, keyword, location) {
  const keywordNeedle = normalizeString(keyword).toLowerCase();
  const locationNeedle = normalizeString(location).toLowerCase();
  const searchableText = [job.jobTitle, job.companyName, job.location, job.jobDescription]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const keywordMatch = !keywordNeedle || searchableText.includes(keywordNeedle);
  const locationMatch = !locationNeedle || searchableText.includes(locationNeedle);
  return keywordMatch && locationMatch;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(Number(concurrency) || 1, items.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function getJobDetailsInformation(url) {
  console.log("Scraping job details...");
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await gotoAndWaitForSelector(page, url, ".container.container--indent .detail-page", {
      timeout: DEFAULT_TIMEOUT,
      selectorTimeout: DEFAULT_SELECTOR_TIMEOUT
    });

    const jobDetail = await page.evaluate(() => {
      const getText = (selector) => document.querySelector(selector)?.innerText.trim() || "N/A";
      const getListItem = (label) => {
        const items = Array.from(document.querySelectorAll(".overview__text ul.il li"));
        const item = items.find((li) => li.innerText.includes(label));
        return item ? item.innerText.replace(label, "").trim() : "N/A";
      };

      return {
        title: getText(".overview__head h1"),
        company: getText(".overview__head .head__children"),
        reference: getText(".overview__reference-number"),
        fullTitle: getListItem("Full job title:"),
        workingHours: getListItem("Working hours:"),
        workplace: getListItem("Workplace:"),
        type: getListItem("Type of job offer:"),
        contract: getListItem("Type of employment contract:"),
        onlineSince: getListItem("Online since:"),
        description: getText(".detail-page__description"),
        contactEmail: (() => {
          const mailElem = document.querySelector('.additional__text a[href^="mailto:"]');
          if (!mailElem) return "N/A";

          const href = mailElem.getAttribute("href");
          if (!href) return "N/A";

          try {
            return decodeURIComponent(href.replace(/^mailto:/, ""));
          } catch {
            return "N/A";
          }
        })(),
        contactPhone:
          document.querySelector('.additional__address a[href^="tel:"]')?.innerText.trim() || "N/A",
        companyAddress: getText(".additional__address")
      };
    });

    console.log("Extracted job details.");
    if (jobDetail !== null && jobDetail !== undefined) {
      if (
        jobDetail.contactEmail === "N/A" ||
        jobDetail.contactEmail === null ||
        jobDetail.contactEmail === undefined ||
        jobDetail.contactEmail.length < 5
      ) {
        return {
          ...jobDetail,
          contactEmailInformation: false,
          url
        };
      }

      if (jobDetail.description.length > 10) {
        return {
          ...jobDetail,
          contactEmailInformation: true,
          url
        };
      }
    }

    return jobDetail ? { ...jobDetail, contactEmailInformation: false, url } : null;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function fetchJobDetails(count) {
  console.log(`Fetching job listings from page ${count}...`);
  const browser = await chromium.launch({ headless: true });

  try {
    console.log("Fetching data...");
    const page = await browser.newPage();
    await gotoAndWaitForSelector(
      page,
      `https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bfilter%5D%5B0%5D=topjobs%3A4&tx_solr%5Bpage%5D=${count}#list45536`,
      ".card.card--job",
      {
        timeout: DEFAULT_NAVIGATION_TIMEOUT,
        selectorTimeout: DEFAULT_SELECTOR_TIMEOUT
      }
    );

    const jobs = await page.$$eval(".card.card--job", (elements) =>
      elements
        .map((el) => {
          const title = el.querySelector("h3 a")?.innerText.trim() || "N/A";
          const link = el.querySelector("h3 a")?.href || "N/A";
          const company = el.querySelector("p")?.innerText.trim() || "N/A";
          const location = el.querySelector(".icon--pin .element")?.innerText.trim() || "N/A";
          const date = el.querySelector(".icon--calendar time")?.getAttribute("datetime") || "N/A";
          return { title, company, location, date, link };
        })
        .filter((job) => job.date !== "Old" && job.date !== "N/A")
    );

    return jobs;
  } catch (error) {
    console.error("Error fetching job details:", error);
    throw error;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function fetchGermanyJobs(options = {}) {
  const page = Number(options.page ?? 0);
  const pages = Math.max(1, Number(options.pages ?? 1));
  const limit = Math.max(1, Number(options.limit ?? 10));
  const keyword = options.keyword || "";
  const location = options.location || "";

  const listings = [];
  for (let offset = 0; offset < pages; offset += 1) {
    const currentPageJobs = await fetchJobDetails(page + offset);
    listings.push(...currentPageJobs);
    if (listings.length >= limit * 2) {
      break;
    }
  }

  const normalizedListings = listings
    .map((listing) => buildNormalizedJob(listing))
    .filter((listing) => hasUsableUrl(listing.jobUrl));

  const detailedJobs = await mapWithConcurrency(
    normalizedListings.slice(0, Math.max(limit * 2, limit)),
    3,
    async (listing) => {
      const detail = await getJobDetailsInformation(listing.jobUrl);
      return buildNormalizedJob({
        ...listing,
        ...detail,
        jobTitle: listing.jobTitle || detail?.title || detail?.fullTitle,
        companyName: listing.companyName || detail?.company,
        location: listing.location || detail?.workplace,
        jobDescription: detail?.description || ""
      });
    }
  );

  return detailedJobs
    .filter((job) => hasUsableUrl(job.jobUrl))
    .filter((job) => matchesFilters(job, keyword, location))
    .slice(0, limit);
}

async function extractLinkedInJobDetails(browser, url) {
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_TIMEOUT
    });

    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});

    const details = await page.evaluate(() => {
      const getText = (selectors) => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.trim()) {
            return element.textContent.trim();
          }
        }
        return "N/A";
      };

      return {
        jobTitle: getText([".top-card-layout__title", ".topcard__title", "h1"]),
        companyName: getText([
          ".topcard__org-name-link",
          ".topcard__flavor",
          ".topcard__flavor-row a"
        ]),
        location: getText([
          ".topcard__flavor--bullet",
          ".topcard__flavor.topcard__flavor--bullet",
          ".job-search-card__location"
        ]),
        jobDescription: getText([
          ".show-more-less-html__markup",
          ".description__text",
          ".core-section-container__content",
          ".description"
        ])
      };
    });

    return buildNormalizedJob({ ...details, jobUrl: url });
  } catch (error) {
    console.error("Error extracting LinkedIn job details:", error.message || error);
    return buildNormalizedJob({ jobUrl: url });
  } finally {
    await page.close().catch(() => {});
  }
}

async function fetchLinkedInJobs(options = {}) {
  const keyword = options.keyword || "";
  const location = options.location || "";
  const limit = Math.max(1, Number(options.limit ?? 10));

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`;

    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_TIMEOUT
    });

    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForSelector(".jobs-search__results-list li, .base-card", { timeout: 15000 }).catch(() => {});

    const jobs = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".jobs-search__results-list li"));
      const fallbackCards = cards.length > 0 ? cards : Array.from(document.querySelectorAll(".base-card"));

      return fallbackCards
        .map((card) => {
          const linkElement =
            card.querySelector("a.base-card__full-link") ||
            card.querySelector('a[href*="/jobs/view/"]');
          const titleElement =
            card.querySelector(".base-search-card__title") ||
            card.querySelector("h3");
          const companyElement =
            card.querySelector(".base-search-card__subtitle") ||
            card.querySelector("h4");
          const locationElement =
            card.querySelector(".job-search-card__location") ||
            card.querySelector(".base-search-card__metadata");

          return {
            jobTitle: titleElement?.textContent?.trim() || "N/A",
            companyName: companyElement?.textContent?.trim() || "N/A",
            location: locationElement?.textContent?.trim() || "N/A",
            jobUrl: linkElement?.href || "N/A"
          };
        })
        .filter((job) => job.jobUrl && job.jobUrl !== "N/A");
    });

    const seen = new Set();
    const uniqueJobs = jobs.filter((job) => {
      if (!hasUsableUrl(job.jobUrl) || seen.has(job.jobUrl)) {
        return false;
      }
      seen.add(job.jobUrl);
      return true;
    });

    const matchingJobs = uniqueJobs.filter((job) => matchesFilters(job, keyword, location));
    const candidateJobs = (matchingJobs.length > 0 ? matchingJobs : uniqueJobs)
      .slice(0, Math.min(uniqueJobs.length, Math.max(limit * 2, limit)));

    const detailedJobs = await mapWithConcurrency(candidateJobs, 2, async (job) => {
      const detail = await extractLinkedInJobDetails(browser, job.jobUrl);
      return buildNormalizedJob({
        ...job,
        ...detail,
        jobTitle: detail.jobTitle || job.jobTitle,
        companyName: detail.companyName || job.companyName,
        location: mergeTextValues(job.location, detail.location),
        jobDescription: detail.jobDescription || job.jobDescription
      });
    });

    return detailedJobs
      .filter((job) => hasUsableUrl(job.jobUrl))
      .filter((job) => matchesFilters(job, keyword, location))
      .slice(0, limit);
  } finally {
    await browser.close().catch(() => {});
  }
}

export {
  fetchGermanyJobs,
  fetchJobDetails,
  fetchLinkedInJobs,
  getJobDetailsInformation
};
