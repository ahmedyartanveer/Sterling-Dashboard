import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from datetime import datetime, timedelta
import json

# Load environment variables
load_dotenv()
RULES_FILE_PATH = os.getenv("RULES_FILE_PATH", "service/locatesRules.json")

class FieldEdgeScraper:
    def __init__(self):
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

    def format_date(self, date_str):
        """Formats date from YYYY-MM-DD to MM/DD/YYYY to match JS logic"""
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            return d.strftime("%m/%d/%Y")
        except ValueError:
            return date_str

    async def initialize(self):
        """Launches the browser"""
        playwright = await async_playwright().start()
        # Headless false and slow_mo matches your Node config
        self.browser = await playwright.chromium.launch(headless=False, slow_mo=50)
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()

    async def login(self):
        """Handles login logic"""
        # await self.page.goto('https://login.fieldedge.com/Account/Login', wait_until='domcontentloaded')
        await self.page.fill(self.rules.get('username_xpath'), self.dash_email)
        await self.page.fill(self.rules.get('password_xpath'), self.dash_password)

        # Wait for navigation and click submit simultaneously
        async with self.page.expect_navigation(wait_until='domcontentloaded'):
            await self.page.click(self.rules.get('login_button_xpath'))

    async def select_status(self, status_name):
        """Selects the status button"""
        btn = self.page.locator(f'button[title="{status_name}"]')
        if await btn.count() > 0:
            await btn.click()
    
    async def select_checkbox_by_xpath(self, task_name):
        """Selects the label using XPath"""
        
        # normalize-space use kora hoyeche jeno html er age-pore space thakleo kaj kore
        task_btn_xpath = self.rules.get('task_dropdown_xpath', "//span[text()='Task']")
        xpath_selector = f"//label[normalize-space(text())='{task_name}']"
        task_btn = self.page.locator(task_btn_xpath)
        if await task_btn.count() > 0:
            await task_btn.click()
            await self.page.wait_for_timeout(1000)  # wait for 1 second after clicking Task button
            label = self.page.locator(xpath_selector)
            if await label.count() > 0:
                await label.click()
                print(f"Clicked on: {task_name}")
            else:
                print(f"Label with text '{task_name}' not found!")
        else:
            print("Task button not found!")

    async def set_date_filter(self, start_date, end_date, start_time='', end_time=''):
        """Sets the date filters in the UI"""
        date_filter_dropdown = self.page.locator('div.filter-dropdown:has(.time-filter) div.filter-text').first
        
        if await date_filter_dropdown.count() > 0:
            await date_filter_dropdown.click()

        start_input = self.page.locator('#start-date-filter')
        end_input = self.page.locator('#end-date-filter')

        await start_input.fill('')
        await start_input.fill(start_date)
        await end_input.fill('')
        
        await end_input.fill('')
        await end_input.fill(end_date)

        if start_time:
            start_time_input = self.page.locator('#startTime')
            await start_time_input.fill('')
            await start_time_input.fill(start_time)

        if end_time:
            end_time_input = self.page.locator('#endTime')
            await end_time_input.fill('')
            await end_time_input.fill(end_time)

    async def apply_filters(self):
        """Clicks the apply button"""
        apply_btn = self.page.locator('.plot-map-button:has-text("Apply")')
        if await apply_btn.count() > 0:
            await apply_btn.click()
        await self.page.wait_for_timeout(2000)

    async def scrape_data(self):
        """Main scraping logic using page.evaluate for performance"""
        try:
            await self.page.wait_for_selector('.kgRow', state='attached', timeout=60000)
        except Exception as e:
            print(f"Error waiting for selector: {e}")
            return {'rows': []} # Return empty dict structure on error

        # 'r' is added before """ to make it a raw string (Fixes SyntaxWarning)
        scraped_data = await self.page.evaluate(r"""() => {
            const rows = [];
            
            const getTextByClass = (rowElement, classSelector) => {
                const el = rowElement.querySelector(classSelector);
                // Regex \s works correctly now because of raw string in Python
                return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; 
            };

            const domRows = document.querySelectorAll('.kgRow');

            domRows.forEach((row, index) => {
                try {
                    // Mapping classes based on your HTML structure
                    const pColor = row.querySelector('.col0 div[style*="background-color"]')?.style.backgroundColor || '';
                    const pName = getTextByClass(row, '.col1');
                    const woNumber = getTextByClass(row, '.col2');
                    const customerPO = getTextByClass(row, '.col3');
                    const customerName = getTextByClass(row, '.col4');
                    const customerAddr = getTextByClass(row, '.col5');
                    const tags = getTextByClass(row, '.col6');
                    const techName = getTextByClass(row, '.col7');
                    const purchaseStatus = getTextByClass(row, '.col8');
                    const promisedAppt = getTextByClass(row, '.col9');
                    const createdDate = getTextByClass(row, '.col10');
                    const scheduledDate = getTextByClass(row, '.col11');
                    const taskDuration = getTextByClass(row, '.col12');

                    rows.push({
                        priorityColor: pColor,
                        priorityName: pName,
                        workOrderNumber: woNumber,
                        customerPO: customerPO,
                        customerName: customerName,
                        customerAddress: customerAddr,
                        tags: tags,
                        techName: techName,
                        purchaseStatus: purchaseStatus,
                        promisedAppointment: promisedAppt,
                        createdDate: createdDate,
                        scheduledDate: scheduledDate,
                        task: taskDuration
                    });

                } catch (err) {
                    console.error(`Error parsing row ${index}:`, err);
                }
            });

            // Returning an object/dictionary instead of array (Fixes list indices error)
            return { rows: rows, count: rows.length };
        }""")

        return scraped_data

    async def run(self):
        """Orchestrator method to run the whole process"""
        try:
            await self.initialize()
            
            # Go to Dispatch Board
            await self.page.goto(self.rules.get('web_url'), wait_until='domcontentloaded')
            
            # Login if redirected (logic inferred from original script flow)
            if "Login" in self.page.url:
                await self.login()
                # Ensure we represent correct navigation after login if needed, 
                # strictly following original script which explicitly goes to /Dispatch
                # await self.page.goto('https://login.fieldedge.com/Dispatch', wait_until='domcontentloaded')

            await self.select_status(self.rules.get('status_name', "Assigned"))
            if self.rules.get('is_apply_task', False):
                await self.select_checkbox_by_xpath(self.rules.get('task_option_name', "EXCAVATION DRAIN FIELD REPAIR"))

            # Date Logic
            start_date = self.rules.get('start_date') or datetime.now().strftime('%m/%d/%Y')
            start_time = self.rules.get('start_time') or (datetime.now() - timedelta(minutes=self.rules.get('time_offset_minutes', 15))).strftime('%I:%M %p')
            end_date = self.rules.get('end_date') or datetime.now().strftime('%m/%d/%Y')
            end_time = self.rules.get('end_time') or datetime.now().strftime('%I:%M %p')

            await self.set_date_filter(start_date, end_date, start_time, end_time)
            await self.apply_filters()

            scraped = await self.scrape_data()
            print(f"{start_date} {start_time}")
            print(f"{end_date} {end_time}")
            result = {
                "filterStartDate": start_date,
                "filterEndDate": end_date,
                "totalWorkOrders": len(scraped['rows']),
                "workOrders": scraped['rows'],
            }

            return result

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            if self.browser:
                await self.browser.close()
    
    def inseat_locates(self, locates_data):
        """Inserts locates data using InseartLocatesService"""
        from inseartLocates import InseartLocatesService
        inserter = InseartLocatesService()
        success = inserter.insert_locates(locates_data)
        return success

# --- Execution ---
async def main():
    scraper = FieldEdgeScraper()
    data = await scraper.run()
    if data:
        scraper.inseat_locates(data)
    else:
        print("No data scraped.")
    
    
if __name__ == "__main__":
    asyncio.run(main())