import searchClient from "../common/searchClient.js";
import {getUniqueValuesForField} from "./uniqueItems.js";
// Create an OpenSearch client instance
const client = searchClient;
// Create a new Elasticsearch or OpenSearch client

async function getUniqueLocations(index) {
    try {
        // Perform an aggregation query to get unique locations
        const response = await client.search({
            index: index,
            body: {
                size: 0, // We don't need the actual documents, only the aggregation
                aggs: {
                    unique_locations: {
                        terms: {
                            field: 'location.keyword', // Use '.keyword' if the field is of type text, otherwise use just 'location'
                            size: 10000 // Adjust the size as needed to accommodate the expected number of unique locations
                        }
                    },
                }
            }
        });

        // Extract the unique locations from the aggregation result
        const uniqueLocations = response.body.aggregations.unique_locations.buckets.map(bucket => bucket.key);


        // Log the unique locations
        console.log('Unique locations:', uniqueLocations);

        return uniqueLocations;
    } catch (error) {
        console.error('Error fetching unique locations:', error);
    }
}

// Example usage
getUniqueValuesForField('jd-index', 'location'); // Replace with your actual index name
