"""
API Client Service
Handles all API communication with the backend server.
"""
import os
import requests
from faker import Faker
from dotenv import load_dotenv

load_dotenv()


class APIClient:
    """
    Client for interacting with the Sterling Dashboard API.
    Handles authentication, token management, and data operations.
    """
    
    def __init__(self):
        """Initialize API client with configuration and authentication."""
        self.base_url = os.getenv('API_URL')
        
        # API endpoints
        self.locates_endpoint = f"{self.base_url}locates/sync/"
        self.work_orders_endpoint = f"{self.base_url}work-orders-today/"
        self.login_endpoint = f"{self.base_url}auth/login"
        
        # Request headers
        self.headers = {
            'accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        # Utilities
        self.faker = Faker()
        
        # Authenticate and get token
        self.token = self._login()
    
    def _login(self):
        """
        Authenticate with the API and retrieve access token.
        
        Returns:
            str: Authentication token or None if login fails
        """
        print("Attempting API login...")
        
        try:
            credentials = {
                "email": os.getenv('API_EMAIL', 'admin@gmail.com'),
                "password": os.getenv('API_PASSWORD', 'admin'),
                "device": {
                    "deviceId": self.faker.uuid4(),
                    "browser": "Chrome",
                    "browserVersion": "120",
                    "os": "Windows",
                    "osVersion": "10",
                    "deviceType": "Desktop"
                }
            }
            
            response = requests.post(
                self.login_endpoint,
                json=credentials,
                headers=self.headers,
                timeout=30
            )
            
            if response.status_code == 200:
                token = response.json().get("token")
                print("API login successful.")
                return token
            else:
                print(f"Login failed with status {response.status_code}: {response.text}")
                return None
        
        except requests.Timeout:
            print("Login request timed out.")
            return None
        except requests.RequestException as e:
            print(f"Login connection error: {e}")
            return None
    
    def _ensure_authenticated(self):
        """
        Ensure valid authentication token exists.
        Attempts to login if token is missing.
        
        Returns:
            bool: True if authenticated, False otherwise
        """
        if not self.token:
            print("Token missing, attempting re-authentication...")
            self.token = self._login()
            
            if not self.token:
                print("Could not obtain authentication token.")
                return False
        
        # Update authorization header
        self.headers['Authorization'] = f'Bearer {self.token}'
        return True
    
    def _handle_response(self, response, method):
        """
        Process API response and handle common status codes.
        
        Args:
            response: requests.Response object
            method: HTTP method used (for logging)
            
        Returns:
            dict/list/bool: Response data or None on failure
        """
        # Success
        if response.status_code in [200, 201]:
            print(f"{method} request successful (Status: {response.status_code})")
            
            # Return JSON if available, otherwise True
            try:
                return response.json()
            except ValueError:
                return True
        
        # Unauthorized - token expired
        elif response.status_code == 401:
            print("Token expired (401). Needs re-authentication.")
            return None
        
        # Other errors
        else:
            print(f"{method} request failed (Status: {response.status_code})")
            print(f"Response: {response.text}")
            return None
    
    def insert_locates(self, locates_data):
        """
        Send locates data to the API.
        
        Args:
            locates_data: Dictionary containing work orders and filter dates
            
        Returns:
            bool: True if insertion successful, False otherwise
        """
        if not self._ensure_authenticated():
            return False
        
        if not locates_data.get("workOrders", []):
            print("No work orders to insert.")
            return False
        
        print("Sending locates data...")
        print(locates_data)
        try:
            response = requests.post(
                self.locates_endpoint,
                json=locates_data,
                headers=self.headers,
                timeout=60
            )
            
            result = self._handle_response(response, "POST")
            
            # Retry once if unauthorized
            if result is None and response.status_code == 401:
                print("🔄 Retrying with fresh token...")
                
                if self._ensure_authenticated():
                    response = requests.post(
                        self.locates_endpoint,
                        json=locates_data,
                        headers=self.headers,
                        timeout=60
                    )
                    result = self._handle_response(response, "POST")
            
            return bool(result)
        
        except requests.Timeout:
            print("Request timed out while inserting locates.")
            return False
        except requests.RequestException as e:
            print(f"Connection error during insert: {e}")
            return False
    
    def insert_work_order_today(self, work_order_data):
        """
        Insert or update a single work order for today.

        Args:
            work_order_data: Dictionary containing work order details

        Returns:
            bool: True if successful, False otherwise
        """

        wo_number = work_order_data.get("wo_number")

        if not wo_number:
            print("wo_number is required.")
            return False

        # Step 1: Check if work order exists
        result = self.manage_work_orders(
            method_type="GET",
            params={"wo_number": wo_number}
        )

        # If API returns list of results
        if result and isinstance(result, list) and len(result) > 0:
            existing_record = result[0]
            record_id = existing_record.get("id")

            if not record_id:
                print("Record ID not found in response.")
                return False

            # Step 2: Update existing record
            update_result = self.manage_work_orders(
                method_type="PATCH",
                record_id=record_id,
                data=work_order_data
            )

            if update_result is not None:
                print("Work order updated successfully.")
                return True
            else:
                print("Failed to update work order.")
                return False

        else:
            # Step 3: Create new record
            create_result = self.manage_work_orders(
                method_type="POST",
                data=work_order_data
            )

            if create_result is not None:
                print("Work order created successfully.")
                return True
            else:
                print("Failed to create work order.")
                return False

    
    def manage_work_orders(self, method_type, data=None, record_id=None, params=None):
        """
        Universal method for CRUD operations on work orders.
        
        Args:
            method_type: HTTP method ('GET', 'POST', 'PATCH')
            data: Request body for POST/PATCH
            record_id: Specific record ID for single-item operations
            params: URL query parameters for filtering
            
        Returns:
            dict/list: Response data or None on failure
        """
        method = method_type.upper()
        
        # Build URL
        url = self.work_orders_endpoint
        if record_id:
            url = f"{self.work_orders_endpoint}{record_id}/"
        
        # Ensure authentication
        if not self._ensure_authenticated():
            return None
        
        print(f"Sending {method} request to: {url}")
        
        try:
            response = requests.request(
                method=method,
                url=url,
                json=data,
                params=params,
                headers=self.headers,
                timeout=60
            )
            
            result = self._handle_response(response, method)
            
            # Retry once if unauthorized
            if result is None and response.status_code == 401:
                print("🔄 Retrying with fresh token...")
                
                if self._ensure_authenticated():
                    response = requests.request(
                        method=method,
                        url=url,
                        json=data,
                        params=params,
                        headers=self.headers,
                        timeout=60
                    )
                    result = self._handle_response(response, method)
            
            return result
        
        except requests.Timeout:
            print(f"{method} request timed out.")
            return None
        except requests.RequestException as e:
            print(f"Connection error during {method}: {e}")
            return None
    
    
    def work_order_today_edit(self, form_data, septic_components_form_data, work_order_today_id):
        """
        Update work order today edit data (PATCH).

        Args:
            edit_id (int): work-order-edit record ID
            form_data (dict): form data to update
            work_order_today_id (int): related work_order_today ID

        Returns:
            dict | None: API response or None if failed
        """
        if not self._ensure_authenticated():
            return None

        url = f"{self.base_url}work-order-edit/{work_order_today_id}/?status=UPDATE"

        
        payload = {
            "form_data": form_data,
            "septic_components_form_data": septic_components_form_data,
            "work_order_today": work_order_today_id
        }
        

        print(f"Sending PATCH request to: {url}")

        try:
            response = requests.patch(
                url=url,
                json=payload,
                headers=self.headers,
                timeout=60
            )

            result = self._handle_response(response, "PATCH")

            # 🔄 Retry once if token expired
            if result is None and response.status_code == 401:
                print("🔄 Retrying PATCH with fresh token...")

                if self._ensure_authenticated():
                    response = requests.patch(
                        url=url,
                        json=payload,
                        headers=self.headers,
                        timeout=60
                    )
                    result = self._handle_response(response, "PATCH")

            return result

        except requests.Timeout:
            print("PATCH request timed out.")
            return None
        except requests.RequestException as e:
            print(f"Connection error during PATCH: {e}")
            return None
