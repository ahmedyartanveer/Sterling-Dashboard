"""
Online RME Scraper
Scrapes report links from the Online RME system.
"""
try:
    from automation.scrapers.base_scraper import BaseScraper
except:
    from base_scraper import BaseScraper
from automation.utils.address_helpers import extract_address_details
from tasks.helper.edit_task import OnlineRMEEditTaskHelper

class OnlineRMEScraper(BaseScraper, OnlineRMEEditTaskHelper):
    """
    Scraper for Online RME system to fetch report links.
    Searches properties by address and extracts locked/unlocked report URLs.
    """
    
    def __init__(self):
        """Initialize Online RME scraper."""
        super().__init__()
    
    async def ensure_authenticated(self):
        """
        Verify authentication status and login if necessary.
        Checks for specific element indicating successful login.
        """
        try:
            search_url = self.rules.get('contractor_search_property')
            await self.page.goto(search_url, wait_until='domcontentloaded')
            
            # Check for login indicator element
            login_indicator = self.page.locator('//span[@id="lblMultiMatch"]')
            
            is_logged_in = False
            try:
                if await login_indicator.is_visible(timeout=5000):
                    content = await login_indicator.inner_text()
                    if "You are currently logged in for Sterling Septic & Plumbing" in content:
                        is_logged_in = True
            except:
                pass
            
            if not is_logged_in:
                print("Not logged in. Redirecting to login page...")
                
                login_url = self.rules.get('online_RME_url')
                await self.page.goto(login_url, wait_until='domcontentloaded')
                await self.login_online_rme()
                
                # Return to search page after login
                if self.page.url != search_url:
                    await self.page.goto(search_url, wait_until='networkidle')
            else:
                print("Already authenticated to Online RME.")
        
        except Exception as e:
            print(f"Error during authentication check: {e}")
            raise
    
    async def search_property(self, street_number, street_name):
        """
        Search for property using street number and name.
        
        Args:
            street_number: Property street number
            street_name: Property street name
        """
        try:
            await self.perform_actions_by_xpaths(
                name="street_number",
                value=street_number
            )
            await self.perform_actions_by_xpaths(
                name="street_name",
                value=street_name
            )
            await self.perform_actions_by_xpaths(name="submit_search_rme")
            
            print(f"✅ Searched for: {street_number} {street_name}")
            
        except Exception as e:
            print(f"❌ Error searching property: {e}")
            raise
    
    async def fetch_last_report_link(self):
        """
        Navigate to service history and extract last report iframe link.
        
        Returns:
            str: Full URL to last report or None if not found
        """
        try:
            # Navigate to service history page
            history_url = self.rules.get('rme_service_history')
            await self.page.goto(history_url, wait_until='networkidle')
            
            # Wait for report table to load
            wait_table_xpath = self.rules.get("wait_rme_report_table")
            await self.page.wait_for_selector(
                wait_table_xpath,
                state='visible',
                timeout=30000
            )
            
            # Click on last report link
            await self.perform_actions_by_xpaths(name="last_report_link_click")
            
            # Extract iframe source URL
            iframe_xpath = self.rules.get("wait_iframe", "//iframe")
            await self.page.wait_for_selector(
                iframe_xpath,
                state='visible',
                timeout=30000
            )
            
            iframe = self.page.locator(iframe_xpath).first
            src = await iframe.get_attribute("src")
            
            if src:
                # Ensure full URL
                if 'http' not in src:
                    last_report_link = "https://www.onlinerme.com/" + src.lstrip('/')
                else:
                    last_report_link = src
                
                print(f"✅ Last report link: {last_report_link}")
                return last_report_link
            else:
                print("⚠️  Iframe src attribute not found.")
                return None
        
        except Exception as e:
            print(f"❌ Error fetching last report link: {e}")
            return None
    
    async def address_match_in_work_history(self, full_address: str) -> bool:
        """
        Checks if the address exists in the work history table.
        
        Returns:
            bool: True if address found, False otherwise.
        """
        try:
            print("✅ Full address match calling ....")
            rme_work_history_url = self.rules.get('rme_work_history_url')
            await self.page.goto(url=rme_work_history_url, wait_until='domcontentloaded')
            
            table_xpath = self.rules.get("wait_work_history_table")
            try:
                await self.page.wait_for_selector(
                    table_xpath, 
                    state='visible', 
                    timeout=10000
                )
            except:
                print("⚠️ Work history table did not appear.")
                return False
            
            work_history_table_xpath = self.rules.get("work_history_table_xpath")
            rows = await self.page.locator(work_history_table_xpath).all()
            
            if not rows:
                print("⚠️ Table found but it has no rows.")
                return False

            print(f"Checking {len(rows)} rows for address match...")
            
            full_address_lower = full_address.lower()

            for row in rows:
                columns = row.locator("td")
                column_count = await columns.count()
                
                if column_count >= 8:
                    address_cell = columns.nth(7)
                    address_text = await address_cell.inner_text()
                    
                    if address_text:
                        clean_addr_text = address_text.strip()
                        
                        if "Site Address" in clean_addr_text:
                            clean_addr_text = clean_addr_text.replace("Site Address ", '').strip()
                        
                        # ✅ case-insensitive comparison
                        if clean_addr_text.lower() in full_address_lower:
                            print(f"✅ Match found: {clean_addr_text}")
                            return True
            
            print("❌ No address match found.")
            return False

        except Exception as e:
            print(f"❌ Error in address_match_in_work_history: {e}")
            return False
    
    async def run(self, work_orders):
        """
        Process multiple work orders to fetch report links.
        
        Args:
            work_orders: List of work order dictionaries with addresses
            
        Returns:
            list: Updated work orders with report links
        """
        if not self.page:
            await self.initialize()
        
        total_count = len(work_orders)
        
        for index, work_order in enumerate(work_orders, start=1):
            print(f"\n📄 Processing work order {index}/{total_count}...")
            print(work_order)
            
            try:
                # Ensure authentication before each operation
                await self.ensure_authenticated()
                
                # Wait for search form to be ready
                wait_xpath = self.rules.get("wait_rme_body")
                try:
                    await self.page.wait_for_selector(
                        wait_xpath,
                        state='visible',
                        timeout=30000
                    )
                except Exception:
                    print(f"⚠️  Timeout waiting for search form (item {index})")
                    continue
                
                # Parse address
                full_address = work_order.get("full_address")
                if not full_address:
                    print(f"⏭️  Skipping item {index}: No address provided.")
                    continue
                
                street_number, street_name = extract_address_details(full_address)
                if not street_number or not street_name:
                    continue
                
                # Search for property
                await self.search_property(street_number, street_name)
                
                # Fetch last report link if not already present
                if not work_order.get('last_report_link'):
                    last_report_link = await self.fetch_last_report_link()
                    if last_report_link:
                        work_orders[index - 1]['last_report_link'] = last_report_link
                
                # Fetch unlocked report link if not already present
                if not work_order.get("tech_report_submitted"):
                    full_address = work_order.get("full_address")
                    if full_address:
                        tech_report_submitted = await self.address_match_in_work_history(full_address)
                        if tech_report_submitted is not None:
                            work_orders[index - 1]['tech_report_submitted'] = tech_report_submitted
                        else:
                            work_orders[index - 1]['tech_report_submitted'] = False
                    else:
                        work_orders[index - 1]['tech_report_submitted'] = False
                        print(f"⏭️  Skipping item {index}: No address provided.")
                print(f"   Last: {work_order.get('last_report_link')}")
                print(f"   tech_report_submitted: {work_order.get('tech_report_submitted')}")
            
            except Exception as e:
                print(f"❌ Unexpected error processing item {index} ({full_address}): {e}")
        
        # Cleanup
        await self.cleanup()
        
        return work_orders
    
    async def workorder_address_check_and_get_form(self, work_orders):
        """
        Process multiple work orders to fetch report links.
        
        Args:
            work_orders: List of work order dictionaries with addresses
            
        Returns:
            list: Updated work orders with report links
        """
        if not self.page:
            await self.initialize()
        
        total_count = len(work_orders)
        
        for index, work_order in enumerate(work_orders, start=1):
            print(f"\n📄 Processing work order {index}/{total_count}...")
            print(work_order)
            
            try:
                # Ensure authentication before each operation
                await self.ensure_authenticated()
                
                # Wait for search form to be ready
                wait_xpath = self.rules.get("wait_rme_body")
                try:
                    await self.page.wait_for_selector(
                        wait_xpath,
                        state='visible',
                        timeout=30000
                    )
                except Exception:
                    print(f"⚠️  Timeout waiting for search form (item {index})")
                    continue
                
                # Parse address
                work_order_edit_id = work_order.get('id')
                full_address = work_order.get("full_address")
                if not full_address:
                    print(f"⏭️  Skipping item {index}: No address provided.")
                    continue
                
                street_number, street_name = extract_address_details(full_address)
                if not street_number or not street_name:
                    continue
                
                rme_work_history_url = self.rules.get('rme_work_history_url')
                table_selector = self.rules.get("wait_work_history_table")
                rows_selector = self.rules.get("work_history_table_xpath")

                if not all([rme_work_history_url, table_selector, rows_selector]):
                    print("Configuration Error: Missing URLs or XPaths in rules.")
                    return False
                
                try:
                    # Navigate to page
                    await self.page.goto(url=rme_work_history_url, wait_until='domcontentloaded')
                    
                    # Wait for table visibility
                    try:
                        print("Waiting for work history table to be visible...")
                        await self.page.wait_for_selector(table_selector, state='visible', timeout=10000)
                    except Exception:
                        print("Work history table did not appear (Timeout).")
                        return False

                    # Get all rows
                    rows = await self.page.locator(rows_selector).all()
                    if not rows:
                        print("Table found but it has no rows.")
                        return False
                    print(f"Table loaded. Checking {len(rows)} rows for address match...")
                    # Normalize search string
                    full_address_lower = full_address.strip().lower()
                    address_status = True
                    for index, row in enumerate(rows):
                        columns = row.locator("td")
                        column_count = await columns.count()
                        
                        # Ensure enough columns exist (need at least 12)
                        if column_count > 11:
                            address_cell = columns.nth(7) # 8th column
                            address_text = await address_cell.inner_text()
                            
                            if not address_text:
                                continue

                            # Clean up text
                            clean_addr_text = address_text.strip()
                            if "Site Address" in clean_addr_text:
                                clean_addr_text = clean_addr_text.replace("Site Address ", '').strip()
                            
                            # Compare
                            if clean_addr_text.lower() in full_address_lower:
                                print(f"Match found at row {index + 1}: {clean_addr_text}")
                                address_status = False
                                
                                try:
                                    get_item = columns.nth(10) 
                                    click_item = get_item.locator('input')
                                    print("Attempting to click Edit...")
                                    await click_item.click(timeout=5000)
                                    await self.page.wait_for_load_state("networkidle", timeout=20000) 
                                    get_form_data = await self.scrape_edit_form_data()
                                    if len(get_form_data) != 0:
                                        self.api_client.work_order_today_edit(get_form_data, int(work_order_edit_id))
                                except Exception as click_err:
                                    print(f"Error performing action: {click_err}")
                    if address_status:
                        work_order['is_deleted'] = True
                        self.api_client.manage_work_orders(
                            record_id=int(work_order_edit_id),
                            data=work_order,
                            method_type="PATCH"
                            
                        )
                except Exception as e:
                    print("workorder_address_check")
            except Exception as e:
                print(f"❌ Unexpected error processing item {index} ({full_address}): {e}")
        
        # Cleanup
        await self.cleanup()
        
        return work_orders