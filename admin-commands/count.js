// Function to count the number of documents across all indexes
import searchClient from "../common/searchClient.js";

async function countDocumentsInCluster() {
    try {
        const response = await searchClient.count({
            index: 'jd-index',  // Count across all indexes
            body: {
                query: {
                    match_all: {}  // Match all documents
                }
            }
        });

        console.log('Total number of documents in the cluster:', response.body.count);
    } catch (error) {
        console.error('Error counting documents in the cluster:', error);
    }
}

// Call the function to count documents across all indexes
await countDocumentsInCluster();
