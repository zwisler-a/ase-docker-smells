const {DockerParser, File} = require("@tdurieux/dinghy");
const {Matcher} = require("@tdurieux/docker-parfum");

async function fixFile(filePath, fileContent) {
    const dockerParser = new DockerParser(new File(filePath, fileContent));
    const ast = await dockerParser.parse();
    const matcher = new Matcher(ast);
    const allViolations = matcher.matchAll();

    if (allViolations.length > 0) {
        for (const violation of allViolations) {
            try {
                await violation.repair();
            } catch (e) {
                console.log('Could not fix', violation?.rule?.name)
            }
        }
        return ast.toString(true);
    }
}

(async () => {
    console.log(await fixFile('/a', `
ARG BASE=nvidia/cuda:11.8.0-base-ubuntu22.04
FROM \${BASE}

RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y --no-install-recommends gcc g++ make python3 python3-dev python3-pip python3-venv python3-wheel espeak-ng libsndfile1-dev && rm -rf /var/lib/apt/lists/*
RUN pip3 install llvmlite --ignore-installed

# Install Dependencies:
RUN pip3 install torch torchaudio --extra-index-url https://download.pytorch.org/whl/cu118
RUN rm -rf /root/.cache/pip

# Copy TTS repository contents:
WORKDIR /root
COPY . /root

RUN make install

ENTRYPOINT ["tts"]
CMD ["--help"]

`));
})()
