#!/bin/bash

# Define the number of repetitions
REPEAT=6

# Get the number of CPU cores
CORES=$(nproc)

# Function to spike CPU usage on all cores
spike_cpu() {
    end=$((SECONDS+30))
    while [ $SECONDS -lt $end ]; do
        :
    done
}

# Main loop
for i in $(seq 1 $REPEAT); do
    # Spike CPU usage
    for j in $(seq 1 $CORES); do
        spike_cpu &
    done

    # Write timestamp to file
    echo "$(date +%s%3N)" >> cpu_spike_timestamps.txt

    # Wait for the spike duration
    sleep 30

    # Terminate the spike processes
    pkill -f spike_cpu

    # Wait for the cooldown period
    sleep 30
done