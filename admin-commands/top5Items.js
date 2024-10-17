// Import the OpenSearch client
N

// Function to get the 5 most recent items from an index
async function getMostRecentItems(indexName) {
    try {
        // Perform the search query
        const response = await client.search({
            index: indexName,
            body: {
                sort: [
                    {
                        createdAt: { order: 'desc' }  // Replace 'created_at' with your timestamp field
                    }
                ],
                size: 5,  // Limit the number of results to 5
                query: {
                    match_all: {}  // You can modify the query if needed
                }
            }
        });

        console.log('Most recent 5 items:', response.body.hits.hits);
    } catch (error) {
        console.error('Error fetching most recent items:', error);
    }
}

// Call the function to get the most recent items
await getMostRecentItems('jd-index');  // Replace with your index name
``
