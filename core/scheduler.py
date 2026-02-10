# core/scheduler.py

from apscheduler.schedulers.background import BackgroundScheduler
from automation.main import start_scraping
from dotenv import load_dotenv
import os


load_dotenv()

def start():
    scheduler = BackgroundScheduler()
    
    scheduler.add_job(start_scraping, 'interval', minutes=int(os.getenv('interval_minutes', 10)))
    
    scheduler.start()