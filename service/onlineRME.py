import asyncio
from service.baseScraper import BaseScraper


class OnlineRMEScraper(BaseScraper):
    def __init__(self):
        super().__init__()

    async def ensure_logged_in(self):
        """Helper method to check login status and login if necessary."""
        try:
            search_url = self.rules.get('contractor_search_property')
            await self.page.goto(search_url, wait_until='domcontentloaded')

            # Check for the specific element that indicates we are on the dashboard/logged in
            # Using specific timeout to avoid waiting too long if element doesn't exist
            lbl_match = self.page.locator('//span[@id="lblMultiMatch"]')
            
            is_logged_in = False
            if await lbl_match.is_visible(timeout=5000):
                content = await lbl_match.inner_text()
                if "You are currently logged in for Sterling Septic & Plumbing" in content:
                    is_logged_in = True
            
            if not is_logged_in:
                print("Not logged in. Redirecting to login page...")
                await self.page.goto(self.rules.get('online_RME_url'), wait_until='domcontentloaded')
                await self.login_onlineRME()
                
                # Verify we are back on the search page after login
                if self.page.url != search_url:
                    await self.page.goto(search_url, wait_until='networkidle')
                    
        except Exception as e:
            print(f"Error during login check: {e}")
            raise e

    async def run(self, datas: list):
        """Orchestrator method to run the whole process"""
        if not self.page:
            await self.initialize()

        # Iterate through the data
        for i, data in enumerate(datas):
            print(f"Processing item {i+1}/{len(datas)}...")
            
            try:
                # 1. Ensure we are logged in and on the correct page before processing each item
                await self.ensure_logged_in()
                
                # 2. Wait for the main body/search form to be ready
                wait_xpath = self.rules.get("wait_rme_body")
                try:
                    await self.page.wait_for_selector(wait_xpath, state='visible', timeout=30000)
                except Exception:
                    print(f"Timeout waiting for Search Body for item {i}")
                    continue

                full_address = data.get("full_address")
                if not full_address:
                    print(f"Skipping item {i}: No address found.")
                    continue

                # 3. Handle Address Splitting Safely
                parts = full_address.split(' ')
                if len(parts) < 2:
                    print(f"Skipping item {i}: Address format invalid ({full_address})")
                    continue
                    
                streetnum = parts[0]
                streetname = parts[1] # Taking only the second part as name based on your logic
                
                # 4. Perform Search
                await self.select_by_xpaths(name="street_number", value=streetnum)
                await self.select_by_xpaths(name="street_name", value=streetname)
                await self.select_by_xpaths(name="submit_search_rme")

                if not data.get('last_report_link', False):
                    # 5. Navigate to Service History
                    try:
                        history_url = self.rules.get('rme_service_history')
                        await self.page.goto(history_url, wait_until='networkidle')
                        
                        wait_table_xpath = self.rules.get("wait_rme_report_table")
                        await self.page.wait_for_selector(wait_table_xpath, state='visible', timeout=30000)
                    except Exception as e:
                        print(f"Error loading service history for {full_address}: {e}")

                    # 6. Click Last Report
                    await self.select_by_xpaths(name="last_report_link_click")
                    
                    # 7. Handle Iframe
                    iframe_xpath = self.rules.get("wait_iframe", "//iframe")
                    try:
                        await self.page.wait_for_selector(iframe_xpath, state='visible', timeout=30000)
                    except Exception:
                        print(f"Iframe not found for {full_address}")

                    iframe_locator = self.page.locator(iframe_xpath).first
                    src = await iframe_locator.get_attribute("src")
                    
                    if src:
                        if 'http' not in src:
                            last_report_link = "https://www.onlinerme.com/" + src.lstrip('/')
                        else:
                            last_report_link = src
                        
                        datas[i]['last_report_link'] = last_report_link
      
                        print(f"last_report_link: {last_report_link}")
                    else:
                        print("Iframe src attribute not found.")
                elif not data.get("unlocked_report_link", False):
                    # 8. Unlock Report Button
                    try:
                        try:
                            unlock_btn_xpath = self.rules.get("wait_unlocked_report_btn")
                            await self.page.wait_for_selector(unlock_btn_xpath, state='visible', timeout=30000)
                        except:
                            pass
                        await self.select_by_xpaths(name="unlocked_report_edit_btn")
                        
                        # Wait a bit for the redirect/action
                        await asyncio.sleep(3) 
                        
                        # FIX: page.url is a property, not a callable
                        current_url = self.page.url 
                        datas[i]['unlocked_report_link'] = current_url
                        
                        # FIX: Added f-string
                        print(f"unlocked_report_link: {current_url}")
                        
                    except Exception as e:
                        print(f"Error clicking unlock button: {e}")
                else:
                    print(f"last_report_link : {data.get('last_report_link')}")
                    print(f"unlocked_report_link : {data.get("unlocked_report_link")}")
                   

            except Exception as e:
                # Catch unexpected errors for this specific item so loop continues
                print(f"Unexpected error processing item {i} ({data.get('full_address')}): {e}")


        # Cleanup outside the loop
        try:
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
        except Exception:
            pass

        return datas