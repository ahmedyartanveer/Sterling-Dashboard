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
    """Optimized Online RME scraper with efficient data collection and single database updates."""

    def __init__(self):
        """Initialize Online RME scraper."""
        super().__init__()

    def normalize_address_for_matching(self, address: str) -> str:
        """
        Normalize address for flexible matching.
        
        Args:
            address: Raw address string
            
        Returns:
            Normalized address string
        """
        if not address:
            return ""

        # Convert to lowercase and strip
        normalized = address.lower().strip()

        # Remove "Site Address" prefix
        normalized = re.sub(r"^site\s+address\s*", "", normalized, flags=re.IGNORECASE)

        # Remove extra whitespace
        normalized = re.sub(r"\s+", " ", normalized)

        # Remove common location suffixes (city, state, zip)
        normalized = re.sub(r",\s*graham\s*wa\s*\d*$", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r",?\s*wa\s*\d*$", "", normalized, flags=re.IGNORECASE)
        normalized = re.sub(r",\s*\w+\s*$", "", normalized)  # Remove any city at end

        return normalized.strip()

    def extract_street_number_and_base(self, address: str) -> tuple:
        """
        Extract street number and base street name from address.
        
        Args:
            address: Address string
            
        Returns:
            Tuple of (street_number, base_street_name)
        """
        normalized = self.normalize_address_for_matching(address)

        # Extract street number (first sequence of digits)
        num_match = re.search(r"^(\d+)", normalized)
        if not num_match:
            return (None, None)

        street_number = num_match.group(1)

        # Extract base street name (next word/number combo, typically street name)
        # Pattern: number followed by optional letters/ordinal indicators
        street_match = re.search(r"^\d+\s+(\d+\w*)", normalized)
        if street_match:
            base_street = street_match.group(1)
            return (street_number, base_street)

        # If no number pattern, get first word after street number
        street_match = re.search(r"^\d+\s+(\w+)", normalized)
        if street_match:
            base_street = street_match.group(1)
            return (street_number, base_street)

        return (street_number, None)

    def addresses_match(self, addr1: str, addr2: str) -> bool:
        """
        Compare two addresses for matching.
        
        Args:
            addr1: First address
            addr2: Second address
            
        Returns:
            True if addresses match, False otherwise
        """
        norm1 = self.normalize_address_for_matching(addr1)
        norm2 = self.normalize_address_for_matching(addr2)

        print(f"   Comparing: '{norm1}' <-> '{norm2}'")

        # Direct substring match
        if norm1 in norm2 or norm2 in norm1:
            print(f"   ✅ Direct substring match")
            return True

        # Extract street number and base street name
        num1, base1 = self.extract_street_number_and_base(addr1)
        num2, base2 = self.extract_street_number_and_base(addr2)

        print(f"   Extracted: ({num1}, {base1}) <-> ({num2}, {base2})")

        # Both must have street numbers
        if not num1 or not num2:
            print(f"   ❌ Missing street number")
            return False

        # Street numbers must match
        if num1 != num2:
            print(f"   ❌ Street numbers don't match")
            return False

        # If both have base street names, they must match
        if base1 and base2:
            # Normalize further for comparison
            base1_clean = re.sub(
                r"(st|street|ct|court|dr|drive|ave|avenue|rd|road|ln|lane).*$",
                "",
                base1,
            )
            base2_clean = re.sub(
                r"(st|street|ct|court|dr|drive|ave|avenue|rd|road|ln|lane).*$",
                "",
                base2,
            )

            if base1_clean in base2_clean or base2_clean in base1_clean:
                print(f"   ✅ Street numbers and base names match")
                return True
            else:
                print(f"   ❌ Base street names don't match: '{base1_clean}' vs '{base2_clean}'")
                return False

        # If one doesn't have base street but numbers match
        # This handles cases like "9027" matching "9027 206th St"
        if num1 == num2:
            print(f"   ✅ Street numbers match (partial address)")
            return True

        print(f"   ❌ No match found")
        return False

    async def ensure_authenticated(self):
        """Ensure user is authenticated to Online RME."""
        try:
            search_url = self.rules.get("contractor_search_property")
            await self.page.goto(search_url, wait_until="domcontentloaded")

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
                login_url = self.rules.get("online_RME_url")
                await self.page.goto(login_url, wait_until="domcontentloaded")
                await self.login_online_rme()

                # Return to search page after login
                if self.page.url != search_url:
                    await self.page.goto(search_url, wait_until="networkidle")
            else:
                print("Already authenticated to Online RME.")

        except Exception as e:
            print(f"Error during authentication check: {e}")
            raise

    async def search_property(self, street_number: str, street_name: str):
        """
        Search for a property by street number and name.
        
        Args:
            street_number: Street number
            street_name: Street name
        """
        try:
            await self.perform_actions_by_xpaths(name="street_number", value=street_number)
            await self.perform_actions_by_xpaths(name="street_name", value=street_name)
            await self.perform_actions_by_xpaths(name="submit_search_rme")
            print(f"✅ Searched for: {street_number} {street_name}")
        except Exception as e:
            print(f"❌ Error searching property: {e}")
            raise

    async def fetch_last_report_link_from_service_history(self) -> str:
        """
        Fetch the last report PDF link from Service History table (top row).
        Clicks the report icon in the first data row to get the PDF URL.
        
        Returns:
            Last report PDF URL or fallback service history URL
        """
        try:
            print("\n🔍 Fetching last report link from Service History...")
            
            # Navigate to service history page
            history_url = self.rules.get("rme_service_history")
            await self.page.goto(history_url, wait_until="networkidle")

            # Wait for table to load
            try:
                await self.page.wait_for_selector(
                    'table[id$="DataGridOMhistory"]',
                    state="visible",
                    timeout=10000
                )
            except:
                print("⚠️  Service History table did not load")
                return history_url

            # Find the first data row (skip header rows)
            # Table structure: pagination row, header row, then data rows
            rows = await self.page.locator('table[id$="DataGridOMhistory"] tr').all()
            
            if len(rows) < 3:
                print("⚠️  No data rows found in Service History table")
                return history_url

            # First data row is at index 2 (0=pagination, 1=header, 2=first data)
            first_data_row = rows[2]
            
            # Find the "Report" button/icon in the row
            # The report icon is typically in a column with an input type="image"
            report_button = first_data_row.locator('input[type="image"][src*="report"]').first
            
            try:
                # Click the report icon
                print("Clicking report icon in first row...")
                await report_button.click(timeout=5000)
                await asyncio.sleep(2)  # Wait for popup/iframe to load
                
                # Look for iframe with PDF
                iframe_selector = 'iframe[src*=".pdf"], iframe[src*="ReportViewer"], iframe[src*="report"]'
                try:
                    await self.page.wait_for_selector(iframe_selector, state="visible", timeout=10000)
                    iframe = self.page.locator(iframe_selector).first
                    src = await iframe.get_attribute("src")
                    
                    if src:
                        # Ensure full URL
                        if "http" not in src:
                            last_report_link = "https://www.onlinerme.com/" + src.lstrip("/")
                        else:
                            last_report_link = src
                        
                        print(f"✅ Last report PDF link: {last_report_link}")
                        return last_report_link
                except:
                    print("⚠️  Could not find iframe with PDF")
                    
            except Exception as e:
                print(f"⚠️  Could not click report icon: {e}")
            
            # Fallback: return service history URL
            print(f"⚠️  Using fallback service history URL")
            return history_url

        except Exception as e:
            print(f"❌ Error fetching last report link: {e}")
            return self.rules.get("rme_service_history")

    async def check_work_history_table(self, full_address: str) -> dict:
        """
        Check work history table for address match and scrape form if found.
        
        Args:
            full_address: Full address to search for
            
        Returns:
            Dictionary with status and form data, or None if not found
        """
        try:
            print("\n🔍 Checking WORK HISTORY table...")
            
            rme_work_history_url = self.rules.get("rme_work_history_url")
            await self.page.goto(url=rme_work_history_url, wait_until="domcontentloaded")

            table_xpath = self.rules.get("wait_work_history_table")
            try:
                await self.page.wait_for_selector(table_xpath, state="visible", timeout=10000)
            except:
                print("⚠️ Work history table did not appear.")
                return None

            work_history_table_xpath = self.rules.get("work_history_table_xpath")
            rows = await self.page.locator(work_history_table_xpath).all()

            if not rows:
                print("⚠️ Table found but it has no rows.")
                return None

            print(f"Checking {len(rows)} rows for address match...")

            for row_index, row in enumerate(rows):
                columns = row.locator("td")
                column_count = await columns.count()

                if column_count >= 11:
                    address_cell = columns.nth(7)  # 8th column
                    address_text = await address_cell.inner_text()

                    if address_text:
                        clean_addr_text = address_text.strip()
                        if "Site Address" in clean_addr_text:
                            clean_addr_text = clean_addr_text.replace("Site Address ", "").strip()

                        # Use improved address matching
                        if self.addresses_match(clean_addr_text, full_address):
                            print(f"✅ Match found in WORK HISTORY at row {row_index + 1}: {clean_addr_text}")

                            try:
                                # Click Edit button (11th column)
                                edit_cell = columns.nth(10)
                                edit_button = edit_cell.locator("input")
                                print("Clicking Edit button...")
                                await edit_button.click(timeout=5000)
                                await self.page.wait_for_load_state("networkidle", timeout=20000)

                                # Scrape form data
                                print("Scraping form data...")
                                form_data = await self.scrape_edit_form_data()

                                # Open and scrape septic components
                                print("Opening septic components...")
                                await self.open_septic_components()
                                components_data = await self.scrape_components_table()

                                print(f"   DEBUG: Scraped {len(form_data) if form_data else 0} form fields")
                                print(f"   DEBUG: Scraped {len(components_data) if components_data else 0} components")

                                return {
                                    "found": True,
                                    "location": "WORK_HISTORY",
                                    "tech_report_submitted": True,
                                    "form_data": form_data if form_data else [],
                                    "components_data": components_data if components_data else []
                                }

                            except Exception as click_err:
                                print(f"❌ Error scraping form: {click_err}")
                                return {
                                    "found": True,
                                    "location": "WORK_HISTORY",
                                    "tech_report_submitted": True,
                                    "form_data": [],
                                    "components_data": []
                                }

            print("❌ No address match found in work history.")
            return None

        except Exception as e:
            print(f"❌ Error in check_work_history_table: {e}")
            return None

    async def open_septic_components(self):
        """Open the Septic Components page."""
        await self.page.locator('#leftmenu a:has-text("Septic Components")').click()
        await self.page.wait_for_selector("#ctl02_DataGridComponents")
        print("[INFO] Septic Components page opened.")

    async def scrape_components_table(self) -> list:
        """
        Scrape the septic components table.
        
        Returns:
            List of component dictionaries
        """
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
                    "sortOrder": clean(await cells[7].text_content()),
                }
                data.append(record)

            print(f"[INFO] Scraped {len(data)} component records")
            return data if data else []
        except Exception as e:
            print(f"[Error] Septic Components scraping error: {e}")
            return []

    async def select_locked_reports(self) -> bool:
        """
        Select and load locked reports view using dropdown.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            print("Selecting Locked Reports from dropdown...")
            
            # Select "Locked Reports" option (value="True")
            await self.page.select_option(
                'select[id$="drpViewing"]',
                value="True"
            )
            
            # Wait for page to reload
            await self.page.wait_for_load_state("networkidle")
            
            # Wait for locked reports table to appear
            await self.page.wait_for_selector(
                'table[id$="DataGridOMhistory"]',
                state="visible",
                timeout=10000
            )
            
            print("✅ Locked Reports loaded")
            return True
            
        except Exception as e:
            print(f"❌ select_locked_reports error: {e}")
            return False

    async def check_locked_reports(self, full_address: str) -> dict:
        """
        Check locked reports table for address match.
        Note: Locked reports table does NOT have address column visible.
        This function exists for future compatibility if address becomes available.
        
        Args:
            full_address: Full address to search for
            
        Returns:
            Dictionary with status info if found, None otherwise
        """
        print(f"\n🔍 Searching Locked Reports for address: {full_address}")
        try:
            rows = await self.page.locator('table[id$="DataGridOMhistory"] tr').all()
            print(f"Found {len(rows)} rows in Locked Reports")
            
            # Skip first 2 rows (pagination and header)
            for row in rows[2:]:
                try:
                    cells = await row.locator("td").all()
                    
                    # Locked reports table structure from HTML:
                    # Col 0: Date
                    # Col 1: Report Type
                    # Col 2: Type
                    # Col 3: Status
                    # Col 4: Company
                    # Col 5: Report button
                    # Col 6: Request Unlock button
                    # Col 7: Email Report button
                    # NOTE: NO ADDRESS COLUMN in locked reports!
                    
                    if len(cells) >= 5:
                        # Since there's no address column, we can only check by clicking
                        # each report and inspecting it - which is expensive
                        # For now, we'll skip locked reports check
                        pass
                        
                except Exception as row_err:
                    print(f"Error processing row: {row_err}")
                    continue
                    
        except Exception as e:
            print(f"Error searching Locked Reports: {e}")

        print("⚠️  Locked reports don't show address - skipping check")
        return None

    async def open_discarded_reports(self) -> bool:
        """
        Open discarded reports by clicking the menu link.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            print("Opening Discarded Reports...")
            
            # Click on "Discarded Reports" link in the menu
            await self.page.click('a[href*="Type=Discarded"]')
            
            # Wait for discarded reports table to load
            await self.page.wait_for_selector(
                'table[id$="DataGridDeletedHistory"]',
                state="visible",
                timeout=10000
            )
            
            await asyncio.sleep(2)  # Extra wait for table to fully render
            
            print("✅ Discarded Reports loaded")
            return True
            
        except Exception as e:
            print(f"❌ open_discarded_reports error: {e}")
            return False

    async def check_discarded_reports(self, full_address: str) -> dict:
        """
        Check discarded reports table for address match.
        
        Args:
            full_address: Full address to search for
            
        Returns:
            Dictionary with status info if found, None otherwise
        """
        print(f"\n🔍 Searching Discarded Reports for address: {full_address}")
        try:
            rows = await self.page.locator('table[id$="DataGridDeletedHistory"] tr').all()
            print(f"Found {len(rows)} rows in Discarded Reports")

            # Discarded reports table structure from HTML:
            # Row 0: Pagination
            # Row 1: Header
            # Row 2+: Data rows
            # Columns: Return | Report Type | Submitted | Deleted | Site Address | Owner | Report
            
            for row in rows[2:]:  # skip pagination and header rows
                try:
                    cells = await row.locator("td").all()
                    
                    if len(cells) >= 5:
                        # Column 4 is "Site Address"
                        address = (await cells[4].text_content() or "").strip()

                        # Use improved address matching
                        if self.addresses_match(address, full_address):
                            current_time = timezone.now()
                            print(f"✅ Address FOUND in DISCARDED Reports → {address}")
                            return {
                                "found": True,
                                "location": "DISCARDED",
                                "status": "DELETED",
                                "rme_completed": True,
                                "finalized_by": "Automation",
                                "finalized_by_email": "automation@sterling-septic.com",
                                "finalized_date": current_time,
                            }
                except Exception as row_err:
                    print(f"Error processing row: {row_err}")
                    continue
                    
        except Exception as e:
            print(f"Error searching Discarded Reports: {e}")

        print("❌ Address NOT found in Discarded Reports")
        return None

    async def process_single_work_order(self, work_order: dict, index: int, total: int) -> dict:
        """
        Process a single work order completely - collect all data in one pass.
        
        Args:
            work_order: Work order dictionary
            index: Current index (1-based)
            total: Total number of work orders
            
        Returns:
            Dictionary with all collected data for database update
        """
        print(f"\n{'='*80}")
        print(f"📄 Processing work order {index}/{total}")
        print(f"{'='*80}")

        result = {
            "work_order_id": work_order.get("id"),
            "full_address": work_order.get("full_address"),
            "last_report_link": None,
            "tech_report_submitted": False,
            "status": None,
            "rme_completed": False,
            "finalized_by": None,
            "finalized_by_email": None,
            "finalized_date": None,
            "form_data": [],
            "components_data": [],
            "error": None
        }

        try:
            work_order_id = work_order.get("id")
            full_address = work_order.get("full_address")
            wait_to_lock = work_order.get("wait_to_lock", False)
            rme_completed = work_order.get("rme_completed", False)

            # Validation
            if not full_address:
                print(f"⏭️  Skipping: No address provided.")
                result["error"] = "No address provided"
                return result

            # EARLY EXIT: Skip if already completed
            if rme_completed:
                print(f"⏭️  Skipping: rme_completed=True (already finalized)")
                print(f"   Address: {full_address}")
                result["rme_completed"] = True
                result["status"] = "ALREADY_COMPLETED"
                return result

            # Parse address
            street_number, street_name = extract_address_details(full_address)
            if not street_number or not street_name:
                print(f"⏭️  Skipping: Could not parse address.")
                result["error"] = "Could not parse address"
                return result

            # Ensure authentication
            await self.ensure_authenticated()

            # Wait for search form
            wait_xpath = self.rules.get("wait_rme_body")
            try:
                await self.page.wait_for_selector(wait_xpath, state="visible", timeout=30000)
            except Exception:
                print(f"⚠️  Timeout waiting for search form")
                result["error"] = "Timeout waiting for search form"
                return result

            # STEP 1: Search property and fetch last report link from Service History
            print(f"\n📍 STEP 1: Fetching last report PDF link for: {full_address}")
            await self.search_property(street_number, street_name)
            last_report_link = await self.fetch_last_report_link_from_service_history()
            result["last_report_link"] = last_report_link
            print(f"✅ Last report link: {last_report_link}")

            # STEP 2: Check work history
            print(f"\n📍 STEP 2: Checking work history...")
            work_history_result = await self.check_work_history_table(full_address)
            
            if work_history_result and work_history_result.get("found"):
                # Found in work history - collect form data
                print("✅ Found in WORK HISTORY - Form data collected")
                result["tech_report_submitted"] = True
                result["form_data"] = work_history_result.get("form_data", [])
                result["components_data"] = work_history_result.get("components_data", [])
                result["status"] = "WORK_HISTORY"
                
                # DEBUG: Print what we're about to save
                print(f"   DEBUG: tech_report_submitted = {result['tech_report_submitted']}")
                print(f"   DEBUG: form_data count = {len(result['form_data'])}")
                print(f"   DEBUG: components_data count = {len(result['components_data'])}")
                
                return result

            # Not found in work history - check wait_to_lock
            print("❌ Not found in work history")
            
            if wait_to_lock:
                print(f"\n📍 STEP 3: wait_to_lock=True - Setting WAITING_FOR_LOCK")
                result["status"] = "WAITING_FOR_LOCK"
                result["finalized_by"] = "Automation"
                result["finalized_by_email"] = "automation@sterling-septic.com"
                result["finalized_date"] = timezone.now()
                return result

            # STEP 3: Check locked reports (currently skipped due to no address column)
            print(f"\n📍 STEP 3: Checking LOCKED reports...")
            print("⚠️  Locked reports table doesn't show addresses - skipping")
            
            # STEP 4: Check discarded reports
            print(f"\n📍 STEP 4: Checking DISCARDED reports...")
            if await self.open_discarded_reports():
                discarded_result = await self.check_discarded_reports(full_address)
                if discarded_result and discarded_result.get("found"):
                    print("✅ Found in DISCARDED reports")
                    result["status"] = discarded_result["status"]
                    result["rme_completed"] = discarded_result["rme_completed"]
                    result["finalized_by"] = discarded_result["finalized_by"]
                    result["finalized_by_email"] = discarded_result["finalized_by_email"]
                    result["finalized_date"] = discarded_result["finalized_date"]
                    return result

            # Not found anywhere
            print("❌ Not found in any location")
            result["status"] = "NOT_FOUND"
            result["finalized_by"] = "Automation"
            result["finalized_by_email"] = "automation@sterling-septic.com"
            result["finalized_date"] = timezone.now()
            return result

        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            result["error"] = str(e)
            return result

    async def update_database_batch(self, result: dict):
        """
        Update database with all collected data in a single operation.
        
        Args:
            result: Dictionary with all data to update
        """
        work_order_id = result.get("work_order_id")
        if not work_order_id:
            print("❌ No work order ID - skipping database update")
            return

        print(f"\n💾 Updating database for work order {work_order_id}...")
        
        try:
            await sync_to_async(self._update_database_sync)(result)
            print("✅ Database updated successfully")
        except Exception as e:
            print(f"❌ Failed to update database: {e}")
            import traceback
            traceback.print_exc()

    def _update_database_sync(self, result: dict):
        """
        Synchronous database update operation.
        
        Args:
            result: Dictionary with all data to update
        """
        work_order_id = result["work_order_id"]
        
        try:
            print(f"   📌 Looking up work order ID: {work_order_id}")
            work_order = WorkOrderToday.objects.get(pk=work_order_id)
            print(f"   ✓ Found work order in database")
            
            # Track if any changes were made
            changes_made = False
            
            # Update last_report_link if available
            if result.get("last_report_link"):
                work_order.last_report_link = result["last_report_link"]
                print(f"   ✓ Updated last_report_link: {result['last_report_link'][:50]}...")
                changes_made = True
            
            # Update tech_report_submitted if work history found
            if result.get("tech_report_submitted"):
                print(f"   📝 Setting tech_report_submitted = True")
                work_order.tech_report_submitted = True
                print(f"   ✓ Updated tech_report_submitted=True")
                changes_made = True
                
                # Save form data and components if available
                form_data = result.get("form_data", [])
                components_data = result.get("components_data", [])
                
                print(f"   📊 Form data entries: {len(form_data)}")
                print(f"   📊 Components data entries: {len(components_data)}")
                
                if form_data or components_data:
                    try:
                        print(f"   📤 Calling API to save form and components data...")
                        self.api_client.work_order_today_edit(
                            form_data,
                            components_data,
                            work_order_id
                        )
                        print(f"   ✓ Saved form data and components via API")
                    except Exception as api_err:
                        print(f"   ⚠️  Failed to save form data: {api_err}")
                        import traceback
                        traceback.print_exc()
            
            # Update status fields if provided
            if result.get("status"):
                work_order.status = result["status"]
                print(f"   ✓ Updated status={result['status']}")
                changes_made = True
            
            if result.get("finalized_by"):
                work_order.finalized_by = result["finalized_by"]
                work_order.finalized_by_email = result["finalized_by_email"]
                work_order.finalized_date = result["finalized_date"]
                print(f"   ✓ Updated finalization fields")
                print(f"      - finalized_by: {result['finalized_by']}")
                print(f"      - finalized_by_email: {result['finalized_by_email']}")
                print(f"      - finalized_date: {result['finalized_date']}")
                changes_made = True
            
            # Set rme_completed for DELETED status or when explicitly set
            if result.get("rme_completed") or result.get("status") == "DELETED":
                work_order.rme_completed = True
                work_order.elapsed_time_rme_completed = timezone.now().isoformat()
                print(f"   ✓ Updated rme_completed=True")
                changes_made = True
            
            # IMPORTANT: Save the work order to persist changes
            if changes_made:
                print(f"   💾 Saving work order to database...")
                work_order.save()
                print(f"   ✅ Changes saved to database successfully")
                
                # Verify the save
                work_order.refresh_from_db()
                print(f"   🔍 Verification after save:")
                print(f"      - tech_report_submitted: {work_order.tech_report_submitted}")
                print(f"      - rme_completed: {work_order.rme_completed}")
                print(f"      - status: {work_order.status}")
            else:
                print(f"   ℹ️  No changes to save")
            
        except WorkOrderToday.DoesNotExist:
            print(f"   ❌ Work order {work_order_id} not found in database")
        except Exception as e:
            print(f"   ❌ Database update error: {e}")
            import traceback
            traceback.print_exc()
            raise

    async def workorder_address_check_and_get_form(self, work_orders: list) -> list:
        """
        Main entry point - process all work orders with optimized flow.
        
        Args:
            work_orders: List of work order dictionaries
            
        Returns:
            List of work orders with updated data
        """
        if not self.page:
            await self.initialize()

        total_count = len(work_orders)
        print(f"\n{'='*80}")
        print(f"Starting processing of {total_count} work orders")
        print(f"{'='*80}\n")

        for index, work_order in enumerate(work_orders, start=1):
            # Process single work order and collect all data
            result = await self.process_single_work_order(work_order, index, total_count)
            
            # Update work_orders list with result
            work_orders[index - 1]["last_report_link"] = result.get("last_report_link")
            work_orders[index - 1]["tech_report_submitted"] = result.get("tech_report_submitted", False)
            
            # Update database with all collected data in ONE operation
            await self.update_database_batch(result)
            
            # Print summary
            print(f"\n{'─'*80}")
            print(f"✅ Summary for work order {index}/{total_count}:")
            print(f"   Address: {result.get('full_address')}")
            print(f"   Last report link: {result.get('last_report_link')}")
            print(f"   Tech report submitted: {result.get('tech_report_submitted')}")
            print(f"   Status: {result.get('status')}")
            print(f"   RME completed: {result.get('rme_completed')}")
            if result.get("error"):
                print(f"   ⚠️  Error: {result.get('error')}")
            print(f"{'─'*80}\n")

        # Cleanup
        await self.cleanup()
        
        print(f"\n{'='*80}")
        print(f"✅ Completed processing all {total_count} work orders")
        print(f"{'='*80}\n")

        return work_orders

    # Legacy method for backward compatibility
    async def run(self, work_orders: list) -> list:
        """
        Legacy run method - simple version without form scraping.
        Kept for backward compatibility.
        
        Args:
            work_orders: List of work order dictionaries
            
        Returns:
            List of work orders with updated data
        """
        if not self.page:
            await self.initialize()

        total_count = len(work_orders)

        for index, work_order in enumerate(work_orders, start=1):
            print(f"\n📄 Processing work order {index}/{total_count}...")

            try:
                await self.ensure_authenticated()

                wait_xpath = self.rules.get("wait_rme_body")
                try:
                    await self.page.wait_for_selector(wait_xpath, state="visible", timeout=30000)
                except Exception:
                    print(f"⚠️  Timeout waiting for search form (item {index})")
                    continue

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

                # Fetch last report link from Service History
                last_report_link = await self.fetch_last_report_link_from_service_history()
                work_orders[index - 1]["last_report_link"] = last_report_link

                # Check work history
                work_history_result = await self.check_work_history_table(full_address)
                tech_report_submitted = work_history_result is not None and work_history_result.get("found", False)
                work_orders[index - 1]["tech_report_submitted"] = tech_report_submitted

                print(f"✅ Processing completed for: {full_address}")
                print(f"   Last report link: {last_report_link}")
                print(f"   Tech report submitted: {tech_report_submitted}")

            except Exception as e:
                print(f"❌ Unexpected error processing item {index}: {e}")
                import traceback
                traceback.print_exc()
                if "last_report_link" not in work_orders[index - 1]:
                    work_orders[index - 1]["last_report_link"] = None
                if "tech_report_submitted" not in work_orders[index - 1]:
                    work_orders[index - 1]["tech_report_submitted"] = False

        await self.cleanup()
        return work_orders