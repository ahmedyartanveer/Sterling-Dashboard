import os
from dotenv import load_dotenv
from playwright.async_api import async_playwright


# Load environment variables
load_dotenv()
RULES_FILE_PATH = os.getenv("RULES_FILE_PATH", "service/locatesRules.json")




class BaseScraper:
    def __init__(self):
        self.playwright = None  # Playwright instance store 
        self.browser = None
        self.context = None
        self.page = None
        self.dash_email = os.getenv("DASH_EMAIL")
        self.dash_password = os.getenv("DASH_PASSWORD")
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
