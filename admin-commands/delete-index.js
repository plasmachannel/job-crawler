// Import the OpenSearch client
import {Client} from "@opensearch-project/opensearch";
import searchClient from "../common/searchClient.js";


// Create an OpenSearch client instance
const client = searchClient

// Function to delete an index
async function deleteIndex(indexName = 'jd-index') {
    try {
        // Delete the index using the OpenSearch client
        const response = await client.indices.delete({
            index: indexName
        });

        console.log(`Index ${indexName} deleted successfully`, response);
    } catch (error) {
        if (error.meta && error.meta.body && error.meta.body.error) {
            console.error(`Failed to delete index: ${error.meta.body.error.reason}`);
        } else {
            console.error('Error deleting index:', error);
        }
    }
}

// Call the function to delete the index
await deleteIndex('jd-index'); // Replace with the name of the index you want to delete
