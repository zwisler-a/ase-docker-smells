#!/bin/bash

# Default values
IMAGE_NAME="nginx:latest"
ADDITIONAL_ARGS=""
CONTAINER_COUNT=100

# Check if arguments are provided
while getopts i:a:c: flag
do
    case "${flag}" in
        i) IMAGE_NAME=${OPTARG};;
        a) ADDITIONAL_ARGS=${OPTARG};;
        c) CONTAINER_COUNT=${OPTARG};;
    esac
done

# Start specified number of Docker containers
for i in $(seq 1 $CONTAINER_COUNT); do
    docker run -d --name test_container_$i $ADDITIONAL_ARGS $IMAGE_NAME -f /dev/null &
done

wait

echo "Started $CONTAINER_COUNT Docker containers."