import {Client} from "@opensearch-project/opensearch";

const client = new Client({
    node: process.env.ELASTICSEARCH_URL, // Your OpenSearch domain endpoint
    auth: {
        username: process.env.ELASTICSEARCH_USER, // Your OpenSearch username
        password: process.env.ELASTICSEARCH_PASSWORD,  // Your OpenSearch password
    },
    ssl: {
        // Optional: Use this if your OpenSearch domain uses a self-signed certificate
        rejectUnauthorized: false
    }
});
export default client;