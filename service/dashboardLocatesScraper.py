import sys
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional

# Service imports
from service.baseScraper import BaseScraper
from service.workOrdersScraper import WorkOrdersScraper
from service.onlineRME import OnlineRMEScraper

class FieldEdgeScraper(BaseScraper):
    def __init__(self):
        super().__init__()

    def format_date(self, date_str: str) -> str:
        """Formats date from YYYY-MM-DD to MM/DD/YYYY to match JS logic"""
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d")
            return d.strftime("%m/%d/%Y")
        except ValueError:
            return date_str

    async def select_status(self, status_name: str):
        """Selects the status button safely"""
        try:
            selector = f'button[title="{status_name}"]'
            btn = self.page.locator(selector)
            if await btn.count() > 0:
                await btn.click()
                print(f"Selected status: {status_name}")
            else:
                print(f"Status button '{status_name}' not found.")
        except Exception as e:
            print(f"Error selecting status '{status_name}': {e}")

    async def select_checkbox_by_xpath(self, task_name: str):
        """Selects the label using XPath safely"""
        try:
            task_btn_xpath = self.rules.get('task_dropdown_xpath', "//span[text()='Task']")
            xpath_selector = f"//label[normalize-space(text())='{task_name}']"
            
            task_btn = self.page.locator(task_btn_xpath)
            if await task_btn.count() > 0:
                await task_btn.click()
                await self.page.wait_for_timeout(1000)  # Wait for dropdown to open
                
                label = self.page.locator(xpath_selector)
                if await label.count() > 0:
                    await label.click()
                    print(f"Clicked on task: {task_name}")
                else:
                    print(f"Label with text '{task_name}' not found!")
            else:
                print("Task button not found!")
        except Exception as e:
            print(f"Error in select_checkbox_by_xpath: {e}")

    async def set_date_filter(self, start_date: str, end_date: str):
        """Sets the date filters in the UI"""
        try:
            date_filter_dropdown = self.page.locator('div.filter-dropdown:has(.time-filter) div.filter-text').first
            
            if await date_filter_dropdown.count() > 0:
                await date_filter_dropdown.click()

            # Clear field and input new data
            start_input = self.page.locator('#start-date-filter')
            end_input = self.page.locator('#end-date-filter')

            await start_input.fill('')
            await start_input.type(start_date)
            
            await end_input.fill('')
            await end_input.type(end_date)
            print(f"Date filter set: {start_date} to {end_date}")
        except Exception as e:
            print(f"Error setting date filter: {e}")

    async def apply_filters(self):
        """Clicks the apply button"""
        try:
            apply_btn = self.page.locator('.plot-map-button:has-text("Apply")')
            if await apply_btn.count() > 0:
                await apply_btn.click()
                print("Apply button clicked.")
                await self.page.wait_for_timeout(2000)
            else:
                print("Apply button not found.")
        except Exception as e:
            print(f"Error applying filters: {e}")

    async def scrape_data(self) -> Dict[str, Any]:
        """Main scraping logic using page.evaluate for performance"""
        try:
            print("Waiting for data rows (.kgRow)...")
            # Increased timeout to 60s to ensure table loads
            await self.page.wait_for_selector('.kgRow', state='attached', timeout=60000)
        except Exception as e:
            print(f"Timeout waiting for rows: {e}")
            return {'rows': []}

        try:
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
                        
                        // Logic Check: Only EXCAVATOR
                        if (pName !== "EXCAVATOR") {
                            return; 
                        }

                        rows.push({
                            priorityColor: pColor,
                            priorityName: pName,
                            workOrderNumber: getTextByClass(row, '.col2'),
                            customerPO: getTextByClass(row, '.col3'),
                            customerName: getTextByClass(row, '.col4'),
                            customerAddress: getTextByClass(row, '.col5'),
                            tags: getTextByClass(row, '.col6'),
                            techName: getTextByClass(row, '.col7'),
                            purchaseStatus: getTextByClass(row, '.col8'),
                            promisedAppointment: getTextByClass(row, '.col9'),
                            createdDate: getTextByClass(row, '.col10'),
                            scheduledDate: getTextByClass(row, '.col11'),
                            task: getTextByClass(row, '.col12')
                        });

                    } catch (err) {
                        console.error(`Error parsing row ${index}:`, err);
                    }
                });

                return { rows: rows, count: rows.length };
            }""")
            print(f"Scraped {len(scraped_data.get('rows', []))} rows.")
            return scraped_data
        except Exception as e:
            print(f"Error inside page.evaluate: {e}")
            return {'rows': []}

    async def get_status(self, wo: str) -> Optional[str]:
        """Fetches status for a specific Work Order"""
        try:
            target_wo_xpath = f"//span[text()='{wo}']"
            
            # Click action via BaseScraper method
            await self.select_by_xpaths(action_list=[{
                "action": "click",
                "xpath": target_wo_xpath
            }])

            status_xpath = self.rules.get('locator_status_xpath')
            status_locator = self.page.locator(status_xpath)
            
            # Wait for element to be visible
            await status_locator.wait_for(state="visible", timeout=5000)

            raw_text = await status_locator.text_content()
            
            if raw_text:
                return raw_text.replace("\xa0", "").strip()
                
            return None

        except Exception as e:
            print(f"Failed to get status for WO '{wo}': {e}")
            return None

    async def run(self):
        """Orchestrator method to run the whole process"""
        try:
            await self.initialize()
            
            # Navigate
            url = self.rules.get('web_url')
            if url:
                await self.page.goto(url, wait_until='domcontentloaded')
            else:
                print("No URL found in rules.")
                return None
            
            # Login Check
            if "Login" in self.page.url:
                await self.login_fieldedge()
            
            # Wait for main UI
            try:
                wait_xpath = self.rules.get("task_dropdown_xpath", "//span[text()='Task']")
                await self.page.wait_for_selector(wait_xpath, state='visible', timeout=60000)
            except Exception as e:
                print(f"Task dropdown not visible immediately: {e}")
               
            # Apply UI Filters
            await self.select_status(self.rules.get('status_name', "Assigned"))
            
            if self.rules.get('is_apply_task', False):
                await self.select_checkbox_by_xpath(self.rules.get('task_option_name', "EXCAVATION DRAIN FIELD REPAIR"))

            # Handle Dates
            start_date = self.rules.get('start_date') or datetime.now().strftime('%m/%d/%Y')
            end_date = self.rules.get('end_date') or datetime.now().strftime('%m/%d/%Y')
            await self.set_date_filter(start_date, end_date)
            
            await self.apply_filters()

            # Scrape Initial Data
            scraped = await self.scrape_data()
            rows = scraped.get('rows', [])

            # Iterate to get detailed status
            for row in rows:
                wo = row.get("workOrderNumber")
                if wo:
                    status = await self.get_status(wo) 
                    if status:
                        row['status'] = status 

            result = {
                "filterStartDate": start_date,
                "filterEndDate": end_date,
                "workOrders": rows,
            }
            return result

        except Exception as e:
            print(f"Critical error in FieldEdgeScraper run: {e}")
            return None
        finally:
            # Browser cleanup
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()


# --- Main Execution Flow ---
async def main():
    print("=== Starting FieldEdge Scraper ===")
    
    # 1. FieldEdge Scraping
    scraper = FieldEdgeScraper()
    try:
        data = await scraper.run()
        if data and data.get('workOrders'):
            if scraper.inseat_locates(data):
                print("FieldEdge Data inserted successfully.")
            else:
                print("Failed to insert FieldEdge data.")
        else:
            print("No FieldEdge data scraped.")
    except Exception as e:
        print(f"Error during FieldEdge execution: {e}")
    finally:
        # Cleanup variable
        del scraper

    # 2. WorkOrders Scraping
    print("=== Starting WorkOrders Scraper ===")
    try:
        wo_scraper = WorkOrdersScraper()
        data_today = await wo_scraper.run()
        if data_today:
            wo_scraper.inseat_workorder_today(data_today)
            print("WorkOrders data inserted.")
        else:
            print("No WorkOrders data found today.")
    except Exception as e:
        print(f"Error during WorkOrder execution: {e}")
    finally:
        try:
            del wo_scraper
        except:
            pass

    # 3. Online RME Scraping
    print("=== Starting Online RME Scraper ===")
    try:
        rme_scraper = OnlineRMEScraper()
        
        # Fetching records that need updates
        work_order_null_url_datas = rme_scraper.inserter.manage_work_orders(
            method_type="GET",
            params={
                "last_report_link__isnull": "isnull",
                "unlocked_report_link__isnull": "isnull"
            }
        )
        
        count = len(work_order_null_url_datas) if work_order_null_url_datas else 0
        print(f"RME Records to process: {count}")
        
        if work_order_null_url_datas:
            rme_datas = await rme_scraper.run(work_order_null_url_datas)
            
            # Patching updated data
            for data in rme_datas:
                record_id = data.get('id')
                if record_id:
                    rme_scraper.inserter.manage_work_orders(
                        method_type="PATCH",
                        data=data,
                        record_id=record_id
                    )
            print("RME Data patching completed.")
        else:
            print("No RME records found to update.")

    except Exception as e:
        print(f"Error during Online RME execution: {e}")
    
def start_scraping():
    print("\n--- Process Initialized ---")

    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("OS: Windows detected. Policy set to Proactor.")
    else:
        print(f"OS: {sys.platform} detected. Using default event loop.")
        
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Process interrupted by user.")
    except Exception as e:
        print(f"Critical Loop Error: {e}")
        
    print("--- Process Finished ---")

if __name__ == "__main__":
    start_scraping()