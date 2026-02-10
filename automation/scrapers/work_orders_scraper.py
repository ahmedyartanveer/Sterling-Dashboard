"""
Work Orders Scraper
Scrapes work orders with complete status and extracts full addresses.
"""
import copy
from typing import List, Dict, Optional

from automation.scrapers.base_scraper import BaseScraper


class WorkOrdersScraper(BaseScraper):
    """
    Scraper for complete work orders including address extraction.
    Opens individual work orders to fetch full address details.
    """
    
    def __init__(self):
        """Initialize work orders scraper."""
        super().__init__()
    
    async def scrape_work_orders_table(self):
        """
        Scrape work orders from the main table.
        
        Returns:
            dict: Dictionary with rows list and count
        """
        try:
            await self.page.wait_for_selector(
                'tbody.fixed-body tr',
                state='attached',
                timeout=60000
            )
        except Exception as e:
            print(f"Error waiting for table rows: {e}")
            return {'rows': []}
        
        try:
            scraped_data = await self.page.evaluate(r"""() => {
                const dataList = [];
                
                try {
                    const rows = document.querySelectorAll('tbody.fixed-body tr');
                    
                    for (let i = 1; i < rows.length; i++) {
                        try {
                            const row = rows[i];
                            const cells = row.querySelectorAll('td');
                            
                            if (cells.length > 0) {
                                const getText = (index) => {
                                    return cells[index] ? cells[index].innerText.replace(/\s+/g, ' ').trim() : "";
                                };
                                
                                const workOrder = {
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
                                
                                dataList.push(workOrder);
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
            
            row_count = len(scraped_data.get('rows', []))
            print(f"Scraped {row_count} work order(s) from table.")
            return scraped_data
            
        except Exception as e:
            print(f"Error during table scraping: {e}")
            return {'rows': []}
    
    async def scrape_address_from_page(self, page):
        """
        Extract full address from work order detail page.
        
        Args:
            page: Playwright page object for the work order detail
            
        Returns:
            str: Full address or None if extraction fails
        """
        try:
            await page.wait_for_selector(
                '[data-automation-id="address1"]',
                state='attached',
                timeout=60000
            )
        except Exception as e:
            print(f"Error waiting for address elements: {e}")
            return None
        
        try:
            full_address = await page.evaluate(r"""() => {
                try {
                    const address1 = document.querySelector('[data-automation-id="address1"]').innerText.trim();
                    const address2 = document.querySelector('[data-automation-id="address2"]').innerText.trim();
                    return `${address1}, ${address2}`;
                } catch (err) {
                    console.error("Error extracting address:", err);
                    return null;
                }
            }""")
            
            return full_address
            
        except Exception as e:
            print(f"Error extracting address: {e}")
            return None
    
    async def fetch_addresses_for_work_orders(self, work_orders):
        """
        Open each work order to extract full address.
        Only processes work orders with "Complete" status.
        
        Args:
            work_orders: List of work order dictionaries
            
        Returns:
            list: Work orders with full_address field added
        """
        result = []
        base_xpath_config = self.rules.get('open_work_order_xpath', [])
        
        while work_orders:
            work_order = work_orders.pop(0)
            
            try:
                wo_number = work_order.get('wo_number', '').strip()
                status = work_order.get('status', '').strip()
                retry_count = work_order.get('try_later', 0)
                
                # Only process Complete work orders with retry limit
                if not wo_number or status != "Complete" or retry_count >= 2:
                    if wo_number and status != "Complete":
                        print(f"⏭Skipping work order {wo_number}: Status is '{status}'")
                    elif retry_count >= 2:
                        print(f"Skipping work order {wo_number}: Retry limit reached")
                    continue
                
                if not base_xpath_config:
                    print("No XPath configured for opening work orders.")
                    continue
                
                # Prepare XPath with work order number
                xpath_config = copy.deepcopy(base_xpath_config)
                wo_xpath = xpath_config[0]["xpath"]
                xpath_config[0]["xpath"] = wo_xpath.replace(
                    '{work_order_number}',
                    wo_number
                )
                
                # Open work order in new tab
                try:
                    async with self.page.context.expect_page() as new_page_info:
                        await self.perform_actions_by_xpaths(action_list=xpath_config)
                    
                    new_page = await new_page_info.value
                    await new_page.wait_for_load_state()
                    
                    # Extract address
                    address = await self.scrape_address_from_page(page=new_page)
                    
                    if address:
                        work_order['full_address'] = address
                        print(f"{wo_number}: {address}")
                        result.append(work_order)
                    else:
                        raise Exception("Address not found")
                
                except Exception as e:
                    print(f"Failed to scrape {wo_number}: {e}")
                    work_order['try_later'] = retry_count + 1
                    work_orders.append(work_order)
                
                finally:
                    try:
                        await new_page.close()
                    except:
                        pass
            
            except Exception as e:
                print(f"Error processing work order {wo_number}: {e}")
                work_order['try_later'] = work_order.get("try_later", 0) + 1
                work_orders.append(work_order)
        
        return result
    
    async def run(self):
        """
        Execute the complete work orders scraping workflow.
        
        Returns:
            list: Work orders with full addresses, or None on error
        """
        try:
            await self.initialize()
            
            # Navigate to dispatch board
            dashboard_url = self.rules.get('dashboard_url')
            await self.page.goto(dashboard_url, wait_until='domcontentloaded')
            
            # Login if necessary
            if "Login" in self.page.url:
                await self.login_fieldedge()
            
            # Navigate to work orders list if needed
            work_order_url = self.rules.get('work_order_url', '')
            if work_order_url and work_order_url != self.page.url:
                await self.page.goto(work_order_url, wait_until='networkidle')
            
            # Wait for table to load
            try:
                wait_xpath = self.rules.get("wait_xpath")
                await self.page.wait_for_selector(
                    wait_xpath,
                    state='visible',
                    timeout=600000
                )
            except Exception as e:
                print(f"Error waiting for table: {e}")
                return None
            
            # Apply filters
            await self.perform_actions_by_xpaths(name="status_xpath")
            await self.perform_actions_by_xpaths(name='scheduled_date_filter_xpath')
            await self.perform_actions_by_xpaths(name='submit_filter')
            
            # Scrape table data
            scraped = await self.scrape_work_orders_table()
            work_orders = scraped.get('rows', [])
            
            # Fetch addresses for each work order
            work_orders_with_addresses = await self.fetch_addresses_for_work_orders(work_orders)
            
            return work_orders_with_addresses
            
        except Exception as e:
            print(f"Scraping error: {e}")
            return None
            
        finally:
            await self.cleanup()