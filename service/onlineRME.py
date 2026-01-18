import sys
import asyncio
from service.baseScraper import BaseScraper
from time import sleep
import copy


class OnlineRMEScraper(BaseScraper):
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

    async def get_address(self, all_work_orders: list):
        """Gets full addresses for all work orders"""
        rows = []
        base_wo_xpath_config = self.rules.get('open_work_order_xpath', [])
        # all_work_orders = all_work_orders[:2]
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
                                print(work_order)
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
    
    async def run(self, datas:list):
        """Orchestrator method to run the whole process"""
        try:
            for i in range(len(datas)):
                if not self.page:
                    await self.initialize()

                data:dict = datas[i]
                # Go to Dispatch Board
                await self.page.goto(self.rules.get('contractor_search_property'), wait_until='domcontentloaded')
                
                # --- CRITICAL FIX BELOW ---
                # You must await self.page.content() to get the HTML string
                content = await self.page.locator('//span[@id="lblMultiMatch"]').inner_text()
                
                # Login if redirected
                if "You are currently logged in for Sterling Septic & Plumbing" not in content:
                    await self.page.goto(self.rules.get('online_RME_url'), wait_until='domcontentloaded')
                    await self.login_onlineRME()
            
                if self.rules.get('contractor_search_property', '') != self.page.url:
                    url = self.rules.get('contractor_search_property')
                    await self.page.goto(url, wait_until='networkidle')
                
                try:
                    wait_xpath = self.rules.get("wait_rme_body") 
                    await self.page.wait_for_selector(wait_xpath, state='visible', timeout=60000)
                except Exception as e:
                    print(f"Error waiting for status selector: {e}")
                    continue
            
                full_address = data.get("full_address")
                if full_address:
                    streetnum, streetname, *_ = full_address.split(' ')
                    
                    await self.select_by_xpaths(name="street_number", value=streetnum)
                    await self.select_by_xpaths(name="street_name", value=streetname)
                    await self.select_by_xpaths(name="submit_search_rme")
                    try:
                        url = self.rules.get('rme_service_history')
                        await self.page.goto(url, wait_until='networkidle')
                        wait_xpath = self.rules.get("wait_rme_report_table") 
                        await self.page.wait_for_selector(wait_xpath, state='visible', timeout=60000)
                    except Exception as e:
                        print(f"Error waiting for status selector: {e}")
                        continue
                    await self.select_by_xpaths(name="last_report_link_click")
                    try:
                        wait_xpath = self.rules.get("wait_iframe") 
                        await self.page.wait_for_selector(wait_xpath, state='visible', timeout=60000)
                    except Exception as e:
                        print(f"Error waiting for status selector: {e}")
                        continue
                    
                    iframe_locator = self.page.locator(self.rules.get("wait_iframe", "//iframe"))
                    # 2. Use 'get_attribute' instead of 'get'
                    src = await iframe_locator.get_attribute("src")
                    if 'http' not in src:
                        last_report_link = "https://www.onlinerme.com/" + src
                    else:
                        last_report_link = src
                    datas[i]['last_report_link'] = last_report_link
                    try:
                        wait_xpath = self.rules.get("wait_unlocked_report_btn") 
                        await self.page.wait_for_selector(wait_xpath, state='visible', timeout=60000)
                    except Exception as e:
                        print(f"Error waiting for status selector: {e}")
                        continue
                    await self.select_by_xpaths(name="unlocked_report_link_xpath")
                    await self.select_by_xpaths(name='unlocked_report_edit_btn')
                    
                    
                else:
                    print("Not Found work order Today address.")
            return datas

        except Exception as e:
            # Short error message in terminal
            print(e)
            print(f"Scraping Error: try again later.")
            return None
        finally:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
    