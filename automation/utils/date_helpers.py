"""
Date formatting and parsing utilities.
"""
from datetime import datetime
from typing import Optional


def format_date_for_api(date_str: str, input_format: str = "%m/%d/%Y") -> Optional[str]:
    """
    Convert date string to ISO format for API consumption.
    
    Args:
        date_str: Date string to convert
        input_format: Expected format of input date
        
    Returns:
        str: ISO formatted date string or None if parsing fails
    """
    try:
        date_obj = datetime.strptime(date_str, input_format)
        return date_obj.replace(hour=0, minute=0, second=0).isoformat()
    except ValueError:
        return None


def parse_date_string(date_str: str, from_format: str, to_format: str) -> str:
    """
    Convert date from one format to another.
    
    Args:
        date_str: Date string to convert
        from_format: Current date format
        to_format: Desired date format
        
    Returns:
        str: Reformatted date string or original string if parsing fails
    """
    try:
        date_obj = datetime.strptime(date_str, from_format)
        return date_obj.strftime(to_format)
    except ValueError:
        return date_str