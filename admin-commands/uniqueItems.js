
// Create a new OpenSearch client
import searchClient from "../common/searchClient.js";

const client = searchClient

// Function to get unique values for any field using aggregation
export async function getUniqueValuesForField(index, fieldName) {
    try {
        // Perform an aggregation query to get unique values for the passed field
        const response = await client.search({
            index: index,
            body: {
                size: 0, // We don't need the actual documents, only the aggregation
                aggs: {
                    unique_values: {
                        terms: {
                            field: `${fieldName}.keyword`, // Use '.keyword' if it's a text field, otherwise just use the field name
                            size: 10000 // Adjust the size as needed
                        }
                    }
                }
            }
        });

        // Extract the unique values from the aggregation result
        const uniqueValues = response.body.aggregations.unique_values.buckets.map(bucket => bucket.key);

        // Log the unique values
        console.log(`Unique values for field ${fieldName}:`, uniqueValues);

        // Return the unique values
        return uniqueValues;
    } catch (error) {
        console.error(`Error fetching unique values for field ${fieldName}:`, error);
    }
}

// Example usage
const indexName = 'jd-index';  // Replace with your actual index name
const fieldName = 'location';  // Replace with the field you want to aggregate on

getUniqueValuesForField(indexName, fieldName);
