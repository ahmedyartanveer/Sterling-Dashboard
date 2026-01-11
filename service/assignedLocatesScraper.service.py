import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright

# Load environment variables
load_dotenv()

class FieldEdgeScraper:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self.dash_email = os.getenv("DASH_EMAIL")
        self.dash_password = os.getenv("DASH_PASSWORD")

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
        await self.page.goto('https://login.fieldedge.com/Account/Login', wait_until='domcontentloaded')
        await self.page.fill('input[name="UserName"]', self.dash_email)
        await self.page.fill('input[name="Password"]', self.dash_password)

        # Wait for navigation and click submit simultaneously
        async with self.page.expect_navigation(wait_until='domcontentloaded'):
            await self.page.click('input[type="submit"][value="Sign in to your account"]')

    async def select_status(self, status_name):
        """Selects the status button"""
        btn = self.page.locator(f'button[title="{status_name}"]')
        if await btn.count() > 0:
            await btn.click()

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
        await self.page.wait_for_selector('.kgRow', timeout=60000)

        # Using evaluate to run JS inside browser for 100% exact logic match and speed
        scraped_data = await self.page.evaluate("""() => {
            const rows = [];

            document.querySelectorAll('.kgRow').forEach((row, index) => {
                const cells = row.querySelectorAll('.kgCell');
                const getText = (i) => cells[i]?.textContent.trim() || '';

                const priorityEl = cells[0]?.querySelector('div[style*="background-color"]');
                const tagEls = row.querySelectorAll('.tag-label') || [];

                rows.push({
                    serial: index + 1,                                       // Serial Number
                    priorityColor: priorityEl?.style.backgroundColor || '',  // 1. Priority Color
                    priorityName: getText(1),                                // 2. Priority Name
                    customerPO: getText(3),                                  // 3. Customer PO #
                    customerName: getText(4),                                // 4. Customer Name
                    customerAddress: getText(5),                             // 5. Customer Address
                    tags: Array.from(tagEls).map(t => t.textContent.trim()).join(', '), // 6. Tags
                    techName: getText(7),                                    // 7. Tech Name
                    purchaseStatus: getText(13),                             // 8. Purchase Status
                    promisedAppointment: getText(8),                         // 9. Promised Appointment
                    createdDate: getText(9),                                 // 10. Created Date
                    scheduledDate: getText(8),                               // 11. Scheduled Date
                    taskDuration: getText(12),                               // 12. Task (Duration)
                });
            });

            const dispatchDate = document.querySelector('.dispatch-date, .date-header')?.textContent.trim() || '';
            return { dispatchDate, rows };
        }""")

        return scraped_data

    async def run(self):
        """Orchestrator method to run the whole process"""
        try:
            await self.initialize()
            
            # Go to Dispatch Board
            await self.page.goto('https://login.fieldedge.com/Dispatch', wait_until='domcontentloaded')
            
            # Login if redirected (logic inferred from original script flow)
            if "Login" in self.page.url:
                await self.login()
                # Ensure we represent correct navigation after login if needed, 
                # strictly following original script which explicitly goes to /Dispatch
                await self.page.goto('https://login.fieldedge.com/Dispatch', wait_until='domcontentloaded')

            await self.select_status('Assigned')

            # Date Logic
            raw_start_date = '2025-12-01'
            raw_end_date = '2025-12-31'
            
            start_date = self.format_date(raw_start_date)
            end_date = self.format_date(raw_end_date)

            await self.set_date_filter(start_date, end_date)
            await self.apply_filters()

            scraped = await self.scrape_data()

            result = {
                "filterStartDate": start_date,
                "filterEndDate": end_date,
                "dispatchDate": scraped['dispatchDate'],
                "workOrders": scraped['rows'],
                "totalWorkOrders": len(scraped['rows']),
            }

            return result

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            if self.browser:
                await self.browser.close()

# --- Execution ---
async def main():
    scraper = FieldEdgeScraper()
    data = await scraper.run()
    
    # Printing result to verify output matches Node.js version
    import json
    print(json.dumps(data, indent=2))

if __name__ == "__main__":
    asyncio.run(main())