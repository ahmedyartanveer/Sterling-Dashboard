import sys
import asyncio
from baseScraper import BaseScraper
from time import sleep
import copy


class WorkOrdersScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        
    async def scrape_data(self):
        """Main scraping logic using page.evaluate for performance"""
        try:
            
            await self.page.wait_for_selector('tbody.fixed-body tr', state='attached', timeout=60000)
        except Exception as e:
            print(f"Error waiting for selector: {e}")
            return {'rows': []}

        scraped_data = await self.page.evaluate(r"""() => {
            const dataList = [];
            
            try {
                const rows = document.querySelectorAll('tbody.fixed-body tr');

                for (let i = 1; i < rows.length; i++) {
                    try {
                        const row = rows[i];
                        const cells = row.querySelectorAll('td');

                        if (cells.length > 0) {
                            
                            // Helper function to safely extract text
                            const getText = (index) => {
                                return cells[index] ? cells[index].innerText.replace(/\s+/g, ' ').trim() : "";
                            };

                            const obj = {
                                customer: getText(0),
                                wo_number: getText(1),
                                purchase_order: getText(2),
                                invoice: getText(3),
                                quote: getText(4),
                                task: getText(5),
                                status: getText(6),
                                appointment_date: getText(7),
                                scheduled_date: getText(8),
                                technician: getText(9)
                            };
                            
                            dataList.push(obj);
                        }
                    } catch (rowError) {
                        console.error(`Error parsing row ${i}:`, rowError);
                    }
                }
            } catch (err) {
                console.error("Global scraping error:", err);
            }

            return { rows: dataList, count: dataList.length };
        }""")

        return scraped_data
    
    async def scrape_address(self, page):
        """Main scraping logic to extract full address"""
        try:
            await page.wait_for_selector('[data-automation-id="address1"]', state='attached', timeout=60000)
        except Exception as e:
            print(f"Error waiting for selector: {e}")
            return None

        full_address = await page.evaluate(r"""() => {
            try {
                const part1 = document.querySelector('[data-automation-id="address1"]').innerText.trim();
                const part2 = document.querySelector('[data-automation-id="address2"]').innerText.trim();
                return `${part1}, ${part2}`;
                
            } catch (err) {
                console.error("Error extracting address:", err);
                return false;
            }
        }""")
        return full_address

    async def select_by_xpaths(self, name:str='', action_list:list=[]):
        """Selects the complete checkbox by XPath"""
        xpaths = self.rules.get(name, action_list)
        for item in xpaths:
            action = item.get("action", "")
            xpath = item.get("xpath", "")
            checkbox = self.page.locator(xpath)
            if await checkbox.count() > 0:
                if action == "click":
                    await checkbox.click(timeout=5000)
                elif action == "right_click":
                    await checkbox.click(button="right", timeout=5000)
                sleep(2)
                print(f"Clicked on checkbox with XPath: {xpath}")
        print("Complete checkbox not found!")

    

    async def get_address(self, all_work_orders: list):
        """Gets full addresses for all work orders"""
        rows = []
        base_wo_xpath_config = self.rules.get('open_work_order_xpath', [])

        while all_work_orders:
            work_order = all_work_orders.pop(0)
            try:
                work_order_number = work_order.get('wo_number', '').strip()
                status = work_order.get('status', '').strip()
                try__later = work_order.get('try_later', 0)

                if work_order_number and status == "Complete" and try__later < 2:
                    if base_wo_xpath_config:
                        current_xpath_config = copy.deepcopy(base_wo_xpath_config)
                        wo_xpath = current_xpath_config[0]["xpath"]
                        current_xpath_config[0]["xpath"] = wo_xpath.replace('{work_order_number}', work_order_number)
                        async with self.page.context.expect_page() as new_page_info:
                            await self.select_by_xpaths(action_list=current_xpath_config)
                        new_page = await new_page_info.value
                        await new_page.wait_for_load_state() 
                        try:
                            address = await self.scrape_address(page=new_page) 
                            if address:
                                work_order['full_address'] = address
                                rows.append(work_order)
                            else:
                                raise Exception("Address not found")
                                
                        except Exception as e:
                            print(f"Scraping failed on new tab: {e}")
                            work_order['try_later'] = work_order.get("try_later", 0) + 1
                            all_work_orders.append(work_order)
                        finally:
                            await new_page.close()
                    else:
                        print("No XPath defined for opening work order.")
                else:
                    print(f"Skipping work order {work_order_number}: Status '{status}' or retry limit reached.")
                    
            except Exception as e:
                print(f"Error processing work order {work_order_number}: {e}")
                work_order['try_later'] = work_order.get("try_later", 0) + 1
                all_work_orders.append(work_order)
                
        return rows
    
    async def run(self):
        """Orchestrator method to run the whole process"""
        try:
            await self.initialize()
            
            # Go to Dispatch Board
            await self.page.goto(self.rules.get('dashboard_url'), wait_until='domcontentloaded')
            
            # Login if redirected
            if "Login" in self.page.url:
                await self.login_fieldedge()
                
            if self.rules.get('work_order_url', '') != self.page.url:
                url = self.rules.get('work_order_url')
                await self.page.goto(url, wait_until='networkidle')
            
            try:
                wait_xpath = self.rules.get("wait_xpath") 
                await self.page.wait_for_selector(wait_xpath, state='visible', timeout=60000)
            except Exception as e:
                print(f"Error waiting for status selector: {e}")
                return None
            
            await self.select_by_xpaths("status_xpath")
            await self.select_by_xpaths('scheduled_date_filter_xpath')
            await self.select_by_xpaths('submit_filter')
            scraped = await self.scrape_data()
            result = scraped['rows']
            rows = await self.get_address(result)
            return rows

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
    scraper = WorkOrdersScraper()
    data = await scraper.run()
    print(data)
   
    
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