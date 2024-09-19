#!/bin/bash

# Default values
CONTAINER_COUNT=100

# Check if arguments are provided
while getopts c: flag
do
    case "${flag}" in
        c) CONTAINER_COUNT=${OPTARG};;
    esac
done

# Stop the Docker containers in parallel
for i in $(seq 1 $CONTAINER_COUNT); do
    docker stop test_container_$i &
done

# Wait for all stop operations to complete
wait

# Remove the Docker containers in parallel
for i in $(seq 1 $CONTAINER_COUNT); do
    docker rm test_container_$i &
done

# Wait for all remove operations to complete
wait

echo "Stopped and removed $CONTAINER_COUNT Docker containers"
