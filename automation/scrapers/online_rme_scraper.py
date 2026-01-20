"""
Online RME Scraper
Scrapes report links from the Online RME system.
"""
import asyncio
from typing import List, Dict

from automation.scrapers.base_scraper import BaseScraper


class OnlineRMEScraper(BaseScraper):
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
                print("🔐 Not logged in. Redirecting to login page...")
                
                login_url = self.rules.get('online_RME_url')
                await self.page.goto(login_url, wait_until='domcontentloaded')
                await self.login_online_rme()
                
                # Return to search page after login
                if self.page.url != search_url:
                    await self.page.goto(search_url, wait_until='networkidle')
            else:
                print("✅ Already authenticated to Online RME.")
        
        except Exception as e:
            print(f"❌ Error during authentication check: {e}")
            raise
    
    def parse_address(self, full_address):
        """
        Parse full address into street number and street name.
        
        Args:
            full_address: Complete address string
            
        Returns:
            tuple: (street_number, street_name) or (None, None) if invalid
        """
        if not full_address:
            return None, None
        
        parts = full_address.split(' ')
        
        if len(parts) < 2:
            print(f"⚠️  Invalid address format: {full_address}")
            return None, None
        
        street_number = parts[0]
        street_name = parts[1]
        
        return street_number, street_name
    
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
    
    async def fetch_unlocked_report_link(self):
        """
        Click edit button to get unlocked report URL.
        
        Returns:
            str: URL of unlocked report or None if not found
        """
        try:
            # Wait for unlock button
            unlock_btn_xpath = self.rules.get("wait_unlocked_report_btn")
            try:
                await self.page.wait_for_selector(
                    unlock_btn_xpath,
                    state='visible',
                    timeout=30000
                )
            except:
                pass
            
            # Click edit/unlock button
            await self.perform_actions_by_xpaths(name="unlocked_report_edit_btn")
            
            # Wait for page navigation
            await asyncio.sleep(3)
            
            # Get current URL (this is the unlocked report URL)
            current_url = self.page.url
            print(f"✅ Unlocked report link: {current_url}")
            
            return current_url
        
        except Exception as e:
            print(f"❌ Error fetching unlocked report link: {e}")
            return None
    
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
                
                street_number, street_name = self.parse_address(full_address)
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
                if not work_order.get("unlocked_report_link"):
                    unlocked_report_link = await self.fetch_unlocked_report_link()
                    if unlocked_report_link:
                        work_orders[index - 1]['unlocked_report_link'] = unlocked_report_link
                print(f"   Last: {work_order.get('last_report_link')}")
                print(f"   Unlocked: {work_order.get('unlocked_report_link')}")
            
            except Exception as e:
                print(f"❌ Unexpected error processing item {index} ({full_address}): {e}")
        
        # Cleanup
        await self.cleanup()
        
        return work_orders