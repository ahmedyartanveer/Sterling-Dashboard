import sys
import asyncio
from datetime import datetime
from service.inseartLocates import InseartLocatesService
from service.baseScraper import BaseScraper
from service.workOrdersScraper import WorkOrdersScraper


class FieldEdgeScraper(BaseScraper):
    def __init__(self):
        super().__init__()

    def format_date(self, date_str):
        """Formats date from YYYY-MM-DD to MM/DD/YYYY to match JS logic"""
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            return d.strftime("%m/%d/%Y")
        except ValueError:
            return date_str

    async def select_status(self, status_name):
        """Selects the status button"""
        btn = self.page.locator(f'button[title="{status_name}"]')
        if await btn.count() > 0:
            await btn.click()
    
    async def select_checkbox_by_xpath(self, task_name):
        """Selects the label using XPath"""
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

    async def set_date_filter(self, start_date, end_date):
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
            return {'rows': []}

        scraped_data = await self.page.evaluate(r"""() => {
            const rows = [];
            
            const getTextByClass = (rowElement, classSelector) => {
                const el = rowElement.querySelector(classSelector);
                return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; 
            };

            const domRows = document.querySelectorAll('.kgRow');

            domRows.forEach((row, index) => {
                try {
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
                    if (pName != "EXCAVATOR") {
                        return; 
                    }
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

            return { rows: rows, count: rows.length };
        }""")

        return scraped_data

    async def run(self):
        """Orchestrator method to run the whole process"""
        try:
            await self.initialize()
            
            # Go to Dispatch Board
            await self.page.goto(self.rules.get('web_url'), wait_until='domcontentloaded')
            
            # Login if redirected
            if "Login" in self.page.url:
                await self.login_fieldedge()

            await self.select_status(self.rules.get('status_name', "Assigned"))
            if self.rules.get('is_apply_task', False):
                await self.select_checkbox_by_xpath(self.rules.get('task_option_name', "EXCAVATION DRAIN FIELD REPAIR"))

            # Date Logic
            start_date = self.rules.get('start_date') or datetime.now().strftime('%m/%d/%Y')
            end_date = self.rules.get('end_date') or datetime.now().strftime('%m/%d/%Y')

            await self.set_date_filter(start_date, end_date)
            await self.apply_filters()
            scraped = await self.scrape_data()
            result = {
                "filterStartDate": start_date,
                "filterEndDate": end_date,
                "workOrders": scraped['rows'],
            }

            return result

        except Exception as e:
            # Short error message in terminal
            print(f"Scraping Error: try again later.")
            return None
        finally:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
    


# --- Execution ---
async def main():
    scraper = FieldEdgeScraper()
    data = await scraper.run()
    if data:
        if scraper.inseat_locates(data):
            print("Data inserted successfully.")
        else:
            print("Failed to insert data.")
    else:
        print("No data scraped or error occurred.")
    del scraper
    scraper = WorkOrdersScraper()
    data_today = await scraper.run()
    if data_today:
        scraper.inseat_workorder_today(data_today)
             
    
    
def start_scraping():
    print("Scraping started...")

    if sys.platform.startswith("win"):

        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("OS: Windows detected. Policy set to Proactor.")
    else:
        print(f"OS: {sys.platform} detected. Using default event loop.")
        
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Critical Loop Error: {e}")
        
    print("Scraping finished.")

if __name__ == "__main__":
    start_scraping()