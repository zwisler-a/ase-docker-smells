const {Octokit} = require("@octokit/rest");
const {exec} = require('child_process');
const fs = require('fs');
const path = require('path');
const {DockerParser, File} = require("@tdurieux/dinghy");
const {Matcher, rules} = require("@tdurieux/docker-parfum");
const util = require('util');
const execPromise = util.promisify(exec);

const blacklist = fs.readFileSync("log.txt").toString();

// Replace 'YOUR_GITHUB_TOKEN' with your actual GitHub token
const octokit = new Octokit({auth: '***'});

async function findDockerfilesInRepo(owner, repo) {
    try {
        const {data} = await octokit.repos.getContent({
            owner,
            repo,
            path: '',
        });
        const dockerfiles = data.filter(file => file.name.toLowerCase().includes('dockerfile'));
        if (dockerfiles.length) console.log("Dockerfile found in", repo);
        return dockerfiles.map(file => ({path: file.path, repo}));
    } catch (error) {
        console.error(`Error fetching files from repo ${repo}: ${error}`);
        return [];
    }
}

async function getFileContent(owner, repo, filePath) {
    const {data} = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
    });
    return Buffer.from(data.content, 'base64').toString('utf-8');
}

async function checkDockerfileForSmells(owner, repo, filePath) {
    try {
        const fileContent = await getFileContent(owner, repo, filePath);
        const dockerParser = new DockerParser(new File(filePath, fileContent));
        const ast = await dockerParser.parse();
        const matcher = new Matcher(ast);
        const allViolations = matcher.matchAll();

        if (allViolations.length > 0) {
            const smells = allViolations.map(violation => violation.rule.name);
            for (const violation of allViolations) {
                try {
                    await violation.repair();
                } catch (e) {
                    console.log('Could not fix', violation?.rule?.name)
                }
            }
            const repairedDockerfile = ast.toString(true);
            console.log(`Smells found in ${repo}/${filePath}`);
            return {smells, repairedDockerfile};
        }
    } catch (error) {
        console.error(`Error processing Dockerfile ${filePath} in repo ${repo}: ${error}`);
    }
    return {smells: null, repairedDockerfile: null};
}

async function saveResults(results) {
    fs.writeFileSync('dockerfiles_with_smells.json', JSON.stringify(results, null, 2));
    console.log('Results saved.');
}

async function scrapeReposForDockerfiles() {
    const results = {};
    let page = 1;
    let counter = 0;

    while (true) {
        try {
            const {data} = await octokit.search.repos({
                q: 'docker Docker in:readme',
                sort: 'stars',
                order: 'desc',
                per_page: 5,
                page,
            });

            if (data.items.length === 0) break;
            /* for (let repo in data.items) {
                await processRepository(data.items[repo], results, counter)
            }*/
            const repoQueue = [];

            for (const repo of data.items) {
                if (blacklist.includes(repo.full_name)) continue;
                repoQueue.push(processRepository(repo, results, counter));
                if (repoQueue.length >= 2) {
                    await Promise.all(repoQueue);
                    repoQueue.length = 0;
                    await saveResults(results);
                }
            }

            await Promise.all(repoQueue);

            console.log('\n\n');
            console.log('Page is done');

            await saveResults(results);
            await cleanDockerCache();
            console.log('\n\n');

            page++;
        } catch (error) {
            console.error(`Error fetching repositories: ${error}`);
            break;
        }
    }

    return results;
}

async function processRepository(repo, results, counter) {
    console.log(`Checking repository: ${repo.full_name}`);
    const dockerfiles = await findDockerfilesInRepo(repo.owner.login, repo.name);

    for (const dockerfile of dockerfiles) {
        const {
            smells,
            repairedDockerfile
        } = await checkDockerfileForSmells(repo.owner.login, repo.name, dockerfile.path);
        if (smells) {
            const buildResult = await cloneRepoAndRunCommand(repo.html_url, dockerfile.path, repairedDockerfile);
            if (buildResult.success) {
                if (!results[repo.full_name]) results[repo.full_name] = [];
                results[repo.full_name].push({
                    dockerfile: dockerfile.path,
                    url: repo.html_url,
                    smells: smells,
                    originalImageSize: buildResult.originalImageSize,
                    repairedImageSize: buildResult.repairedImageSize,
                });
            }
        }
    }
    counter++;
}

// Cloning the repository, running a Docker build command, updating the Dockerfile, and running the build again
async function cloneRepoAndRunCommand(repoUrl, dockerfilePath, repairedDockerfile) {
    const repoName = path.basename(repoUrl);
    const clonePath = path.join(__dirname, repoName);

    try {
        // Clone the repository
        console.log(`Cloning repository ${repoUrl} to ${clonePath}`);
        await execCommand(`git clone ${repoUrl} ${clonePath}`);
        console.log(`Repository cloned to ${clonePath}`);

        // Initial build with the original Dockerfile
        console.log(`Building Docker image using Dockerfile at ${clonePath}/${dockerfilePath}`);
        const originalImageId = await execCommand(`cd ${clonePath} && docker build -m 16g -f ${dockerfilePath} . -q`);
        const originalImageSize = await getImageSize(originalImageId.trim());
        console.log(`Initial Docker build completed for ${repoName}`);

        // Update the Dockerfile with the repaired version
        const dockerfileFullPath = path.join(clonePath, dockerfilePath);
        fs.writeFileSync(dockerfileFullPath, repairedDockerfile);
        console.log(`Repaired Dockerfile written to ${dockerfileFullPath}`);

        // Build again with the repaired Dockerfile
        console.log(`Building Docker image using repaired Dockerfile at ${dockerfileFullPath}`);
        const repairedImageId = await execCommand(`cd ${clonePath} && docker build -m 16g -f ${dockerfilePath} . -q`);
        const repairedImageSize = await getImageSize(repairedImageId.trim());
        console.log(`Repaired Docker build completed for ${repoName}`);

        // Remove the cloned repository
        await execCommand(`rm -rf ${clonePath}`);
        console.log(`Removed cloned repository at ${clonePath}`);

        return {success: true, originalImageSize, repairedImageSize};
    } catch (error) {
        console.error(`Error cloning repository or running Docker build: ${error}`);

        // Remove the cloned repository on failure
        await execCommand(`rm -rf ${clonePath}`);
        console.log(`Removed cloned repository at ${clonePath} due to build failure`);

        return {success: false};
    }
}

// Function to execute a command and pipe the output to the parent process
async function execCommand(command) {
    return new Promise((resolve, reject) => {
        const child = exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
                if (stderr) {
                    console.error(`Error output: ${stderr}`);
                }
                return;
            }

            resolve(stdout);
        });
    });
}

// Function to get the size of a Docker image
async function getImageSize(imageId) {
    try {
        const result = await execCommand(`docker image inspect ${imageId} --format='{{.Size}}'`);
        return parseInt(result.trim(), 10);
    } catch (error) {
        console.error(`Error getting image size for ${imageId}: ${error}`);
        return null;
    }
}

// Function to clean Docker cache
async function cleanDockerCache() {
    try {
        console.log('Cleaning Docker cache...');
        await execCommand('docker system prune -f');
        console.log('Docker cache cleaned.');
    } catch (error) {
        console.error(`Error cleaning Docker cache: ${error}`);
    }
}

// Example usage
scrapeReposForDockerfiles()
    .then(results => {
        console.log('Repositories with Dockerfiles containing smells:', results);
        saveResults(results);
    })
    .catch(error => console.error('Error scraping repositories:', error));
