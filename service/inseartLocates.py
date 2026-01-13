import requests
from faker import Faker
from dotenv import load_dotenv
import os

load_dotenv()

class InseartLocatesService:
    def __init__(self):
        # Header setup
        self.headers_data = {
            'accept': 'application/json',
            # 'Content-Type' is not needed here manually if using json= parameter
        }
        
        # URL setup
        self.base_url = os.getenv('API_URL', 'http://localhost:8000/api/')
        self.api_url = self.base_url + "sync-assigned-dashboard"
        self.login_url = self.base_url + "auth/login"
        
        # Utilities
        self.faker = Faker()
        self.token = self.login() # Initial Login
    
    def login(self):
        print("Attempting to login...")
        try:
            body = {
                "email": "admin@gmail.com",
                "password": "admin",
                "device": {
                    "deviceId": self.faker.uuid4(),
                    "browser": "Chrome", # Fixed: Short name to prevent DB error
                    "browserVersion": "120",
                    "os": "Windows",
                    "osVersion": "10",
                    "deviceType": "Desktop"
                }
            }
            
            response = requests.post(self.login_url, json=body, headers=self.headers_data)
            
            if response.status_code == 200:
                token = response.json().get("token")
                print("Login successful.")
                return token
            else:
                print(f"Login failed: {response.text}")
                return None
                
        except requests.RequestException as e:
            print(f"Login connection error: {e}")
            return None

    def insert_locates(self, locates_data: dict):
        """
        Sends locates data to the API. 
        If token is missing/expired, it attempts to login again.
        """
        # 1. Check if we have a token, if not, try to login
        if not self.token:
            print("Token missing, trying to login again...")
            self.token = self.login()
            if not self.token:
                print("Aborting: Could not obtain token.")
                return False
        
        # 2. Add Authorization header
        self.headers_data['Authorization'] = f'Bearer {self.token}'

        print("Sending locates data...")
        try:
            response = requests.post(self.api_url, json=locates_data, headers=self.headers_data)
            
            # Check specifically for success (200 or 201)
            if response.status_code in [200, 201]:
                print(f"✅ Locates inserted successfully! (Status: {response.status_code})")
                return True
            
            # Handle unauthorized (401) - Maybe token expired?
            elif response.status_code == 401:
                print("⚠️ Token expired. Re-authenticating...")
                self.token = self.login()
                if self.token:
                    # Retry the request once with new token
                    self.headers_data['Authorization'] = f'Bearer {self.token}'
                    retry_response = requests.post(self.api_url, json=locates_data, headers=self.headers_data)
                    if retry_response.status_code in [200, 201]:
                        print("✅ Locates inserted successfully after retry.")
                        return True
                print(f"❌ Failed after retry. Status: {response.status_code}")
                print("Response:", response.text)
                return False
                
            else:
                print(f"❌ Failed to insert locates. Status: {response.status_code}")
                print("Response:", response.text)
                return False

        except requests.RequestException as e:
            print(f"❌ Connection error during insert: {e}")
            return False

# --- Example Usage ---
if __name__ == "__main__":
    service = InseartLocatesService()
    
    # Dummy data for testing
    dummy_data = {
        "assigned_dashboard_id": 1,
        "locates": [
            {"lat": 23.8103, "lng": 90.4125, "timestamp": "2026-01-13T10:00:00Z"},
            {"lat": 23.8105, "lng": 90.4128, "timestamp": "2026-01-13T10:05:00Z"}
        ]
    }
    
    # Call the new method
    if service.token:
        service.insert_locates(dummy_data)