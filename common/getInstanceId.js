import http from 'http';

export default async function getInstanceId() {
    try {
        // Step 1: Retrieve a token to access metadata
        const token = await new Promise((resolve, reject) => {
            const options = {
                hostname: '169.254.169.254',
                path: '/latest/api/token',
                method: 'PUT',
                headers: {
                    'X-aws-ec2-metadata-token-ttl-seconds': '21600'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => resolve(data));
            });

            req.on('error', (err) => reject(err));
            req.end();
        });

        // Step 2: Use the token to get the instance ID
        const instanceId = await new Promise((resolve, reject) => {
            const options = {
                hostname: '169.254.169.254',
                path: '/latest/meta-data/instance-id',
                method: 'GET',
                headers: {
                    'X-aws-ec2-metadata-token': token
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => resolve(data));
            });

            req.on('error', (err) => reject(err));
            req.end();
        });

        console.log("Instance ID:", instanceId);
        return instanceId;
    } catch (error) {
        console.error("Error retrieving instance ID:", error);
    }
}

// Run the function
getInstanceId();
