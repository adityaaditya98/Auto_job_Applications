import express from 'express';
import axios from 'axios';
import { fetchJobDetails, getJobDetailsInformation } from './service.js';
const app = express();
const PORT = process.env.PORT || 3000;

// const feedUrl = 'https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bfilter%5D%5B0%5D=topjobs%3A4#filter45536';
const mainData= [];
app.get('/fetch',async (req, res) => {
    try{
        console.log("Received request to fetch job listings.");
        for( let i=0;i<2;i++){
        const value =await fetchJobDetails(i);
        mainData.push(...value);
        }
        console.log(mainData);
        return res.status(200).json({message: "Data fetched successfully"});
    }catch(err){
        return res.status(500).json({message: "Error fetching data", error: err.message});
    }
});
const allJobDetails = [];
app.get('/', async (req, res) => {
    try{
        console.log("Received request for job details.");
        if(mainData.length===0){
            return res.status(200).json({message: "No data available. Please fetch data first from /fetch endpoint."});
        }
        for(let i=0;i<mainData.length;i++){
            allJobDetails.push( await getJobDetailsInformation(mainData[i].link));
        }
        console.log(allJobDetails);
        console.log("All job details processed.");
        return res.status(200).json({message: "Job details processed. Check server logs for details."});
    }catch(err){
        return res.status(500).json({message: "Error fetching data", error: err.message});
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})



// async function fetchJobs(retries = 5) {
//     try {
//         const response = await axios.get(feedUrl, {
//             headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
//                 'Accept': 'application/xml, text/xml, */*;q=0.01'
//             }
//         });

//         const parser = new xml2js.Parser({ explicitArray: false });
//         const result = await parser.parseStringPromise(response.data);
//         const jobs = result.source.job;

//         // console.log(`Fetched ${jobs.length} jobs`);
//         // console.log(jobs);
//         // console.log(new Date(jobs[0].date))
//         console.log()
//         for(let job of jobs){
//         let check =dateTest(job.date);
//         if(check){
//             // console.log("--------------" );
//             // console.log(job);
//             let country = job.country;
//             // console.log(country);
//             // console.log(country.includes("D"));
//             // if(country.includes("D") || country.includes("e"))
//             // console.log(country.includes("e"));
//             country = country.replace(/\s/g, '').toUpperCase().trim();
//             if (["germany", "deutschland","DE","D","E"].includes(country)) {
//             console.log("✅ Accepted:", country);
//             console.log(job.url);
//             console.log(job);
//             }
//             // console.log("--------------" );
//             // console.log("--------------" );
//             // console.log(job.title);
//             // console.log(job.url);
//             // console.log(job.location);
//             // console.log(job.date);
//             // console.log("--------------" );
//         }
//         }
//     } catch (err) {
//         if (err.response && err.response.status === 429 && retries > 0) {
//             console.log('Rate limited. Retrying in 5 seconds...');
//             await new Promise(r => setTimeout(r, 5000));
//             return fetchJobs(retries - 1);
//         } else {
//             console.error('Error fetching or parsing XML feed:', err.message);
//         }
//     }
// }

function dateTest(inputDate){
    let tempValue = new Date(inputDate)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    // console.log(oneWeekAgo);
    if(tempValue >= oneWeekAgo){
        // console.log("within one week");
        // console.log(tempValue);
        return true;
    }else{
        return false;
    }
}
// dateTest();
// fetchJobs();

