import os
import django

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "Sterling_Dashboard.settings"  # ⚠️ তোমার project settings path
)

django.setup()


import sys
import asyncio
import os
import json
from asgiref.sync import sync_to_async  # 👈 CRITICAL IMPORT for async DB operations
from django.db import close_old_connections, connections
from automation.scrapers.online_rme_scraper import OnlineRMEScraper
from tasks.helper.edit_task import OnlineRMEEditTaskHelper
from asyncio import sleep
from locates.models import WorkOrderTodayEdit  # ⚠️ Add your model import here

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
    print(f"[ERROR] {message}", flush=True)
    sys.stderr.flush()

def log_warning(message):
    """Writes warning messages immediately."""
    print(f"[WARNING] {message}", flush=True)

# ==========================================
# Database Helper Functions (Async-Safe)
# ==========================================
@sync_to_async
def save_scraped_data_to_db(work_order_today_id: str, scraped_data: dict):
    """
    Save the scraped form data to the database
    Async-safe using sync_to_async decorator
    """
    log_info(f"Saving scraped data to DB for work order: {work_order_today_id}")
    
    try:
        # Close stale connections before operation
        close_old_connections()
        
        # Find existing work order or create new one
        work_order, created = WorkOrderTodayEdit.objects.update_or_create(
            work_order_today_id=work_order_today_id,
            defaults={
                'form_data': scraped_data.get('data', []),
            }
        )
        
        if created:
            log_success(f"✅ Created new DB record for work order {work_order_today_id}")
        else:
            log_success(f"✅ Updated existing DB record for work order {work_order_today_id}")
        
        return {
            "success": True,
            "work_order_id": work_order_today_id,
            "created": created,
            "field_count": scraped_data.get('field_count', 0)
        }
        
    except Exception as e:
        log_error(f"❌ Error saving scraped data to DB: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "work_order_id": work_order_edit_id
        }
    finally:
        # Close connections after operation
        close_old_connections()


@sync_to_async
def close_db_connections():
    """Close all database connections"""
    close_old_connections()
    for conn in connections.all():
        conn.close_if_unusable_or_obsolete()
    log_info("Database connections closed")

