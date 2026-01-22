"""
FieldEdge Scraper
Scrapes work order data from the FieldEdge dashboard.
"""
from datetime import datetime
from automation.scrapers.base_scraper import BaseScraper


class FieldEdgeScraper(BaseScraper):
    """
    Scraper for FieldEdge dashboard work orders.
    Filters by status, task type, and date range.
    """
    
    def __init__(self):
        """Initialize FieldEdge scraper."""
        super().__init__()
    
    def format_date(self, date_str):
        """
        Convert date from YYYY-MM-DD to MM/DD/YYYY format.
        
        Args:
            date_str: Date string in YYYY-MM-DD format
            
        Returns:
            str: Formatted date or original string if parsing fails
        """
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
            return date_obj.strftime("%m/%d/%Y")
        except ValueError:
            return date_str
    
    async def select_status(self, status_name):
        """
        Select status filter button in the UI.
        
        Args:
            status_name: Status to filter by (e.g., "Assigned")
        """
        try:
            selector = f'button[title="{status_name}"]'
            status_button = self.page.locator(selector)
            
            if await status_button.count() > 0:
                await status_button.click()
                print(f"Selected status: {status_name}")
            else:
                print(f"Status button '{status_name}' not found.")
                
        except Exception as e:
            print(f"Error selecting status '{status_name}': {e}")
    
    async def select_task_filter(self, task_name):
        """
        Select task type from dropdown filter.
        
        Args:
            task_name: Task type to filter by
        """
        try:
            task_dropdown_xpath = self.rules.get(
                'task_dropdown_xpath',
                "//span[text()='Task']"
            )
            task_label_xpath = f"//label[normalize-space(text())='{task_name}']"
            
            # Open dropdown
            task_button = self.page.locator(task_dropdown_xpath)
            if await task_button.count() > 0:
                await task_button.click()
                await self.page.wait_for_timeout(1000)
                
                # Select task option
                task_label = self.page.locator(task_label_xpath)
                if await task_label.count() > 0:
                    await task_label.click()
                    print(f"Selected task: {task_name}")
                else:
                    print(f"Task option '{task_name}' not found in dropdown.")
            else:
                print("Task dropdown button not found.")
                
        except Exception as e:
            print(f"Error selecting task filter: {e}")
    
    async def set_date_filter(self, start_date, end_date):
        """
        Set date range filter in the UI.
        
        Args:
            start_date: Start date in MM/DD/YYYY format
            end_date: End date in MM/DD/YYYY format
        """
        try:
            # Open date filter dropdown
            date_filter_dropdown = self.page.locator(
                'div.filter-dropdown:has(.time-filter) div.filter-text'
            ).first
            
            if await date_filter_dropdown.count() > 0:
                await date_filter_dropdown.click()
            
            # Fill date inputs
            start_input = self.page.locator('#start-date-filter')
            end_input = self.page.locator('#end-date-filter')
            
            await start_input.fill('')
            await start_input.type(start_date)
            
            await end_input.fill('')
            await end_input.type(end_date)
            
            print(f"Date filter set: {start_date} to {end_date}")
            
        except Exception as e:
            print(f"Error setting date filter: {e}")
    
    async def apply_filters(self):
        """Apply all selected filters."""
        try:
            apply_button = self.page.locator('.plot-map-button:has-text("Apply")')
            
            if await apply_button.count() > 0:
                await apply_button.click()
                print("Filters applied.")
                await self.page.wait_for_timeout(2000)
            else:
                print("Apply button not found.")
                
        except Exception as e:
            print(f"Error applying filters: {e}")
    
    async def scrape_work_orders(self):
        """
        Scrape work order data from the table.
        Only includes EXCAVATOR priority items.
        
        Returns:
            dict: Scraped data with rows and count
        """
        try:
            print("⏳ Waiting for data rows...")
            await self.page.wait_for_selector(
                '.kgRow',
                state='attached',
                timeout=60000
            )
        except Exception as e:
            print(f"Timeout waiting for rows: {e}")
            return {'rows': []}
        
        try:
            scraped_data = await self.page.evaluate(r"""() => {
                const rows = [];
                
                const getTextByClass = (rowElement, classSelector) => {
                    const el = rowElement.querySelector(classSelector);
                    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
                };
                
                const domRows = document.querySelectorAll('.kgRow');
                
                domRows.forEach((row, index) => {
                    try {
                        const priorityColor = row.querySelector('.col0 div[style*="background-color"]')?.style.backgroundColor || '';
                        const priorityName = getTextByClass(row, '.col1');
                        
                        // Only process EXCAVATOR items
                        if (priorityName !== "EXCAVATOR") {
                            return;
                        }
                        
                        rows.push({
                            priorityColor: priorityColor,
                            priorityName: priorityName,
                            workOrderNumber: getTextByClass(row, '.col2'),
                            customerPO: getTextByClass(row, '.col3'),
                            customerName: getTextByClass(row, '.col4'),
                            customerAddress: getTextByClass(row, '.col5'),
                            tags: getTextByClass(row, '.col6'),
                            techName: getTextByClass(row, '.col7'),
                            purchaseStatus: getTextByClass(row, '.col8'),
                            promisedAppointment: getTextByClass(row, '.col9'),
                            createdDate: getTextByClass(row, '.col10'),
                            scheduledDate: getTextByClass(row, '.col11'),
                            task: getTextByClass(row, '.col12')
                        });
                    } catch (err) {
                        console.error(`Error parsing row ${index}:`, err);
                    }
                });
                
                return { rows: rows, count: rows.length };
            }""")
            
            row_count = len(scraped_data.get('rows', []))
            print(f"Scraped {row_count} work order(s).")
            return scraped_data
            
        except Exception as e:
            print(f"Error during page evaluation: {e}")
            return {'rows': []}
    
    async def get_work_order_status(self, work_order_number):
        """
        Fetch detailed status for a specific work order.
        
        Args:
            work_order_number: Work order identifier
            
        Returns:
            str: Status text or None if not found
        """
        try:
            target_xpath = f"//span[text()='{work_order_number}']"
            
            # Click on work order
            await self.perform_actions_by_xpaths(
                action_list=[{
                    "action": "click",
                    "xpath": target_xpath
                }]
            )
            
            # Wait for and extract status
            status_xpath = self.rules.get('locator_status_xpath')
            try:
                await self.page.wait_for_selector(
                    status_xpath,
                    state='visible',
                    timeout=60000
                )
            except:
                pass
            status_locator = self.page.locator(status_xpath)
            raw_text = await status_locator.text_content()
            
            if raw_text:
                # Clean up non-breaking spaces
                return raw_text.replace("\xa0", "").strip()
            
            return None
            
        except Exception as e:
            print(f"Failed to get status for work order '{work_order_number}': {e}")
            return None
    
    async def run(self):
        """
        Execute the complete FieldEdge scraping workflow.
        
        Returns:
            dict: Scraped data with work orders and filter dates, or None on error
        """
        try:
            await self.initialize()
            
            # Navigate to dashboard
            url = self.rules.get('web_url')
            if url:
                await self.page.goto(url, wait_until='domcontentloaded')
            else:
                print("No URL found in rules configuration.")
                return None
            
            # Login if necessary
            if "Login" in self.page.url:
                await self.login_fieldedge()
            
            # Wait for UI to load
            try:
                wait_xpath = self.rules.get("task_dropdown_xpath", "//span[text()='Task']")
                await self.page.wait_for_selector(
                    wait_xpath,
                    state='visible',
                    timeout=60000
                )
            except Exception as e:
                print(f"Task dropdown not immediately visible: {e}")
            
            # Apply filters
            status_name = self.rules.get('status_name', "Assigned")
            await self.select_status(status_name)
            
            if self.rules.get('is_apply_task', False):
                task_name = self.rules.get('task_option_name', "EXCAVATION DRAIN FIELD REPAIR")
                await self.select_task_filter(task_name)
            
            # Set date range
            start_date = self.rules.get('start_date') or datetime.now().strftime('%m/%d/%Y')
            end_date = self.rules.get('end_date') or datetime.now().strftime('%m/%d/%Y')
            await self.set_date_filter(start_date, end_date)
            
            await self.apply_filters()
            
            # Scrape initial data
            scraped = await self.scrape_work_orders()
            work_orders = scraped.get('rows', [])
            
            # Fetch detailed status for each work order
            for work_order in work_orders:
                wo_number = work_order.get("workOrderNumber")
                if wo_number:
                    status = await self.get_work_order_status(wo_number)
                    if status:
                        work_order['tags'] = status
            
            result = {
                "filterStartDate": start_date,
                "filterEndDate": end_date,
                "workOrders": work_orders,
            }
            
            return result
            
        except Exception as e:
            print(f"Critical error in FieldEdge scraper: {e}")
            return None
            
        finally:
            await self.cleanup()