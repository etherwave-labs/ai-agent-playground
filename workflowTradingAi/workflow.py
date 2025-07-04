import time
import requests
from pprint import pprint 

URL = (
    "http://localhost:3000/api/messaging/central-channels/"
    "91b0c098-b2c3-44f8-9dbb-f0d3ca2626f4/messages"
)

payload = {
    "author_id": "f6a0a8d1-f28d-4538-bdab-5eb0b527430c",
    "content": "fais un trade",
    "server_id": "00000000-0000-0000-0000-000000000000",
    "raw_message": {
        "roomId": "91b0c098-b2c3-44f8-9dbb-f0d3ca2626f4",
        "source": "client_chat",
        "message": "fais un trade",
        "metadata": {
            "isDm": True,
            "channelType": "DM",
            "targetUserId": "49352196-f6d2-0e9b-a5cd-896a96f5119d"
        },
        "senderId": "f6a0a8d1-f28d-4538-bdab-5eb0b527430c",
        "serverId": "00000000-0000-0000-0000-000000000000",
        "channelId": "91b0c098-b2c3-44f8-9dbb-f0d3ca2626f4",
        "messageId": "00b8ecdb-fc80-4fab-a643-93586b43cf53",
        "senderName": "User-f6a0a8d1"
    },
    "metadata": {
        "isDm": True,
        "channelType": "DM",
        "targetUserId": "49352196-f6d2-0e9b-a5cd-896a96f5119d"
    },
    "source_type": "client_chat"
}

headers = {
    "Accept": "application/json",
    "Content-Type": "application/json"
}

def send_message():
    try:
        resp = requests.post(URL, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()      
        print("Message créé :", resp.status_code)
        pprint(resp.json())     
    except requests.exceptions.HTTPError as e:
        print("Erreur HTTP :", e.response.status_code, e.response.text)
    except requests.exceptions.RequestException as e:
        print("Erreur réseau :", e)

while True:
    send_message()
    time.sleep(3600)