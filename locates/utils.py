import datetime
from django.utils import timezone

def calculate_completion_date(start_date):
    """
    Node.js logic:
    while (businessDays > 0) {
        completionDate.setDate(completionDate.getDate() + 1);
        if (completionDate.getDay() !== 0 && completionDate.getDay() !== 6) {
            businessDays--;
        }
    }
    """
    completion_date = start_date
    business_days = 2

    while business_days > 0:
        completion_date += datetime.timedelta(days=1)
        # Python weekday: Mon=0, Sun=6. So Sat=5, Sun=6
        if completion_date.weekday() != 5 and completion_date.weekday() != 6:
            business_days -= 1
            
    return completion_date

def format_response(success=True, message=None, data=None, **kwargs):
    response = {
        "success": success
    }
    if message:
        response["message"] = message
    if data is not None:
        response["data"] = data
    
    response.update(kwargs)
    return response