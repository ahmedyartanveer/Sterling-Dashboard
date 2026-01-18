import os
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from service.site_api_call import SiteAPICall
from datetime import datetime
import asyncio
import pytz
# Load environment variables
load_dotenv()
RULES_FILE_PATH = os.getenv("RULES_FILE_PATH", "service/locatesRules.json")




class BaseScraper:
    def __init__(self):
        self.playwright = None  # Playwright instance store 
        self.browser = None
        self.context = None
        self.page = None
        self.inserter = SiteAPICall()
        self.dash_email = os.getenv("DASH_EMAIL")
        self.dash_password = os.getenv("DASH_PASSWORD")
        self.rme_username = os.getenv("RME_username")
        self.rme_password = os.getenv("RME_password")
        self.rules = self.load_rules()
        
    def load_rules(self):
        """Loads rules from the JSON file"""
        import json
        try:
            with open(RULES_FILE_PATH, 'r') as f:
                data = json.load(f)
            if len(data) > 0:
                return data[0]  # Assuming single object in array
            return {}
        except Exception as e:
            print(f"Error loading rules: {e}")
            return {}

    async def initialize(self):
        """Launches the browser"""
        self.playwright = await async_playwright().start()
        
        # Headless false and slow_mo matches your Node config
        self.browser = await self.playwright.chromium.launch(headless=False, slow_mo=50)
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
    
    async def login_fieldedge(self):
        """Handles login logic"""
        await self.page.fill(self.rules.get('username_xpath'), self.dash_email)
        await self.page.fill(self.rules.get('password_xpath'), self.dash_password)

        # Wait for navigation and click submit simultaneously
        async with self.page.expect_navigation(wait_until='domcontentloaded'):
            await self.page.click(self.rules.get('login_button_xpath'))
    
    async def login_onlineRME(self):
        """Handles login logic"""
        await self.page.fill(self.rules.get('RME_username_xpath'), self.rme_username)
        await self.page.fill(self.rules.get('RME_password_xpath'), self.rme_password)

        # Wait for navigation and click submit simultaneously
        async with self.page.expect_navigation(wait_until='domcontentloaded'):
            await self.page.click(self.rules.get('RME_login_button_xpath'))
    
    async def select_by_xpaths(self, name: str = '', action_list: list = [], value = None):
        """Selects the complete checkbox or inputs text by XPath"""
        xpaths = self.rules.get(name, action_list)
        
        for item in xpaths:
            action = item.get("action", "")
            xpath = item.get("xpath", "")
            element = self.page.locator(xpath) # Renamed 'checkbox' to 'element' since it might be an input field
            
            if await element.count() > 0:
                if action == "click":
                    await element.click(timeout=5000)
                    print(f"Clicked on element with XPath: {xpath}")
                    
                elif action == "right_click":
                    await element.click(button="right", timeout=5000)
                    print(f"Right-clicked on element with XPath: {xpath}")
                    
                elif action == 'input':
                    # This is the part you asked for
                    if value is not None:
                        await element.fill(str(value))
                        print(f"Inputted '{value}' into element with XPath: {xpath}")
                    else:
                        print(f"Warning: Action is 'input' but no value was provided for XPath: {xpath}")

                # Use asyncio.sleep instead of time.sleep in async functions
                await asyncio.sleep(2) 
                return # Usually, once found and acted upon, you might want to return/break. Remove if you want to keep trying others.
                
        print("Element not found or action failed!")

    def inseat_locates(self, locates_data):
        """Inserts locates data using SiteAPICall"""
        try:
            
            success = self.inserter.insert_locates(locates_data)
            return success
        except Exception as e:
            print(f"DB Insertion Error: {e}")
            return False
    
    def inseat_workorder_today(self, todays):
        """Inserts locates data using SiteAPICall"""
        try:
            for today in todays:
                timezone = pytz.timezone('Etc/GMT+8')
                gmt_minus_8_time = datetime.now(timezone)
                today['elapsed_time'] = gmt_minus_8_time.isoformat()
                scheduled_date = today.get('scheduled_date', '')
                if scheduled_date:
                    date_obj = datetime.strptime(scheduled_date, '%m/%d/%Y')
                    today['scheduled_date'] = date_obj.replace(hour=0, minute=0, second=0).isoformat()
                else:
                    today['scheduled_date'] = None
                if self.inserter.insert_work_order_today(today):
                    print("Work order inserted successfully.")
                else:
                    print("Failed to insert work order.")
            return True
        except Exception as e:
            print(f"DB Insertion Error: {e}")
            return False