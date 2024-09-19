import threading

from prometheus_client import start_http_server, Gauge
import tinytuya
import logging

logging.basicConfig()
log = logging.getLogger(__name__)
log.setLevel(logging.DEBUG)

start_http_server(8000)
power = Gauge('plug_power', 'Power Plug - Power', ['device'])
amperage = Gauge('plug_current', 'Power Plug - Current', ['device'])
voltage = Gauge('plug_voltage', 'Power Plug - Voltage', ['device'])


def device_thread(current_device, device_data):
    log.info(f'Monitoring {device_data["name"]} ...')
    while True:
        current_device.updatedps([18, 19, 20], nowait=True)
        current_device.send(current_device.generate_payload(tinytuya.DP_QUERY))
        data = current_device.receive()
        if data is not None and 'dps' in data:
            data = data['dps']
            if '18' in data:
                amperage.labels(device=device_data['name']).set(data['18'])
            if '19' in data:
                power.labels(device=device_data['name']).set(data['19'])
            if '20' in data:
                voltage.labels(device=device_data['name']).set(data['20'])


devices_data = {
    "bfd6e5dda4e79325b6atbs": {
        "name": "Power",
        "id": "bfd6e5dda4e79325b6atbs",
        "ip": "192.168.178.129",
        "key": "*)um~b6!SJFIu~:k",
        "version": "3.3"
    }
}

for monit_device in devices_data.values():
    device = tinytuya.OutletDevice(
        dev_id=monit_device['id'],
        address=monit_device['ip'],
        local_key=monit_device['key'],
        persist=True,
        version=monit_device['version']
    )
    threading.Thread(target=device_thread, args=(device, monit_device)).start()
