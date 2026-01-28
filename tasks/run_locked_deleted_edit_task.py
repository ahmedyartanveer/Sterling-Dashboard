import sys
import asyncio
import os, json
from automation.scrapers.online_rme_scraper import OnlineRMEScraper
from tasks.helper.edit_task import OnlineRMEEditTaskHelper

# ==========================================
# Force Unbuffered Output (Critical for Server Logs)
# ==========================================
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(line_buffering=True)

# ==========================================
# Enhanced Logging System (Using print with flush=True)
# ==========================================
def log_info(message):
    """Writes informational messages immediately."""
    print(f"[INFO] {message}", flush=True)

def log_success(message):
    """Writes success messages immediately."""
    print(f"[SUCCESS] {message}", flush=True)

def log_error(message):
    """Writes error messages immediately."""
    print(f"[ERROR] {message}", flush=True) # Errors usually go to stderr, but stdout is safer for visibility
    sys.stderr.flush()

def log_warning(message):
    """Writes warning messages immediately."""
    print(f"[WARNING] {message}", flush=True)

# ==========================================
# Main Task Class
# ==========================================
class OnlineRMELocedDeletedTask(OnlineRMEScraper, OnlineRMEEditTaskHelper):
    def __init__(self):
        super().__init__()
        log_info("OnlineRMELocedTask initialized.")
        # self.scrape_edit_form_data()
        # self.populate_form_data()
    
    async def address_match_and_lock_task(self, full_address: str, new_status:str, work_order_edit_id:str) -> bool:
        """Checks if the address exists in the work history table and locks it if found."""
        log_info(f"Starting address match process for: {full_address}")
        
        rme_work_history_url = self.rules.get('rme_work_history_url')
        table_selector = self.rules.get("wait_work_history_table")
        rows_selector = self.rules.get("work_history_table_xpath")

        if not all([rme_work_history_url, table_selector, rows_selector]):
            log_error("Configuration Error: Missing URLs or XPaths in rules.")
            return False

        try:
            # Navigate to page
            await self.page.goto(url=rme_work_history_url, wait_until='domcontentloaded')
            
            # Wait for table visibility
            try:
                log_info("Waiting for work history table to be visible...")
                await self.page.wait_for_selector(table_selector, state='visible', timeout=10000)
            except Exception:
                log_error("Work history table did not appear (Timeout).")
                return False

            # Get all rows
            rows = await self.page.locator(rows_selector).all()
            
            if not rows:
                log_warning("Table found but it has no rows.")
                return False

            log_info(f"Table loaded. Checking {len(rows)} rows for address match...")
            
            # Normalize search string
            full_address_lower = full_address.strip().lower()

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
                        log_success(f"Match found at row {index + 1}: {clean_addr_text}")
                        
                        try:
                            click_item = None

                            if new_status == "LOCKED":
                                # nth(11) is the 12th column (0-indexed)
                                lock_item = columns.nth(11) 
                                click_item = lock_item.locator('input')
                                log_info("Attempting to click lock input...")
                                await click_item.click(timeout=5000)
                                 # Wait for search form (timeout is acceptable here)
                                wait_lock_report_btn = self.rules.get("wait_lock_report_btn")
                                try:
                                    log_info("Waiting for LOCK REPORT Button form...")
                                    await self.page.wait_for_selector(wait_lock_report_btn, state='visible', timeout=30000)
                                except Exception:
                                    log_warning("Timeout waiting for LOCK REPORT Button form selector (continuing anyway)...")
                                try:
                                    element = self.page.locator(wait_lock_report_btn)
                                    await element.wait_for(state="visible", timeout=10000)

                                    await element.click()  # no_wait_after=False (default)

                                    # ✅ wait until backend + page settle
                                    await self.page.wait_for_load_state("networkidle", timeout=20000)

                                    log_success("LOCK REPORT successfully.")
                                    return True

                                except Exception as e:
                                    log_error(f"Error LOCK REPORT '{new_status}': {e}")
                                    return False

                            elif new_status == "DELETED":
                                # nth(0) is the 1st column
                                deleted_item = columns.nth(0) 
                                click_item = deleted_item.locator('a')
                                log_info("Attempting to click Deleted...")
                                await click_item.click(timeout=5000)
                                log_info(f"Waiting 2 seconds for DELETED...")
                                await self.page.wait_for_timeout(2000) 
                                log_success(f"DELETED successfully.")
                                return True
                            elif new_status == "GET" or new_status == "UPDATE":
                                get_item = columns.nth(10) 
                                click_item = get_item.locator('input')
                                log_info("Attempting to click Edit...")
                                await click_item.click(timeout=5000)
                                await self.page.wait_for_load_state("networkidle", timeout=20000) 
                                if new_status == "GET":
                                    form_data = await self.scrape_edit_form_data()
                                    if len(form_data) != 0:
                                        result = self.api_client.work_order_today_edit(form_data, int(work_order_edit_id))
                                        return True if result else False
                                elif new_status == "UPDATE":
                                    pass
                                return False
                            else:
                                log_error(f"Invalid status provided: {new_status}")
                                return False
                        except Exception as click_err:
                            log_error(f"Error performing action '{new_status}': {click_err}")
                            return False
            
            log_warning("No matching address found in the table after checking all rows.")
            return False

        except Exception as e:
            log_error(f"Critical Error in address_match_and_lock_task: {e}")
            return False
        
    async def run(self, full_address: str, new_status:str, work_order_edit_id:str):
        log_info("Run method called. Initializing setup...")
        
        if not self.page:
            log_info("Page not ready, running initialization...")
            await self.initialize()
        else:
            log_info("Page is already initialized.")
            
        try:
            # Ensure authentication
            log_info("Ensuring user is authenticated...")
            await self.ensure_authenticated()
            
            # Wait for search form (timeout is acceptable here)
            wait_xpath = self.rules.get("wait_rme_body")
            try:
                log_info("Waiting for RME body/search form...")
                await self.page.wait_for_selector(wait_xpath, state='visible', timeout=30000)
            except Exception:
                log_warning("Timeout waiting for search form selector (continuing anyway)...")
            
            # Parse address
            if not full_address:
                log_warning("Skipping: No address provided.")
                return False
            return await self.address_match_and_lock_task(full_address, new_status, work_order_edit_id)
            
        except Exception as e:
            log_error(f"Locked Task Run Error: {e}")
            return False
        