# ==========================================
# Main Task Class
# ==========================================
class OnlineRMELocedDeletedTask(OnlineRMEScraper, OnlineRMEEditTaskHelper):
    def __init__(self):
        super().__init__()
        log_info("OnlineRMELocedDeletedTask initialized.")
    
    async def scrape_form_data_after_update(self) -> dict:
        """
        Scrapes the form data after successful update using 
        the scrape_edit_form_data method from OnlineRMEEditTaskHelper
        """
        log_info("Starting form data scraping after update...")
        
        try:
            # Use the helper method to scrape form data
            scraped_data = await self.scrape_edit_form_data()
            
            if scraped_data:
                log_success(f"✅ Successfully scraped {len(scraped_data)} form fields")
                log_info(f"Scraped data: {json.dumps(scraped_data, indent=2)}")
                
                return {
                    "success": True,
                    "data": scraped_data,
                    "field_count": len(scraped_data)
                }
            else:
                log_warning("⚠️ No form data was scraped")
                return {
                    "success": False,
                    "error": "No form data scraped",
                    "data": []
                }
            
        except Exception as e:
            log_error(f"❌ Error scraping form data: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "data": []
            }
    
    async def address_match_and_lock_task(self, full_address: str, new_status: str, work_order_edit_id: str, form_data: dict) -> dict:
        """Checks if the address exists in the work history table and performs the requested action."""
        log_info(f"Starting address match process for: {full_address}")
        
        # ==========================================
        # CORRECT LOCATORS FOR YOUR TABLE STRUCTURE
        # ==========================================
        rme_work_history_url = self.rules.get('rme_work_history_url')
        
        # ✅ Correct table selector - using ID contains pattern
        table_selector = "table[id$='DataGridOMhistory']"
        
        # ✅ Correct rows selector - get all rows from tbody
        rows_selector = "table[id$='DataGridOMhistory'] tbody tr"
        
        ADDRESS_COLUMN_INDEX = 7  # Site Address column
        EDIT_COLUMN_INDEX = 10    # Edit column
        LOCK_COLUMN_INDEX = 11    # Lock column
        DISCARD_COLUMN_INDEX = 0  # Discard column (for DELETE)

        if not all([rme_work_history_url, table_selector]):
            log_error("❌ Configuration Error: Missing URLs or selectors in rules.")
            return {"success": False, "error": "Configuration error"}

        try:
            # Navigate to page
            log_info(f"Navigating to work history page...")
            await self.page.goto(url=rme_work_history_url, wait_until='domcontentloaded')
            
            # Wait for table to be visible
            try:
                log_info("Waiting for work history table to be visible...")
                await self.page.wait_for_selector(table_selector, state='visible', timeout=10000)
                log_success("✅ Work history table is visible")
            except Exception as e:
                log_error(f"❌ Work history table did not appear (Timeout): {e}")
                return {"success": False, "error": "Table timeout"}

            # Get all rows
            rows = await self.page.locator(rows_selector).all()
            
            if not rows:
                log_warning("⚠️ Table found but it has no rows.")
                return {"success": False, "error": "No rows found"}

            log_info(f"Table loaded. Checking {len(rows)} rows for address match...")
            
            # Normalize search string
            full_address_lower = full_address.strip().lower()
            match_found = False

            for index, row in enumerate(rows):
                columns = row.locator("td")
                column_count = await columns.count()
                
                # Ensure enough columns exist (need at least 12 columns)
                if column_count > ADDRESS_COLUMN_INDEX:
                    # Get address from column 7 (Site Address)
                    address_cell = columns.nth(ADDRESS_COLUMN_INDEX)
                    address_text = await address_cell.inner_text()
                    
                    if not address_text:
                        continue

                    # Clean up text
                    clean_addr_text = address_text.strip()
                    
                    # Compare addresses
                    if clean_addr_text.lower() in full_address_lower or full_address_lower in clean_addr_text.lower():
                        log_success(f"✅ Match found at row {index + 1}: {clean_addr_text}")
                        match_found = True
                        
                        try:
                            # ==========================================
                            # HANDLE DIFFERENT ACTIONS
                            # ==========================================
                            
                            if new_status == "LOCKED":
                                # Column 11 - Lock button (image input)
                                lock_item = columns.nth(LOCK_COLUMN_INDEX)
                                lock_button = lock_item.locator('input[type="image"]')
                                
                                log_info("Attempting to click Lock button...")
                                await lock_button.click(timeout=5000)
                                
                                # Wait for the LOCK REPORT button to appear
                                try:
                                    log_info("Waiting for LOCK REPORT button...")
                                    lock_report_btn_selector = self.rules.get('wait_lock_report_btn', 'input[value*="LOCK" i], input[value*="Report" i], button:has-text("LOCK")')
                                    await self.page.wait_for_selector(lock_report_btn_selector, state='visible', timeout=30000)
                                    
                                    element = self.page.locator(lock_report_btn_selector)
                                    await element.click()
                                    
                                    # Wait for navigation/network idle
                                    await self.page.wait_for_load_state("networkidle", timeout=20000)
                                    log_success("✅ Report LOCKED successfully.")
                                    return {"success": True, "action": "LOCKED"}
                                    
                                except Exception as e:
                                    log_error(f"❌ Error clicking LOCK REPORT button: {e}")
                                    return {"success": False, "error": str(e)}

                            elif new_status == "DELETED":
                                # Column 0 - Discard link (a tag with img)
                                discard_item = columns.nth(DISCARD_COLUMN_INDEX)
                                discard_link = discard_item.locator('a')
                                
                                log_info("Attempting to click Discard/Delete...")
                                await discard_link.click(timeout=5000)
                                
                                # Handle confirmation dialog if it appears
                                try:
                                    # Wait for and accept any confirmation dialog
                                    dialog = await self.page.wait_for_event('dialog', timeout=3000)
                                    log_info(f"Dialog appeared: {dialog.message}")
                                    await dialog.accept()
                                    log_success("✅ Dialog accepted")
                                except:
                                    log_info("No confirmation dialog appeared")
                                
                                await self.page.wait_for_timeout(2000)
                                log_success(f"✅ Report DELETED successfully.")
                                return {"success": True, "action": "DELETED"}
                                
                            elif new_status == "UPDATE":
                                # Column 10 - Edit button (image input)
                                edit_item = columns.nth(EDIT_COLUMN_INDEX)
                                edit_button = edit_item.locator('input[type="image"]')
                                
                                log_info("Attempting to click Edit button...")
                                await edit_button.click(timeout=5000)
                                
                                # Wait for page to load after edit click
                                await self.page.wait_for_load_state("networkidle", timeout=20000)
                                
                                # Populate and submit form
                                log_info(f"Attempting to UPDATE with form data...")
                                submit_form_data = await self.populate_form_data(form_data)
                                
                                if submit_form_data:
                                    try:
                                        # Find and click save button
                                        save_edit_form_btn = self.rules.get('save_edit_form_btn', 'input[type="submit"][value*="Save"], button:has-text("Save")')
                                        save_btn = self.page.locator(save_edit_form_btn)
                                        
                                        await save_btn.wait_for(state="visible", timeout=15000)
                                        
                                        log_info("Attempting to click Save button...")
                                        async with self.page.expect_navigation(wait_until="networkidle"):
                                            await save_btn.click()
                                        
                                        await self.page.wait_for_load_state("networkidle", timeout=20000)
                                        log_success("✅ Report UPDATED successfully.")
                                        
                                        # ==========================================
                                        # 🔥 SCRAPE FORM DATA AFTER UPDATE
                                        # ==========================================
                                        log_info("Now scraping updated form data...")
                                        scraped_result = await self.scrape_form_data_after_update()
                                        
                                        # ==========================================
                                        # 💾 SAVE SCRAPED DATA TO DATABASE (NOW ASYNC-SAFE)
                                        # ==========================================
                                        db_save_result = await save_scraped_data_to_db(work_order_edit_id, scraped_result)
                                        
                                        if db_save_result.get("success"):
                                            log_success(f"✅ DATABASE: Successfully saved {db_save_result.get('field_count', 0)} fields to DB")
                                        else:
                                            log_error(f"❌ DATABASE: Failed to save to DB: {db_save_result.get('error', 'Unknown error')}")
                                        
                                        return {
                                            "success": True, 
                                            "action": "UPDATE",
                                            "scraped_data": scraped_result,
                                            "db_save_result": db_save_result
                                        }
                                        
                                    except Exception as e:
                                        log_error(f"❌ Error saving edit form: {e}")
                                        return {"success": False, "error": str(e)}
                                else:
                                    log_error("❌ Failed to populate form data")
                                    return {"success": False, "error": "Form population failed"}
                                    
                            else:
                                log_error(f"❌ Invalid status provided: {new_status}")
                                return {"success": False, "error": f"Invalid status: {new_status}"}
                                
                        except Exception as click_err:
                            log_error(f"❌ Error performing action '{new_status}' at row {index + 1}: {click_err}")
                            continue  # Try next row if this one fails
            
            if not match_found:
                log_warning(f"⚠️ No matching address found in the table after checking all {len(rows)} rows.")
            
            return {"success": False, "error": "No match found"}

        except Exception as e:
            log_error(f"❌ Critical Error in address_match_and_lock_task: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
        
    async def run(self, full_address: str, new_status: str, work_order_edit_id: str, form_data: dict):
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
            
            # Wait for main page to load
            wait_xpath = self.rules.get("wait_rme_body", "body")
            try:
                log_info("Waiting for page body...")
                await self.page.wait_for_selector(wait_xpath, state='visible', timeout=30000)
                log_success("✅ Page loaded successfully")
            except Exception as e:
                log_warning(f"⚠️ Timeout waiting for page body: {e}")
            
            # Parse address
            if not full_address:
                log_warning("⚠️ Skipping: No address provided.")
                return {"success": False, "error": "No address provided"}
                
            return await self.address_match_and_lock_task(full_address, new_status, work_order_edit_id, form_data)
            
        except Exception as e:
            log_error(f"❌ Locked Task Run Error: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
        

async def main():
    # Force logs to appear immediately at start
    print("\n[INFO] >>> SCRIPT STARTING execution...", flush=True)

    if len(sys.argv) < 5:
        log_error("❌ Error: Insufficient arguments provided.")
        log_error("Usage: python script.py <address> <status> <work_order_id> <form_data_json>")
        return 1

    wo_address = sys.argv[1]
    new_status = sys.argv[2]
    work_order_edit_id = sys.argv[3]
    
    try:
        form_data = json.loads(sys.argv[4])
    except json.JSONDecodeError as e:
        log_error(f"❌ Error parsing form_data JSON: {e}")
        return 1
        
    log_info(f"Processing Work Order Address: {wo_address}")
    log_info(f"Processing Work Order Status: {new_status}")
    log_info(f"Processing Work Order ID: {work_order_edit_id}")
    log_info(f"Processing Work Order Update Body: {len(form_data)} fields")

    scraper = None
    exit_code = 1 

    try:
        scraper = OnlineRMELocedDeletedTask()
        task_result = await scraper.run(wo_address, new_status, work_order_edit_id, form_data)
        
        if task_result.get("success"):
            log_success("✅ Task Completed Successfully.")
            
            # Print scraped data if available
            if "scraped_data" in task_result:
                scraped_result = task_result["scraped_data"]
                if scraped_result.get("success"):
                    print("\n" + "="*50, flush=True)
                    print("📋 SCRAPED FORM DATA:", flush=True)
                    print("="*50, flush=True)
                    print(json.dumps(scraped_result.get("data", []), indent=2), flush=True)
                    print("="*50 + "\n", flush=True)
                    
                    # Print DB save result
                    if "db_save_result" in task_result:
                        db_result = task_result["db_save_result"]
                        if db_result.get("success"):
                            log_success(f"✅ DATABASE: Successfully saved {db_result.get('field_count', 0)} fields to DB")
                        else:
                            log_error(f"❌ DATABASE: Failed to save to DB: {db_result.get('error', 'Unknown error')}")
                else:
                    log_error(f"❌ Failed to scrape form data: {scraped_result.get('error', 'Unknown error')}")
            
            exit_code = 0
        else:
            log_error(f"❌ Task Failed: {task_result.get('error', 'Unknown error')}")
            exit_code = 1

    except Exception as e:
        log_error(f"❌ Main Loop Error occurred: {e}")
        import traceback
        traceback.print_exc()
        exit_code = 1
        
    finally:
        log_info("Cleaning up resources...")
        
        # Close database connections
        try:
            await close_db_connections()
            log_info("Database connections closed")
        except Exception as e:
            log_warning(f"⚠️ Error closing DB connections: {e}")
        
        # Close browser resources
        if scraper:
            try:
                if hasattr(scraper, 'page') and scraper.page:
                    await scraper.page.close()
                    log_info("Page closed")
                if hasattr(scraper, 'browser') and scraper.browser:
                    await scraper.browser.close()
                    log_info("Browser closed")
                if hasattr(scraper, 'playwright') and scraper.playwright:
                    await scraper.playwright.stop()
                    log_info("Playwright stopped")
                elif hasattr(scraper, 'p') and scraper.p:
                    await scraper.p.stop()
                    log_info("Playwright stopped")
            except Exception as e:
                log_warning(f"⚠️ Cleanup error: {e}")
        
        log_info("Cleanup finished.")
                
    return exit_code


def start_locked_deleted_task():
    """Initialize and start the scraping process."""
    print("\n" + "="*50, flush=True)
    print("🚀 Online RME Lock/Delete/Update Task Automation STARTED", flush=True)
    print("="*50 + "\n", flush=True)
    
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    exit_code = 1
    try:
        exit_code = asyncio.run(main())
    except KeyboardInterrupt:
        log_warning("⚠️ Process interrupted by user.")
        exit_code = 130
    except Exception as e:
        log_error(f"❌ Critical System Error: {e}")
        import traceback
        traceback.print_exc()
        exit_code = 1
    finally:
        print("\n" + "="*50, flush=True)
        if exit_code == 0:
            print("✅ [SUCCESS] PROCESS FINISHED", flush=True)
        else:
            print("❌ [ERROR] PROCESS FINISHED WITH ERRORS", flush=True)
        print("="*50 + "\n", flush=True)
        sys.exit(exit_code)


if __name__ == "__main__":
    start_locked_deleted_task()