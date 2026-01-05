function validation(jobDetails) {
    console.log("Starting validation of job details.");
    const validatedDetails = jobDetails.filter((detail, index) => {
        if (!detail.contactEmail || typeof detail.contactEmail !== 'string' || detail.contactEmail.trim() === '' || !detail.contactEmail.includes('@') || detail.contactEmail.length < 5 || detail.contactEmail===null || detail.contactEmail===undefined || detail.contactEmail==="N/A") {
            console.warn(`Job detail at index ${index} has an invalid or missing contact email. Skipping.`);
            return false;
        }
        return true;
    });
    return validatedDetails;
};