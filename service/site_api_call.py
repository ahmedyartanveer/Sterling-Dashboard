import requests
from faker import Faker
from dotenv import load_dotenv
import os

load_dotenv()

class SiteAPICall:
    def __init__(self):
        # Header setup
        self.headers_data = {
            'accept': 'application/json',
            # 'Content-Type' is not needed here manually if using json= parameter
        }
        
        # URL setup
        self.base_url = os.getenv('API_URL')
        self.api_url = self.base_url + "sync-dashboard"
        self.work_orders_today_url = self.base_url + "work-orders-today/"
        self.get_work_orders_url_isnall = self.base_url + "work-orders-today/?last_report_link__isnull=isnull&unlocked_report_link__isnull=isnull"
        self.login_url = self.base_url + "auth/login"
        
        # Utilities
        self.faker = Faker()
        self.token = self.login() # Initial Login
    
    def login(self):
        print("Attempting to login...")
        try:
            body = {
                "email": os.getenv('API_EMAIL', 'admin@gmail.com'),
                "password": os.getenv('API_PASSWORD', 'admin'),
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
        print(locates_data)
        if not locates_data.get("workOrders", []):
            print("No work orders to insert.")
            return False
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
    
    def manage_work_orders(self, method_type, data=None, record_id=None, params=None):
        """
        Universal method for GET, POST, PATCH on work-orders-today.
        
        :param method_type: 'GET', 'POST', or 'PATCH'
        :param data: Dictionary data for POST/PATCH body
        :param record_id: ID string for specific item (needed for PATCH/GET-one)
        :param params: Dictionary for URL query parameters (e.g., filtering)
        """
        
        method = method_type.upper()
        url = self.work_orders_today_url
    
        if record_id:
            url = f"{self.work_orders_today_url}{record_id}/"

        # 2. Token Check
        if not self.token:
            print("Token missing, trying to login again...")
            self.token = self.login()
            if not self.token:
                return None
        
        self.headers_data['Authorization'] = f'Bearer {self.token}'

        print(f"Sending {method} request to: {url}")

        try:
            # 3. Dynamic Request Call
            response = requests.request(
                method=method,
                url=url,
                json=data,      # POST/PATCH 
                params=params,  # GET 
                headers=self.headers_data
            )
            
            # 4. Handle Success (200 OK, 201 Created)
            if response.status_code in [200, 201]:
                print(f"✅ {method} Successful! (Status: {response.status_code})")
                return response.json()
            
            # 5. Handle Token Expiry (401) & Retry
            elif response.status_code == 401:
                print("⚠️ Token expired. Re-authenticating...")
                self.token = self.login()
                if self.token:
                    # Retry with new token
                    self.headers_data['Authorization'] = f'Bearer {self.token}'
                    response = requests.request(
                        method=method, url=url, json=data, params=params, headers=self.headers_data
                    )
                    
                    if response.status_code in [200, 201]:
                        print(f"✅ {method} Successful after retry.")
                        return response.json()
                
                print(f"❌ Failed after retry. Status: {response.status_code}")
                return None
                
            else:
                print(f"❌ Operation Failed. Status: {response.status_code}")
                print("Response:", response.text)
                return None

        except requests.RequestException as e:
            print(f"❌ Connection error during {method}: {e}")
            return None
        
            
        
    
        

