import express, { response } from 'express';
import axios from 'axios';
import "dotenv/config";
import { getJobDetailsInformation } from './service.js';
import { fetchQueue, extractQueue } from './jobQueue.js';
import { connection } from './redis.js';
import { QueueEvents } from 'bullmq';
import queueAdminRoute from './route/queue.route.js';
import analyzeRoute from "./route/analyze.route.js";
import jobsRoute from "./route/jobs.route.js";
// import dummy from './dummy.json' assert { type: "json" };
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// queue event listeners used for waitUntilFinished:
const fetchEvents = new QueueEvents('fetch-jobs', { connection });
const extractEvents = new QueueEvents('extract-jobs', { connection });

// const feedUrl = 'https://www.make-it-in-germany.com/en/working-in-germany/job-listings?tx_solr%5Bfilter%5D%5B0%5D=topjobs%3A4#filter45536';
const mainData= [];
app.get('/fetch',async (req, res) => {
    try{
        console.log("Received request to fetch job listings (queued).");
        const page = Number(0);
        const job = await fetchQueue.add('fetch-page', { page });
        console.log("Enqueued fetch job for page:", page, "jobId:", job.id);

        // asynchronously update mainData when the job finishes
        job.waitUntilFinished(fetchEvents)
          .then(result => {
            if (result && Array.isArray(result.jobs)) {
              mainData.push(...result.jobs);
              console.log(`mainData updated with ${result.jobs.length} jobs from page ${page}`);
            }
          })
          .catch(err => {
            console.error("Fetch job finished with error:", err);
          });

        return res.status(202).json({message: "Fetch job queued", jobId: job.id});
    }catch(err){
        return res.status(500).json({message: "Error queueing fetch", error: err.message});
    }
});
var allJobDetails = [];
app.get('/extract', async (req, res) => {
    try{
        console.log("Received request for job details (queued).");
        if(mainData.length===0){
            return res.status(200).json({message: "No data available. Please fetch data first from /fetch endpoint."});
        }

        const queued = [];
        for(let i=0;i<mainData.length;i++){
            const url = mainData[i].link;
            const job = await extractQueue.add('extract-job', { url });
            queued.push({ jobId: job.id, url });

            // update allJobDetails when job finishes
            job.waitUntilFinished(extractEvents)
              .then(result => {
                if (result && result.details) {
                  allJobDetails.push(result.details);
                  console.log("Stored details for", url);
                }
              })
              .catch(err => {
                console.error("Extract job error for", url, err);
              });
        }

        console.log(`Enqueued ${queued.length} extract jobs.`);
        return res.status(202).json({message: "Extract jobs queued", jobs: queued});
    }catch(err){
        return res.status(500).json({message: "Error queueing extract jobs", error: err.message});
    }
});

app.post("/testUrl", async (req, res) => {
    try {
        console.log("Received request to test URL.");

        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ message: "URL is required" });
        }

        console.log(`Received URL to test: ${url}`);

        const data = await getJobDetailsInformation(url);

        return res.status(200).json({ message: "Data Received", data });
    } catch (err) {
        console.error("Error in /testUrl:", err); // logs full error
        return res.status(500).json({
            message: "Error fetching data",
            error: err.message,
        });
    }
});

app.post("/textAnalyze",async(req,res)=>{
    const { data } = req.body;
    console.log("Received request to analyze job description.", data);
    try{
    const response = await axios.post("http://localhost:3000/api/analyze-jobs-local", {
        jobDataDescription: data,
    });
    return res.status(200).json({ message: "Analysis request sent", data: response.data });
    }catch(error){
        console.error("Error sending analysis request:", error.response ? error.response.data : error.message);
        return res.status(500).json({ message: "Error sending analysis request", error: error.response ? error.response.data : error.message });
    }
})


app.get("/analyzeJobs", async (req, res) => {
    console.log("Received request to analyze jobs.");
    try {
        for(let i=0;i<allJobDetails.length;i++){
        const response = await axios.post("http://localhost:3000/api/analyze-jobs", {
            jobDataDescription: allJobDetails[i].description,
        });
        }
        // let dummyData = [];
        // dummyData.push(dummy)
        // console.log(dummyData);
        // allJobDetails=dummyData;
        // const response = await axios.post("http://localhost:3000/api/analyze-jobs", {
        //     allJobDetails,
        // });
        console.log(response.data);
        return res.status(200).json({ message: "Analysis request sent", data: response.data });
    } catch (error) {
        console.error("Error sending analysis request:", error.response ? error.response.data : error.message);
        return res.status(500).json({ message: "Error sending analysis request", error: error.response ? error.response.data : error.message });
    }
})

app.get("/analyzeJobsLocal", async (req, res) => {
    console.log("Received request to analyze jobs.");
    try {
        for(let i=0;i<allJobDetails.length;i++){
        const response = await axios.post("http://localhost:3000/api/analyze-jobs-local", {
            jobDataDescription: allJobDetails[i].description,
            url: allJobDetails[i].url
        });
        }
        return res.status(200).json({ message: "Analysis request sent", data: response.data });
    } catch (error) {
        console.error("Error sending analysis request:", error.response ? error.response.data : error.message);
        return res.status(500).json({ message: "Error sending analysis request", error: error.response ? error.response.data : error.message });
    }
})

app.get("/setAi", async (req, res) => {
    try {
        const response = await axios.get(process.env.OLLAMA_HOST + "/api/tags");
        return res.status(200).json({ data: response.data });
    } catch (err) {
        console.error("Error in /setAi:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

app.use("/jobs", jobsRoute);
app.use("/api", analyzeRoute);
app.use("/api", queueAdminRoute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})




// dateTest();
// fetchJobs();