async def main():
    # Force logs to appear immediately at start
    print("\n[INFO] >>> SCRIPT STARTING execution...", flush=True)

    if len(sys.argv) < 2:
        log_error("Error: No Address provided in arguments.")
        return 1

    wo_address = sys.argv[1]
    new_status = sys.argv[2]
    work_order_edit_id = sys.argv[3]
    form_data = json.loads(sys.argv[4])
    log_info(f"Processing Work Order Address: {wo_address}")
    log_info(f"Processing Work Order Status: {new_status}")
    log_info(f"Processing Work Order ID: {work_order_edit_id}")
    log_info(f"Processing Work Order Update Body: {form_data}")

    scraper = None
    exit_code = 1 

    try:
        scraper = OnlineRMELocedDeletedTask()
        task_result = await scraper.run(wo_address, new_status, work_order_edit_id)
        
        if task_result:
            log_success("Task Completed Successfully.")
            exit_code = 0
        else:
            log_error("Task Failed or Address Not Locked.")
            exit_code = 1

    except Exception as e:
        log_error(f"Main Loop Error occurred: {e}")
        import traceback
        traceback.print_exc() # Print full error trace for better debugging
        exit_code = 1
        
    finally:
        log_info("Cleaning up resources...")
        if scraper:
            try:
                if hasattr(scraper, 'page') and scraper.page:
                    await scraper.page.close()
                if hasattr(scraper, 'browser') and scraper.browser:
                    await scraper.browser.close()
                if hasattr(scraper, 'playwright') and scraper.playwright:
                    await scraper.playwright.stop()
                elif hasattr(scraper, 'p') and scraper.p:
                    await scraper.p.stop()
            except Exception:
                pass
        log_info("Cleanup finished.")
                
    return exit_code


def start_locked_deleted_task():
    """Initialize and start the scraping process."""
    # Using simple print with flush to guarantee visibility in server logs
    print("\n" + "="*50, flush=True)
    print("Online RME Lock Task Automation STARTED", flush=True)
    print("="*50 + "\n", flush=True)
    
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    exit_code = 1
    try:
        exit_code = asyncio.run(main())
    except KeyboardInterrupt:
        log_warning("Process interrupted by user.")
        exit_code = 130
    except Exception as e:
        log_error(f"Critical System Error: {e}")
        exit_code = 1
    finally:
        print("\n" + "="*50, flush=True)
        if exit_code == 0:
             print("[SUCCESS] PROCESS FINISHED", flush=True)
        else:
             print("[ERROR] PROCESS FINISHED WITH ERRORS", flush=True)
        print("="*50 + "\n", flush=True)
        sys.exit(exit_code)


if __name__ == "__main__":
    start_locked_deleted_task()