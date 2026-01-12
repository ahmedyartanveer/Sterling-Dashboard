import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page

# Load environment variables
load_dotenv()

class AssignedDispatchScraper:
    def __init__(self):
        self.base_url = "https://login.fieldedge.com"
        self.username = os.getenv("DASH_EMAIL")
        self.password = os.getenv("DASH_PASSWORD")
        # Browser configurations
        self.headless = False 
        self.slow_mo = 50

    @staticmethod
    def format_date(date_str: str) -> str:
        """Converts YYYY-MM-DD to MM/DD/YYYY format."""
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            return d.strftime("%m/%d/%Y")
        except ValueError:
            return date_str

    async def login(self, page: Page):
        """Handles the login process securely."""
        print("Logging in...")
        await page.goto(f"{self.base_url}/Account/Login", wait_until="domcontentloaded")
        
        await page.fill('input[name="UserName"]', self.username)
        await page.fill('input[name="Password"]', self.password)
        
        # Wait for navigation after click
        async with page.expect_navigation(wait_until="domcontentloaded"):
            await page.click('input[type="submit"][value="Sign in to your account"]')
        print("Login successful.")

    async def select_status(self, page: Page, status_name: str):
        """Selects the status button (e.g., Assigned)."""
        btn = page.locator(f'button[title="{status_name}"]')
        if await btn.count() > 0:
            await btn.click()
            print(f"Status selected: {status_name}")

    async def set_date_filter(self, page: Page, start_date: str, end_date: str, start_time: str = '', end_time: str = ''):
        """Sets the date and time filters."""
        print(f"Setting date filter: {start_date} to {end_date}")
        
        # Open filter dropdown
        date_filter_dropdown = page.locator('div.filter-dropdown:has(.time-filter) div.filter-text').first
        if await date_filter_dropdown.count() > 0:
            await date_filter_dropdown.click()

        # Fill Dates
        start_input = page.locator('#start-date-filter')
        await start_input.fill('')
        await start_input.fill(start_date)

        end_input = page.locator('#end-date-filter')
        await end_input.fill('')
        await end_input.fill(end_date)

        # Fill Times (if provided)
        if start_time:
            time_input = page.locator('#startTime')
            await time_input.fill('')
            await time_input.fill(start_time)

        if end_time:
            time_input = page.locator('#endTime')
            await time_input.fill('')
            await time_input.fill(end_time)

    async def apply_filters(self, page: Page):
        """Clicks Apply button."""
        apply_btn = page.locator('.plot-map-button:has-text("Apply")')
        if await apply_btn.count() > 0:
            await apply_btn.click()
            await page.wait_for_timeout(2000)
            print("Filters applied.")

    async def extract_data(self, page: Page):
        """Executes JavaScript to scrape the table data."""
        print("Waiting for data table...")
        await page.wait_for_selector('.kgRow', timeout=60000)

        # JavaScript execution inside Python
        scraped_data = await page.evaluate("""() => {
            const rows = [];
            document.querySelectorAll('.kgRow').forEach((row, index) => {
                const cells = row.querySelectorAll('.kgCell');
                const getText = (i) => cells[i]?.textContent.trim() || '';

                const priorityEl = cells[0]?.querySelector('div[style*="background-color"]');
                const tagEls = row.querySelectorAll('.tag-label') || [];

                rows.push({
                    serial: index + 1,
                    priorityColor: priorityEl?.style.backgroundColor || '',
                    priorityName: getText(1),
                    customerPO: getText(3),
                    customerName: getText(4),
                    customerAddress: getText(5),
                    tags: Array.from(tagEls).map(t => t.textContent.trim()).join(', '),
                    techName: getText(7),
                    purchaseStatus: getText(13),
                    promisedAppointment: getText(8),
                    createdDate: getText(9),
                    scheduledDate: getText(8),
                    taskDuration: getText(12)
                });
            });

            const dispatchDate = document.querySelector('.dispatch-date, .date-header')?.textContent.trim() || '';
            return { dispatchDate, rows };
        }""")
        
        return scraped_data

    async def run(self):
        """Main execution method."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=self.headless, slow_mo=self.slow_mo)
            context = await browser.new_context()
            page = await context.new_page()

            try:
                # 1. Login
                await self.login(page)

                # 2. Go to Dispatch Page
                await page.goto(f"{self.base_url}/Dispatch", wait_until="domcontentloaded")

                # 3. Select Status 'Assigned'
                await self.select_status(page, 'Assigned')

                # 4. Set Date Filters
                start_date = self.format_date('2025-12-01')
                end_date = self.format_date('2025-12-31')
                await self.set_date_filter(page, start_date, end_date)
                
                # 5. Apply Filters
                await self.apply_filters(page)

                # 6. Scrape Data
                data = await self.extract_data(page)

                # 7. Return Final Result
                result = {
                    "filterStartDate": start_date,
                    "filterEndDate": end_date,
                    "dispatchDate": data['dispatchDate'],
                    "workOrders": data['rows'],
                    "totalWorkOrders": len(data['rows']),
                }
                
                return result

            except Exception as e:
                print(f"An error occurred: {e}")
                return None
            finally:
                await browser.close()

# --- Execution ---
if __name__ == "__main__":
    scraper = AssignedDispatchScraper()
    result_data = asyncio.run(scraper.run())
    
    if result_data:
        print(f"Successfully scraped {result_data['totalWorkOrders']} assigned orders.")
        # print(result_data['workOrders']) # Uncomment to see the raw data