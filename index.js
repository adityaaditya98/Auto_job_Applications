import express, { response } from 'express';
import axios from 'axios';
import "dotenv/config";
import { fetchJobDetails, getJobDetailsInformation } from './service.js';
import queueAdminRoute from './route/queue.route.js';
import analyzeRoute from "./route/analyze.route.js";
import "./works/jobAnalysis.worker.js";
// import dummy from './dummy.json' assert { type: "json" };
const app = express();
app.use(express.json());
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
        console.log("Job listings fetched and stored.");
        return res.status(200).json({message: "Data fetched successfully"});
    }catch(err){
        return res.status(500).json({message: "Error fetching data", error: err.message});
    }
});
var allJobDetails = [];
app.get('/', async (req, res) => {
    try{
        console.log("Received request for job details.");
        if(mainData.length===0){
            return res.status(200).json({message: "No data available. Please fetch data first from /fetch endpoint."});
        }
        for(let i=0;i<mainData.length;i++){
            allJobDetails.push( await getJobDetailsInformation(mainData[i].link));
        }
        console.log("All job details processed.");
        console.log(allJobDetails);
        return res.status(200).json({message: "Job details processed. Check server logs for details."});
    }catch(err){
        return res.status(500).json({message: "Error fetching data", error: err.message});
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

app.use("/api", analyzeRoute);
app.use("/api", queueAdminRoute);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})




// dateTest();
// fetchJobs();

