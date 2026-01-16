from django.contrib import admin
from .models import WorkOrder, DashboardData, WorkOrderToday



admin.site.register(WorkOrder)
admin.site.register(DashboardData)
admin.site.register(WorkOrderToday)
# Register your models here.
