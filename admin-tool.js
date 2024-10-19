import { exec } from 'child_process';
import util from 'util';
import { Command } from 'commander';

// Promisify exec to use async/await
const execPromise = util.promisify(exec);

// Map of Docker images and their custom Dockerfiles
const dockerImages = {
    'job-collector': {
        imageName: '015584085679.dkr.ecr.us-east-2.amazonaws.com/job-collector',
        dockerfile: 'Dockerfile.jobCollector'
    },
    'profile-uploader': {
        imageName: '015584085679.dkr.ecr.us-east-2.amazonaws.com/profile-uploader',
        dockerfile: 'Dockerfile.profileUploader'
    },
    // Add more images here as needed
};

// Helper function to list all available image keys
const listImageKeys = () => {
    console.log('Available Docker images:');
    Object.keys(dockerImages).forEach((key) => {
        console.log(`  - ${key}`);
    });
};

// Function to run Docker commands
const runCommand = async (command) => {
    try {
        const { stdout, stderr } = await execPromise(command);
        console.log(stdout);
        if (stderr) {
            console.error(`Error: ${stderr}`);
        }
    } catch (error) {
        console.error(`Execution failed: ${error.message}`);
    }
};

// CLI handler for push, pull, build commands
const handleDockerCommand = async (action, imageKey, options) => {
    const imageConfig = dockerImages[imageKey];

    if (!imageConfig) {
        console.error(`Unknown image: ${imageKey}`);
        listImageKeys();  // List the available images if an unknown image is provided
        process.exit(1);
    }

    const { imageName, dockerfile } = imageConfig;

    switch (action) {
        case 'push':
            console.log(`Pushing image: ${imageName}`);
            await runCommand(`docker push ${imageName}`);
            break;
        case 'pull':
            console.log(`Pulling image: ${imageName}`);
            await runCommand(`docker pull ${imageName}`);
            break;
        case 'build':
            const buildPath = options.path || '.';
            console.log(`Building image: ${imageName} using Dockerfile: ${dockerfile} at path: ${buildPath}`);
            await runCommand(`docker build --platform linux/amd64 -t ${imageName} -f ${dockerfile} ${buildPath}`);
            break;
        default:
            console.error(`Unknown action: ${action}. Use "push", "pull", or "build".`);
            process.exit(1);
    }
};

// Initialize the commander program
const program = new Command();

program
    .name('admin-tool')
    .description('CLI tool to manage Docker images (push, pull, build) for your projects.')
    .version('1.0.0');

// Add the "push" command
program
    .command('push <imageKey>')
    .description('Push a Docker image to a remote repository')
    .action((imageKey) => handleDockerCommand('push', imageKey));

// Add the "pull" command
program
    .command('pull <imageKey>')
    .description('Pull a Docker image from a remote repository')
    .action((imageKey) => handleDockerCommand('pull', imageKey));

// Add the "build" command
program
    .command('build <imageKey>')
    .description('Build a Docker image with a custom Dockerfile')
    .option('-p, --path <path>', 'Path to the Dockerfile directory', '.')
    .action((imageKey, options) => handleDockerCommand('build', imageKey, options));

// Add a "list-images" command to list available Docker image keys
program
    .command('list-images')
    .description('List all available Docker image keys')
    .action(() => listImageKeys());

// Display help information if no arguments are provided
program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
