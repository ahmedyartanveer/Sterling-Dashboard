"""
Scrapers package containing all web scraping implementations.
"""
from .base_scraper import BaseScraper
from .fieldedge_scraper import FieldEdgeScraper
from .work_orders_scraper import WorkOrdersScraper
from .online_rme_scraper import OnlineRMEScraper

__all__ = [
    'BaseScraper',
    'FieldEdgeScraper',
    'WorkOrdersScraper',
    'OnlineRMEScraper'
]