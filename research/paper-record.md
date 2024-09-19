# Seed papers
- [S1] [Empirical Study of the Docker Smells Impact on the Image Size](https://dl.acm.org/doi/abs/10.1145/3597503.3639143)
    - Docker smells impact image size, developers positively react to repairs.
- [S2] [Monitoring the energy consumption of docker containers](https://ieeexplore.ieee.org/abstract/document/10197087)
    - Investigates energy consumption of Docker containers under various workloads.
    - Proposes approach to measure energy consumption and optimize Docker usage.

# Round 1 
## ConnectedPapers (S1)
- [Parfum: Detection and Automatic Repair of Dockerfile Smells](https://arxiv.org/abs/2302.01707)
    - Parfum tool detects and repairs Docker smells in Dockerfiles effectively.
    - Parfum repairs 806,245 Docker smells, impacting image size significantly.
    - Developers welcome Parfum patches, merging 20 pull requests successfully.
- [DRIVE: Dockerfile Rule Mining and Violation Detection](https://doi.org/10.1145/3617173)
    - DRIVE mines Dockerfile rules, detects violations, and shows high efficacy.
    - Approach identifies 34 semantic and 19 syntactic rules effectively.
- [Fixing Dockerfile Smells: An Empirical Study](https://doi.org/10.48550/arXiv.2208.09097)
    - Study on Dockerfile smells, developers' fixes, and automated tools.
    - Investigates Dockerfile quality in open-source projects through empirical analysis.
- [Assessing and Improving the Quality of Docker Artifacts](https://doi.org/10.1109/ICSME55016.2022.00081)
    - Research assesses Docker artifacts quality and developers' preferences for images.
    - Study identifies features correlated with developers' image choices and preferences.
- [Understanding and Predicting Docker Build Duration: An Empirical Study of Containerized Workflow of OSS Projects](https://doi.org/10.1145/3551349.3556940)
    - Investigated Docker build duration in OSS projects with 171,439 builds.
    - Proposed prediction models with 27 features, outperforming baseline by 94.4%.
    - Explored slow builds, abnormal builds identification, and cost reduction in Docker.
- [A Large-scale Data Set and an Empirical Study of Docker Images Hosted on Docker Hub](https://doi.org/10.1109/ICSME46990.2020.00043)
    - Trends show improvement in quality but security risks exist.

## ConnectedPapers (S2)
- [Optimising workflow execution for energy consumption and performance](https://doi.org/10.1109/GREENS59328.2023.00011)
    - Paper focuses on energy-efficient workflow scheduling for optimal computation performance.
    - Proposes a generic framework for improved energy consumption and performance.
- [Measuring the Energy and Performance of Scientific Workflows on Low-Power Clusters](https://doi.org/10.3390/electronics11111801)
    - Proposed Docker-based EMS architecture for efficient deployment and update processes.
    - Reduced workload by 60%, improved system resource utilization, and deployment efficiency.
- [Towards Energy-aware Scheduling of Scientific Workflows](https://doi.org/10.1109/GECOST55694.2022.10010634)
    - Paper focuses on energy-aware scheduling for scientific workflows.
    - Proposes requirements, challenges, and architecture for energy-efficient scheduler.


## ResearchRabbit (S1)
> Noting useful found

## ResearchRabbit (S2)
- [Performance Evaluation for Deploying Docker Containers On Baremetal and Virtual Machine](https://ieeexplore.ieee.org/document/8723998)
- [Docker-Based Energy Management System Development and Deployment Methods](https://ieeexplore.ieee.org/document/9311050)
    - Proposed Docker-based EMS architecture for efficient deployment and update processes.
    - Reduced workload by 60%, improved system resource utilization, and deployment efficiency.
- [Measuring Docker Performance: What a Mess!!!](https://dl.acm.org/doi/10.1145/3053600.3053605)
    - Paper focuses on Docker performance measurement in large-scale systems.
    - Discusses CPU and disk I/O overhead introduced by containers.
- [Energy Consumption Measurements in Docker](https://ieeexplore.ieee.org/document/8029935)
    - Docker power consumption measured with CPU as main contributor. 
    - Tests on real hardware with various loads, including network transfers. 
    - Study builds models to estimate power footprint of complex applications. 
- [How does docker affect energy consumption? Evaluating workloads in and out of Docker containers](https://www.sciencedirect.com/science/article/pii/S0164121218301456)
    - Docker increases energy use compared to bare-metal Linux due to I/O.
    - Developers should consider bare-metal deployments over Docker for I/O concerns.
- [Measuring the Energy and Performance of Scientific Workflows on Low-Power Clusters](https://www.mdpi.com/2079-9292/11/11/1801)
- [Stress testing of Docker containers running on a Windows operating system](https://iopscience.iop.org/article/10.1088/1742-6596/2339/1/012010)
    - Stress testing Docker containers on Windows for performance and reliability assessment.
