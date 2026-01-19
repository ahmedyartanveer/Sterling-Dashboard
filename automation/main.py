"""
Sterling Dashboard - Main Entry Point
Orchestrates the execution of all scraping tasks in sequence.
"""
import sys
import asyncio
from automation.scrapers.fieldedge_scraper import FieldEdgeScraper
from automation.scrapers.work_orders_scraper import WorkOrdersScraper
from automation.scrapers.online_rme_scraper import OnlineRMEScraper


async def run_fieldedge_scraper():
    """Execute FieldEdge scraping workflow."""
    print("=== Starting FieldEdge Scraper ===")
    scraper = None
    
    try:
        scraper = FieldEdgeScraper()
        data = await scraper.run()
        
        if data and data.get('workOrders'):
            if scraper.insert_locates(data):
                print("✅ FieldEdge data inserted successfully.")
            else:
                print("❌ Failed to insert FieldEdge data.")
        else:
            print("⚠️  No FieldEdge data scraped.")
            
    except Exception as e:
        print(f"❌ Error during FieldEdge execution: {e}")
    finally:
        if scraper:
            del scraper


async def run_work_orders_scraper():
    """Execute WorkOrders scraping workflow."""
    print("\n=== Starting WorkOrders Scraper ===")
    scraper = None
    
    try:
        scraper = WorkOrdersScraper()
        work_orders_data = await scraper.run()
        
        if work_orders_data:
            scraper.insert_work_order_today(work_orders_data)
            print("✅ WorkOrders data inserted successfully.")
        else:
            print("⚠️  No WorkOrders data found today.")
            
    except Exception as e:
        print(f"❌ Error during WorkOrders execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass


async def run_online_rme_scraper():
    """Execute Online RME scraping workflow."""
    print("\n=== Starting Online RME Scraper ===")
    scraper = None
    
    try:
        scraper = OnlineRMEScraper()
        
        # Fetch records that need URL updates
        work_orders_missing_urls = scraper.api_client.manage_work_orders(
            method_type="GET",
            params={
                "last_report_link__isnull": "isnull",
                "unlocked_report_link__isnull": "isnull"
            }
        )
        
        record_count = len(work_orders_missing_urls) if work_orders_missing_urls else 0
        print(f"📋 RME records to process: {record_count}")
        
        if work_orders_missing_urls:
            updated_records = await scraper.run(work_orders_missing_urls)
            
            # Update each record via API
            for record in updated_records:
                record_id = record.get('id')
                if record_id:
                    scraper.api_client.manage_work_orders(
                        method_type="PATCH",
                        data=record,
                        record_id=record_id
                    )
            
            print("✅ RME data patching completed.")
        else:
            print("⚠️  No RME records found to update.")
            
    except Exception as e:
        print(f"❌ Error during Online RME execution: {e}")
    finally:
        if scraper:
            try:
                del scraper
            except:
                pass


async def main():
    """Main execution flow - runs all scrapers in sequence."""
    await run_fieldedge_scraper()
    await run_work_orders_scraper()
    await run_online_rme_scraper()


def start_scraping():
    """Initialize and start the scraping process."""
    print("\n" + "="*50)
    print("STERLING DASHBOARD SCRAPER - PROCESS INITIALIZED")
    print("="*50 + "\n")
    
    # Set appropriate event loop policy for Windows
    if sys.platform.startswith("win"):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        print("🖥️  OS: Windows detected. Event loop policy set to Proactor.\n")
    else:
        print(f"🖥️  OS: {sys.platform} detected. Using default event loop.\n")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️  Process interrupted by user.")
    except Exception as e:
        print(f"\n❌ Critical error: {e}")
    finally:
        print("\n" + "="*50)
        print("PROCESS FINISHED")
        print("="*50 + "\n")


if __name__ == "__main__":
    start_scraping()