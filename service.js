import { chromium } from 'playwright';
async function getJobDetailsInformation(url){
    console.log("Scraping job details...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle",timeout:60000000 });

    // Wait for the main container
    await page.waitForSelector('.container.container--indent .detail-page');

    // Scrape job details
    const jobDetail = await page.evaluate(() => {

        const getText = (selector) => document.querySelector(selector)?.innerText.trim() || "N/A";
        const getListItem = (label) => {
            const items = Array.from(document.querySelectorAll('.overview__text ul.il li'));
            const item = items.find(li => li.innerText.includes(label));
            return item ? item.innerText.replace(label, '').trim() : "N/A";
        };
        return {
            title: getText('.overview__head h1'),
            company: getText('.overview__head .head__children'),
            reference: getText('.overview__reference-number'),
            fullTitle: getListItem('Full job title:'),
            workingHours: getListItem('Working hours:'),
            workplace: getListItem('Workplace:'),
            type: getListItem('Type of job offer:'),
            contract: getListItem('Type of employment contract:'),
            onlineSince: getListItem('Online since:'),
            description: getText('.detail-page__description'),
            contactEmail: (() => {
                const mailElem = document.querySelector('.additional__text a[href^="mailto:"]');
                if (!mailElem) return "N/A";
                const href = mailElem.getAttribute('href');
                if (!href) return "N/A";
                // Remove "mailto:" and decode
                try {
                    return decodeURIComponent(href.replace(/^mailto:/, ''));
                } catch {
                    return "N/A";
                }
            })(),
            contactPhone: document.querySelector('.additional__address a[href^="tel:"]')?.innerText.trim() || "N/A",
            companyAddress: getText('.additional__address')
        };
    });
    console.log("Extracted job details.");
    console.log(jobDetail);
    if(jobDetail && Object.keys(jobDetail).length > 0 && jobDetail.contactEmail!=="N/A" && jobDetail.contactEmail!==""){
        if(jobDetail.description.length>10){
            return jobDetail;
        }
    }
    await browser.close();
}


async function fetchJobDetails(count){
    console.log(`Fetching job listings from page ${count}...`);
    try{
    console.log("Fetching data...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
  // Go to job listings page
    await page.goto(`https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bfilter%5D%5B0%5D=topjobs%3A4&tx_solr%5Bpage%5D=${count}#list45536`, {
        waitUntil: "networkidle"
    });

  // Wait for job cards to be loaded
  await page.waitForSelector(".card.card--job");

  // Scrape job cards
  const jobs = await page.$$eval(".card.card--job", elements =>
    elements.map(el => {
      const title = el.querySelector("h3 a")?.innerText.trim() || "N/A";
      const link = el.querySelector("h3 a")?.href || "N/A";
      const company = el.querySelector("p")?.innerText.trim() || "N/A";
      const location = el.querySelector(".icon--pin .element")?.innerText.trim() || "N/A";
      const date = el.querySelector(".icon--calendar time")?.getAttribute("datetime") || "N/A";
      return { title, company, location, date, link };
    }).filter(job => job.date !== "Old" && job.date !== "N/A")
  );
//   console.log(jobs);
  await browser.close();
  return jobs;
}catch(error){
    console.error("Error fetching job details:", error);
}
}

export { getJobDetailsInformation, fetchJobDetails };