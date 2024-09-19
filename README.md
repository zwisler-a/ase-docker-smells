sc.exe create Scaphandre binPath="C:\Program Files (x86)\scaphandre\scaphandre.exe prometheus-push -H 127.0.0.1 -s 45 -S https -p 9090 --no-tls-check" DisplayName=Scaphandre start=auto

# Objectives
- Slurm workload management
- Software energy metering

# Deliverables
- Reusable code artifacts that measure the energy consumption of docker containers
- Energy and Performance measurements of Docker containers

# Research Questions
- What's the impact of docker smells on the energy consumption of an application?
    - What's the impact of docker container sizes on energy consumption?
    - What's the impact of docker smells on energy consumption in an idle state and under load?
- Can the presence of Docker smells be quantified to predict their impact on energy usage?
- What best practices can be implemented to minimize energy consumption and performance degradation due to Docker smells?

- (Optional) What's the impact on build time?

# TODO List
- Define RQ
- Work through papers
- Writeup
- Compile/Fetch dataset
- System architecture
- Implementation