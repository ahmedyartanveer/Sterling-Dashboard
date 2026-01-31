import sys
import asyncio
import os
# from tasks.scrapers.online_rme_scraper import OnlineRMEScraper # (Assuming imports are handled)

# ==========================================
# Force Unbuffered Output (Critical for Server Logs)
# ==========================================
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(line_buffering=True)

# ==========================================
# Enhanced Logging System
# ==========================================
def log_info(message):
    print(f"[INFO] {message}", flush=True)

def log_success(message):
    print(f"[SUCCESS] {message}", flush=True)

def log_error(message):
    print(f"[ERROR] {message}", flush=True)
    sys.stderr.flush()

def log_warning(message):
    print(f"[WARNING] {message}", flush=True)

# ==========================================
# Main Task Class
# ==========================================
class OnlineRMEEditTaskHelper:
    
    def _load_js_script(self, filename):
        """
        Helper method to read JS file content from the js_scripts directory.
        """
        try:
            # Determine path relative to this python file
            # Assumes structure: tasks/scrapers/this_file.py
            # And scripts at:    tasks/js_scripts/filename.js
            
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # Go up one level to 'tasks' then into 'js_scripts'
            # Note: Adjust '../js_scripts' based on your exact file location
            script_path = os.path.join(current_dir, '../js_scripts', filename)
            
            if not os.path.exists(script_path):
                # Fallback: try absolute path or simpler relative path depending on runner
                script_path = os.path.join('tasks', 'js_scripts', filename)

            with open(script_path, 'r', encoding='utf-8') as file:
                return file.read()
        except Exception as e:
            log_error(f"Failed to load JS file {filename}: {e}")
            return None

    async def scrape_edit_form_data(self):
        """
        Scrape complete form data using external JS file.
        """
        log_info("Starting to scrape form data...")
        
        try:
            # Wait for table
            # //table[@id='GridViewPump'] | //table[@id='ctl00_DataGridQuestions']
            await self.page.wait_for_selector(
                "//table[@id='GridViewPump'] | //table[@id='ctl00_DataGridQuestions']", 
                state='attached', 
                timeout=6000
            )
        except Exception as e:
            log_error(f"Error waiting for form table: {e}")
            return []

        # Load JS content
        js_script = self._load_js_script('scrape_form.js')
        if not js_script:
            return []

        try:
            # Execute JS
            form_data = await self.page.evaluate(js_script)
            form_data = form_data if form_data else []
            log_success(f"Scraped {len(form_data)} form fields successfully.")
            return form_data  

        except Exception as e:
            log_error(f"Error during form scraping execution: {e}")
            return []
    
    async def populate_form_data(self, json_data):
        """
        Populate the form fields using external JS file.
        """
        if not json_data:
            log_warning("No JSON data provided to populate the form.")
            return False

        log_info(f"Starting to populate form with {len(json_data)} fields...")

        try:
            # Wait for table
            await self.page.wait_for_selector(
                "//table[@id='GridViewPump'] | //table[@id='ctl00_DataGridQuestions']", 
                state='attached', 
                timeout=6000
            )

            # Load JS content
            js_script = self._load_js_script('populate_form.js')
            if not js_script:
                return False

            # Execute JS passing json_data as argument
            await self.page.evaluate(js_script, json_data)

            log_success("Form populated successfully via external JS.")
            return True

        except Exception as e:
            log_error(f"Error populating form: {e}")
            return False