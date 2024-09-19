const reposToAnalyse = require('./dockerfiles_with_smells.json');

const {NodeSSH} = require('node-ssh')
const path = require("path");
const fs = require("fs");
const {DockerParser, File} = require("@tdurieux/dinghy");
const {Matcher} = require("@tdurieux/docker-parfum");
const {parseDocker} = require("@tdurieux/dinghy/build/docker/docker-parser");
const ssh = new NodeSSH()
const fetch = require('node-fetch');


const powerPlugQuery = 'plug_power{device="Power"} / 10'
const scaphandreQuery = 'scaph_host_power_microwatts*1e-6'
const prometheusUrl = 'http://192.168.178.61:9090';
const testHostCwd = '/home/zwisler/test/'

function sleep(time) {
    return new Promise(res => {
        setTimeout(res, time);
    });
}

async function fetchPrometheusData(query, startTime, endTime) {
    const url = `${prometheusUrl}/api/v1/query_range?query=${encodeURIComponent(query)}&start=${startTime / 1000}&end=${endTime / 1000}&step=500ms`
    console.log(url)
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
    }
    const data = await response.json();
    return JSON.stringify(data.data, null, 2);
}

async function connectToServer() {
    if (ssh.isConnected()) return;
    await ssh.connect({
        host: process.env.TEST_HOST, username: process.env.TEST_USER, password: process.env.TEST_PW
    })
}

async function disconnectFromServer() {
    ssh.dispose();
}

function checkFileInFolder(folderPath, regexPattern) {
    const files = fs.readdirSync(folderPath);
    const regex = new RegExp(regexPattern);

    for (const file of files) {
        if (regex.test(file)) {
            return true;
        }
    }
    return false;
}

async function runOnServer(cmds) {
    await connectToServer();
    /** @type {SSHExecCommandResponse[]} */
    const results = []
    for (let cmd of cmds) {
        console.log(`Run on server: ${cmd}`)
        const result = await ssh.execCommand(cmd, {cwd: testHostCwd})
        console.log(result.stdout);
        console.log(result.stderr);
        results.push(result);
    }
    return results;
}

async function putFile(source, dest) {
    await connectToServer();
    await ssh.putFile(source, dest);
    console.log(`Uploaded ${source} to ${dest}`);
}

async function getFixedDockerfiles(dockerfile) {
    console.log(dockerfile)
    const ast = parseDocker(dockerfile);
    const matcher = new Matcher(ast);
    const allViolations = matcher.matchAll();
    /** @type {{fixes:string, dockerfile:string}[]} **/
    const results = []
    if (allViolations.length > 0) {
        results.push({
            fixes: 'none', dockerfile: ast.toString(true)
        })
        for (const violation of allViolations) {
            try {
                await violation.repair();
                results.push({
                    fixes: violation?.rule?.name, dockerfile: ast.toString(true)
                })
            } catch (e) {
                console.log('Could not fix', violation?.rule?.name)
            }
        }
        return results;
    }
}

async function runTestOnReposDockerfile(repoUrl, dockerfilePath, rep) {
    const repoName = path.basename(repoUrl);

    // Clone the repository
    console.log(`Cloning repository ${repoUrl} to ${repoName} for it. ${rep}`);
    await runOnServer([`rm -rf ${repoName}`, `git clone ${repoUrl} ${repoName}`]);
    const gitHash = (await runOnServer([`cd ${repoName} && git rev-parse HEAD`]))[0].stdout;

    const dockerfile = (await runOnServer([`cd ${repoName} && cat ${dockerfilePath}`]))[0].stdout;
    if (!dockerfile || dockerfile.trim() === '') return
    const testFiles = await getFixedDockerfiles(dockerfile);
    let idx = 0;
    for (const testFile of testFiles) {
        idx++;

        // The reports already exist, no need to create them again
        const scaphReportPath = `./data/scaph_${rep}_${repoName.toLocaleLowerCase()}_${idx}_${gitHash}.json`
        const ppReportPath = `./data/pp_${rep}_${repoName.toLocaleLowerCase()}_${idx}_${gitHash}.json`
        if(checkFileInFolder('./data', `.*_${rep}_${repoName.toLocaleLowerCase()}_${idx}_.*\.json`)) {
            console.log("Skipping", `${rep}_${repoName.toLocaleLowerCase()}_${idx}_${gitHash}`)
            continue;
        }

        await runOnServer([`./stop_images.sh -c 10`]);

        // Write fixed Dockerfile & Build
        fs.writeFileSync('./tmp', testFile.dockerfile);
        await putFile('./tmp', `${testHostCwd}${repoName}/${dockerfilePath}`);
        const imageName = `${repoName}:${idx}`.toLocaleLowerCase();
        await runOnServer([`cd ${repoName} && docker build -t ${imageName} -m 16g -f ${dockerfilePath} . -q`]);

        // Create the report
        console.log('Starting test for ', repoName, testFile.fixes)
        await runOnServer([`./start_images.sh -c 10 -a '-m 1gb --entrypoint tail' -i "${imageName}"`]);
        await disconnectFromServer();
        // Let it run
        await sleep(1000 * 15) // 15 sec startup
        const start = Date.now();
        await sleep(1000 * 60 * 10);
        const end = Date.now();

        // Stop & save reports
        await runOnServer([`./stop_images.sh -c 10`]);
        fs.writeFileSync(scaphReportPath, await fetchPrometheusData(scaphandreQuery, start, end));
        fs.writeFileSync(ppReportPath, await fetchPrometheusData(powerPlugQuery, start, end));
        console.log('done test for', repoName, testFile.fixes)
    }

}


async function main() {
    for (const repo of Object.keys(reposToAnalyse)) {
        let repoDef = reposToAnalyse[repo];
        await runOnServer([`docker system prune -f`])
        for (let dockerFileInRepo of repoDef) {
            for (let i = 1; i < 4; i++) {
                await runTestOnReposDockerfile(dockerFileInRepo.url, dockerFileInRepo.dockerfile, i)
            }
        }
    }
}

main();