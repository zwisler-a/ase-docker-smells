import time

import paramiko
import requests
import json

# Example usage
host = 'zwisler'
port = 22
username = 'zwisler'
password = '***'
prometheus_url = 'http://zwisler-rog:9090'
remote_repo_folder = '/home/zwisler/ase-docker-smells/'
test_time_period = 60 * 61 # 45minx


def execute_remote_command(host, port, username, password, command):
    # Create an SSH client
    ssh = paramiko.SSHClient()
    # Load host keys and set policy to automatically add the host key if missing
    ssh.load_system_host_keys()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        # Connect to the remote host
        ssh.connect(host, port=port, username=username, password=password)
        print(f"Connected to {host}")

        # Execute the command
        stdin, stdout, stderr = ssh.exec_command(command)

        # Fetch the results
        output = stdout.read().decode()
        error = stderr.read().decode()

        # Print the results
        if output:
            print("Output:")
            print(output)
        if error:
            print("Error:")
            print(error)

    except Exception as e:
        print(f"Failed to execute command: {e}")
    finally:
        # Close the SSH connection
        ssh.close()
        print("Connection closed")


def fetch_prometheus_timeseries(prometheus_url, query, start_time, end_time, step):
    """
    Fetches a time series from Prometheus.

    :param prometheus_url: The base URL of the Prometheus server.
    :param query: The Prometheus query to execute.
    :param start_time: The start time for the query (Unix timestamp in seconds).
    :param end_time: The end time for the query (Unix timestamp in seconds).
    :param step: The query resolution step width in seconds.
    :return: The fetched time series data.
    """
    url = f"{prometheus_url}/api/v1/query_range"
    params = {
        'query': query,
        'start': start_time,
        'end': end_time,
        'step': step
    }
    response = requests.get(url, params=params)

    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to fetch data from Prometheus: {response.status_code} - {response.text}")


# Example usage
promql_power_plug = 'plug_power{device="Power"} / 10'  # Replace with your Prometheus query
promql_scaphandre = 'scaph_host_power_microwatts * 1e-6'  # Replace with your Prometheus query
step = 0.5  # Resolution step in seconds


def run_test_for(image_name, start_script_args, stop_script_args):
    print("Running test for", image_name)
    start_time = time.time()
    execute_remote_command(host, port, username, password,
                           f"{remote_repo_folder}script/start_images.sh {start_script_args} -i {image_name}")
    print("Containers started! Going to sleep for " + str(test_time_period) + "s")
    time.sleep(test_time_period)
    end_time = time.time()
    print("Naptime is over :) stopping containers")
    execute_remote_command(host, port, username, password,
                           f"{remote_repo_folder}script/stop_images.sh {stop_script_args}")
    print("Containers stopped! Grabbing data from Prometheus ...")
    data_power_plug = fetch_prometheus_timeseries(prometheus_url, promql_power_plug, start_time, end_time, step)
    data_scaphandre = fetch_prometheus_timeseries(prometheus_url, promql_scaphandre, start_time, end_time, step)

    # Save the data to a JSON file with start, end time and image name
    output_filename = f"{image_name}_{start_time}_{end_time}.json"
    output_data = {
        "start_time": start_time,
        "end_time": end_time,
        "data": {
            "power_plug": data_power_plug,
            "scaphandre": data_scaphandre
        },
        "image_name": image_name
    }

    with open(output_filename, 'w') as outfile:
        json.dump(output_data, outfile, indent=4)

    print(f"Data saved to {output_filename}")


for image in [
    'face_regoc:asis', 'face_recog:fixed',
    'tts:asis', 'tts:fixed',
    'face_regoc:asis', 'face_recog:fixed',
    'tts:asis', 'tts:fixed'
]:
    image_count = 300
    run_test_for(image, start_script_args=f"-c {image_count} -a '-m 1gb --entrypoint tail'",
                 stop_script_args=f"-c {image_count}")
