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
from datetime import datetime
import asyncio
from locates.models import WorkOrderToday
from asgiref.sync import sync_to_async
from django.utils import timezone
import re


class OnlineRMEScraper(BaseScraper, OnlineRMEEditTaskHelper):
    """
    Scraper for Online RME system to fetch report links.
    Searches properties by address and extracts locked/unlocked report URLs.
    """
    
    def __init__(self):
        """Initialize Online RME scraper."""
        super().__init__()
    
    def normalize_address_for_matching(self, address: str) -> str:
        """
        Normalize address for flexible matching.
        """
        if not address:
            return ""
        
        # Convert to lowercase and strip
        normalized = address.lower().strip()
        
        # Remove "Site Address" prefix
        normalized = re.sub(r'^site\s+address\s*', '', normalized, flags=re.IGNORECASE)
        
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Remove common location suffixes (city, state, zip)
        normalized = re.sub(r',\s*graham\s*wa\s*\d*$', '', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r',?\s*wa\s*\d*$', '', normalized, flags=re.IGNORECASE)
        normalized = re.sub(r',\s*\w+\s*$', '', normalized)  # Remove any city at end
        
        return normalized.strip()
    
    def addresses_match(self, addr1: str, addr2: str) -> bool:
        """
        Check if two addresses match with flexible comparison.
        """
        norm1 = self.normalize_address_for_matching(addr1)
        norm2 = self.normalize_address_for_matching(addr2)
        
        # Direct substring match
        if norm1 in norm2 or norm2 in norm1:
            return True
        
        # Extract and compare street numbers
        try:
            num1_match = re.search(r'^\d+', norm1)
            num2_match = re.search(r'^\d+', norm2)
            
            if num1_match and num2_match:
                num1 = num1_match.group()
                num2 = num2_match.group()
                
                # Numbers must match
                if num1 == num2:
                    # Get the street name parts (everything after the number)
                    street1 = re.sub(r'^\d+\s*', '', norm1)
                    street2 = re.sub(r'^\d+\s*', '', norm2)
                    
                    # Remove directionals and unit numbers for comparison
                    street1 = re.sub(r'\s*[nsew]\s*$', '', street1)
                    street2 = re.sub(r'\s*[nsew]\s*$', '', street2)
                    street1 = re.sub(r'\s*#.*$', '', street1)
                    street2 = re.sub(r'\s*#.*$', '', street2)
                    
                    # Check if street names match
                    if street1 in street2 or street2 in street1:
                        return True
        except:
            pass
        
        return False
    
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
                        
                        # Use improved address matching
                        if self.addresses_match(clean_addr_text, full_address):
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
                    print(f"⏭️  Skipping item {index}: Could not parse address.")
                    continue
                
                # Search for property
                await self.search_property(street_number, street_name)
                
                # Always fetch last report link regardless of tech_report_submitted status
                last_report_link = await self.fetch_last_report_link()
                if last_report_link:
                    work_orders[index - 1]['last_report_link'] = last_report_link
                    print(f"✅ Last report link updated: {last_report_link}")
                
                # Check if address exists in work history (tech report submitted)
                tech_report_submitted = await self.address_match_in_work_history(full_address)
                work_orders[index - 1]['tech_report_submitted'] = tech_report_submitted
                
                print(f"✅ Processing completed for: {full_address}")
                print(f"   Last report link: {last_report_link}")
                print(f"   Tech report submitted: {tech_report_submitted}")
            
            except Exception as e:
                print(f"❌ Unexpected error processing item {index} ({full_address}): {e}")
                # Set default values on error
                if 'last_report_link' not in work_orders[index - 1]:
                    work_orders[index - 1]['last_report_link'] = None
                if 'tech_report_submitted' not in work_orders[index - 1]:
                    work_orders[index - 1]['tech_report_submitted'] = False
        
        # Cleanup
        await self.cleanup()
        
        return work_orders
    
    # ---------------- OPEN SEPTIC COMPONENTS ----------------
    async def open_septic_components(self):
        await self.page.locator('#leftmenu a:has-text("Septic Components")').click()
        await self.page.wait_for_selector("#ctl02_DataGridComponents")
        print("[INFO] Septic Components page opened.")
    
    # ----- Select Locked Reports -----
    async def select_locked_reports(self) -> bool:
        try:
            print("Selecting Locked Reports")
            await self.page.select_option("#ctl02_drpViewing", value="True")
            await self.page.wait_for_load_state("networkidle")
            await self.page.wait_for_selector("#ctl02_DataGridOMhistory")
            print("Locked Reports loaded")
            return True
        except Exception as e:
            print(f"select_locked_reports error: {e}")
            return False
    
    async def check_locked_reports(self, full_address: str):
        """Check locked reports table for address match."""
        print(f"Searching Locked Reports for address: {full_address}")
        try:
            rows = await self.page.locator("#ctl02_DataGridOMhistory tr").all()
            print(f"Found {len(rows)} rows in Locked Reports")

            for row in rows[1:]:  # Skip header
                try:
                    cells = await row.locator("td").all()
                    if len(cells) >= 8:
                        address = (await cells[6].text_content() or "").strip()
                        
                        # Use improved address matching
                        if self.addresses_match(address, full_address):
                            current_time = timezone.now()
                            print(f"✅ Address FOUND in LOCKED Reports → {address}")
                            return {
                                "status": "LOCKED",
                                "finalized_by": "Automation",
                                "finalized_by_email": "automation@sterling-septic.com",
                                "finalized_date": current_time
                            }
                except Exception as row_err:
                    print(f"Error processing row: {row_err}")
                    continue
        except Exception as e:
            print(f"Error searching Locked Reports: {e}")
        
        print("❌ Address NOT found in Locked Reports")
        return None
    
    # ----- Open Discarded Reports -----
    async def open_discarded_reports(self):
        try:
            print("Opening Discarded Reports")
            await self.page.click('div.SMChild >> text=Discarded Reports')
            await self.page.wait_for_selector("#ctl02_DataGridDeletedHistory")
            await asyncio.sleep(5)  # wait for table to fully render
            print("Discarded Reports loaded")
            return True
        except Exception as e:
            print(f"open_discarded_reports error: {e}")
            return False
     
    async def check_discarded_reports(self, full_address: str):
        """Check discarded reports table for address match."""
        print(f"Searching Discarded Reports for address: {full_address}")
        try:
            rows = await self.page.locator("#ctl02_DataGridDeletedHistory tr").all()
            print(f"Found {len(rows)} rows in Discarded Reports")

            for row in rows[2:]:  # skip header rows
                try:
                    cells = await row.locator("td").all()
                    if len(cells) >= 5:
                        address = (await cells[4].text_content() or "").strip()
                        
                        # Use improved address matching
                        if self.addresses_match(address, full_address):
                            current_time = timezone.now()
                            print(f"✅ Address FOUND in DISCARDED Reports → {address}")
                            return {
                                "status": "DELETED",
                                "finalized_by": "Automation",
                                "finalized_by_email": "automation@sterling-septic.com",
                                "finalized_date": current_time
                            }
                except Exception as row_err:
                    print(f"Error processing row: {row_err}")
                    continue
        except Exception as e:
            print(f"Error searching Discarded Reports: {e}")
        
        print("❌ Address NOT found in Discarded Reports")
        return None
        
    async def scrape_components_table(self):
        try:
            print("[INFO] Scraping components table...")

            rows = await self.page.locator("#ctl02_DataGridComponents tr").all()
            data = []

            def clean(text):
                return text.strip() if text and text.strip() != "\xa0" else None

            for row in rows[1:]:  # skip header
                cells = await row.locator("td").all()
                if len(cells) < 8:
                    continue
                record = {
                    "component": clean(await cells[1].text_content()),
                    "userDefinedLabel": clean(await cells[2].text_content()),
                    "manufacturer": clean(await cells[3].text_content()),
                    "model": clean(await cells[4].text_content()),
                    "serial": clean(await cells[5].text_content()),
                    "tankSize": clean(await cells[6].text_content()),
                    "sortOrder": clean(await cells[7].text_content())
                }
                data.append(record)

            return data if data else []
        except Exception as e:
            print(f"[Error] Septic Components page {e}.")
            return []
    
    async def workorder_address_check_and_get_form(self, work_orders):
        """
        Process multiple work orders to fetch report links and form data.
        Updated logic: Update database immediately when address found in any table.
        
        Args:
            work_orders: List of work order dictionaries with addresses
            
        Returns:
            list: Updated work orders with report links and form data
        """
        if not self.page:
            await self.initialize()
        
        total_count = len(work_orders)
        
        for index, work_order in enumerate(work_orders, start=1):
            print(f"\n📄 Processing work order {index}/{total_count}...")
            
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
                
                # Parse address and check conditions
                work_order_edit_id = work_order.get('id')
                full_address = work_order.get("full_address")
                wait_to_lock = work_order.get('wait_to_lock', False)
                
                if not full_address:
                    print(f"⏭️  Skipping item {index}: No address provided.")
                    continue
                
                # FIRST: Always fetch last report link
                print(f"Fetching last report link for: {full_address}")
                street_number, street_name = extract_address_details(full_address)
                if not street_number or not street_name:
                    print(f"⏭️  Skipping item {index}: Could not parse address.")
                    continue
                
                # Search for property
                await self.search_property(street_number, street_name)
                
                # Fetch last report link
                last_report_link = await self.fetch_last_report_link()
                if last_report_link:
                    work_orders[index - 1]['last_report_link'] = last_report_link
                    print(f"✅ Last report link updated: {last_report_link}")
                
                # SECOND: Check work history for address match
                print(f"\n🔍 Checking work history for address: {full_address}")
                rme_work_history_url = self.rules.get('rme_work_history_url')
                table_selector = self.rules.get("wait_work_history_table")
                rows_selector = self.rules.get("work_history_table_xpath")
                
                address_found_in_any_table = False
                
                try:
                    # Navigate to work history page
                    await self.page.goto(url=rme_work_history_url, wait_until='domcontentloaded')
                    
                    # Wait for table visibility
                    try:
                        print("Waiting for work history table to be visible...")
                        await self.page.wait_for_selector(table_selector, state='visible', timeout=10000)
                    except Exception:
                        print("⚠️ Work history table did not appear (Timeout).")

                    # Get all rows
                    rows = await self.page.locator(rows_selector).all()
                    if not rows:
                        print("⚠️ Table found but it has no rows.")
                    else:
                        print(f"Table loaded. Checking {len(rows)} rows for address match...")
                        
                        for row_index, row in enumerate(rows):
                            columns = row.locator("td")
                            column_count = await columns.count()
                            
                            # Ensure enough columns exist (need at least 12)
                            if column_count > 11:
                                address_cell = columns.nth(7)  # 8th column
                                address_text = await address_cell.inner_text()
                                
                                if not address_text:
                                    continue

                                # Clean up text
                                clean_addr_text = address_text.strip()
                                if "Site Address" in clean_addr_text:
                                    clean_addr_text = clean_addr_text.replace("Site Address ", '').strip()
                                
                                # Use improved address matching
                                if self.addresses_match(clean_addr_text, full_address):
                                    print(f"✅ Address match found in WORK HISTORY at row {row_index + 1}: {clean_addr_text}")
                                    address_found_in_any_table = True
                                    work_orders[index - 1]['tech_report_submitted'] = True
                                    
                                    try:
                                        # Click Edit button (11th column)
                                        edit_cell = columns.nth(10)
                                        edit_button = edit_cell.locator('input')
                                        print("Clicking Edit button...")
                                        await edit_button.click(timeout=5000)
                                        await self.page.wait_for_load_state("networkidle", timeout=20000)
                                        
                                        # Scrape form data
                                        print("Scraping form data...")
                                        get_form_data = await self.scrape_edit_form_data()
                                        
                                        # Open and scrape septic components
                                        print("Opening septic components...")
                                        await self.open_septic_components()
                                        septic_components_form_data = await self.scrape_components_table()
                                        
                                        # Update database with scraped data
                                        if len(get_form_data) == 0:
                                            get_form_data = []
                                        if len(septic_components_form_data) == 0:
                                            septic_components_form_data = []
                                        
                                        self.api_client.work_order_today_edit(
                                            get_form_data, 
                                            septic_components_form_data, 
                                            int(work_order_edit_id)
                                        )
                                        
                                        print("✅ Form data scraped and saved successfully for WORK HISTORY match.")
                                        break
                                        
                                    except Exception as click_err:
                                        print(f"❌ Error performing action: {click_err}")
                                        break
                        
                        if not address_found_in_any_table:
                            print("❌ Address not found in work history")
                            work_orders[index - 1]['tech_report_submitted'] = False
                
                except Exception as e:
                    print(f"❌ Error checking work history: {e}")
                
                # If address found in work history, SKIP locked and discarded checks
                if address_found_in_any_table:
                    print("✅ Address found in work history - SKIPPING locked/discarded checks")
                else:
                    # Check if we should skip locked/discarded reports check due to wait_to_lock
                    if wait_to_lock:
                        print(f"⚠️  Skipping locked/discarded reports check (wait_to_lock=True)")
                        
                        # Update status
                        result = {
                            "status": "WAITING_FOR_LOCK",
                            "finalized_by": "Automation",
                            "finalized_by_email": "automation@sterling-septic.com",
                            "finalized_date": timezone.now()
                        }
                        await self.save_report_check_result(
                            result=result,
                            work_order_edit_id=work_order_edit_id
                        )
                        print(f"✅ Status set to WAITING_FOR_LOCK")
                    else:
                        # THIRD: Check locked reports if address not found in work history
                        print("\n🔍 Address not in work history - Checking LOCKED reports...")
                        if await self.select_locked_reports():
                            result = await self.check_locked_reports(full_address=full_address)
                            if result:
                                # ✅ IMMEDIATELY UPDATE DATABASE when found in locked
                                await self.save_report_check_result(
                                    result=result,
                                    work_order_edit_id=work_order_edit_id
                                )
                                print("✅ Address found in LOCKED reports - Database updated - SKIPPING discarded check")
                                address_found_in_any_table = True
                            else:
                                # FOURTH: Only check discarded if NOT found in locked
                                print("\n🔍 Address not in locked - Checking DISCARDED reports...")
                                if await self.open_discarded_reports():
                                    result = await self.check_discarded_reports(full_address=full_address)
                                    if result:
                                        # ✅ IMMEDIATELY UPDATE DATABASE when found in discarded
                                        await self.save_report_check_result(
                                            result=result,
                                            work_order_edit_id=work_order_edit_id
                                        )
                                        print("✅ Address found in DISCARDED reports - Database updated")
                                        address_found_in_any_table = True
                                    else:
                                        print("❌ Address not found in any table (work history, locked, or discarded)")
                                        # Update status to indicate not found
                                        result = {
                                            "status": "NOT_FOUND",
                                            "finalized_by": "Automation",
                                            "finalized_by_email": "automation@sterling-septic.com",
                                            "finalized_date": timezone.now()
                                        }
                                        await self.save_report_check_result(
                                            result=result,
                                            work_order_edit_id=work_order_edit_id
                                        )
                                        print("✅ Status set to NOT_FOUND")
                                else:
                                    print("❌ Failed to open discarded reports.")
                        else:
                            print("❌ Failed to select locked reports.")
                
                print(f"\n✅ Processing completed for work order {index}")
                print(f"   Last report link: {work_orders[index - 1].get('last_report_link')}")
                print(f"   Tech report submitted: {work_orders[index - 1].get('tech_report_submitted')}")
                print(f"   Wait to lock: {wait_to_lock}")
                print(f"   Address found: {address_found_in_any_table}")
                
            except Exception as e:
                print(f"❌ Unexpected error processing item {index} ({full_address}): {e}")
                # Set default values on error
                if 'last_report_link' not in work_orders[index - 1]:
                    work_orders[index - 1]['last_report_link'] = None
                if 'tech_report_submitted' not in work_orders[index - 1]:
                    work_orders[index - 1]['tech_report_submitted'] = False
        
        # Cleanup
        await self.cleanup()
        
        return work_orders
    
    async def save_report_check_result(self, result, work_order_edit_id):
        """Save the report check result to database."""
        print(f"\n💾 Saving to database...")
        print(f"   Status: {result['status']}")
        print(f"   Work Order ID: {work_order_edit_id}")
        try:
            await sync_to_async(self._save_report_check_result_sync)(
                result, work_order_edit_id
            )
            print("✅ Database updated successfully.")
        except Exception as e:
            print(f"❌ Failed to update database: {e}")

            
    def _save_report_check_result_sync(self, result, work_order_edit_id):
        """Synchronous database save operation."""
        work_order_db = WorkOrderToday.objects.get(pk=work_order_edit_id)

        work_order_db.status = result['status']
        work_order_db.finalized_by = result['finalized_by']
        work_order_db.finalized_by_email = result['finalized_by_email']
        work_order_db.finalized_date = result['finalized_date']

        work_order_db.save()