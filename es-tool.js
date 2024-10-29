import { Command } from 'commander';
import dotenv from 'dotenv';

dotenv.config();

import searchClient from './common/searchClient.js';

// Initialize the OpenSearch client
const client = searchClient;

// Function to count documents across all indexes
async function countDocumentsInCluster() {
    try {
        const response = await client.count({
            index: '_all',  // Count across all indexes
            body: {
                query: {
                    match_all: {}  // Match all documents
                }
            }
        });
        console.log('Total number of documents in the cluster:', response.count);
    } catch (error) {
        console.error('Error counting documents in the cluster:', error);
    }
}

// Function to delete an index
async function deleteIndex(indexName = 'jd-index') {
    try {
        const response = await client.indices.delete({
            index: indexName
        });

        console.log(`Index ${indexName} deleted successfully`, response);
        await client.indices.create({ index: indexName });


    } catch (error) {
        if (error.meta && error.meta.body && error.meta.body.error) {
            console.error(`Failed to delete index: ${error.meta.body.error.reason}`);
        } else {
            console.error('Error deleting index:', error);
        }
    }
}

async function testIndex(indexName) {
    const response = await client.index({
        index: indexName,
        id: 1,
        body: {
            text: 'hello world',
        },
    });
    console.log(`Index ${indexName} inserted successfully`, response);
}

// Function to get the 5 most recent items from an index
async function getMostRecentItems(indexName) {
    try {
        const response = await client.search({
            index: indexName,
            body: {
                sort: [
                    {
                        createdAt: { order: 'desc' }  // Replace 'createdAt' with your actual timestamp field
                    }
                ],
                size: 5,
                query: {
                    match_all: {}
                }
            }
        });

        console.log('Most recent 5 items:', response.hits.hits);
    } catch (error) {
        console.error('Error fetching most recent items:', error);
    }
}

// Function to get unique values for a specific field using aggregation
async function getUniqueValuesForField(index, fieldName) {
    try {
        const response = await client.search({
            index: index,
            body: {
                size: 0,  // No need to retrieve actual documents
                aggs: {
                    unique_values: {
                        terms: {
                            field: `${fieldName}.keyword`,  // Use '.keyword' for text fields
                            size: 10000  // Adjust the size if needed
                        }
                    }
                }
            }
        });

        const uniqueValues = response.body.aggregations.unique_values.buckets.map(bucket => bucket.key);
        console.log(`Unique values for field ${fieldName}:`, uniqueValues);
        return uniqueValues;
    } catch (error) {
        console.error(`Error fetching unique values for field ${fieldName}:`, error);
    }
}

// Initialize the CLI using Commander
const program = new Command();

program
    .name('es-tool')
    .description('CLI tool to interact with OpenSearch')
    .version('1.0.0');

// Add a command to count documents across all indexes
program
    .command('count')
    .description('Count documents across all indexes')
    .action(async () => {
        await countDocumentsInCluster();
    });

// Add a command to delete a specific index
program
    .command('delete-index <indexName>')
    .description('Delete a specific index')
    .action(async (indexName) => {
        await deleteIndex(indexName);
    });

program
    .command('test <indexName>')
    .description('ingest into index')
    .action(async (indexName) => {
        await testIndex(indexName);
    })

// Add a command to get the 5 most recent items from an index
program
    .command('recent-items <indexName>')
    .description('Get the 5 most recent items from an index')
    .action(async (indexName) => {
        await getMostRecentItems(indexName);
    });

// Add a command to get unique values for a specific field from an index
program
    .command('unique-values <indexName> <fieldName>')
    .description('Get unique values for a specific field from an index')
    .action(async (indexName, fieldName) => {
        await getUniqueValuesForField(indexName, fieldName);
    });

// Parse the command-line arguments
program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
