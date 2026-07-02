import requests
import os

def send_notification(message: str, player_ids: list):

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": f"Basic {os.getenv('ONESIGNAL_REST_API_KEY')}"
    }

    payload = {
        "app_id": os.getenv('ONESIGNAL_APP_ID'),
        "include_player_ids": player_ids,  # target users
        "contents": {"en": message}
    }
    
    response = requests.post(os.getenv('ONESIGNAL_API_URL'), headers=headers, json=payload)
    return response.json()