from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class DashboardData(models.Model):
    filter_start_date = models.CharField(max_length=50, blank=True, null=True)
    filter_end_date = models.CharField(max_length=50, blank=True, null=True)
    total_work_orders = models.IntegerField(default=0)
    total_deleted_work_orders = models.IntegerField(default=0)
    scraped_at = models.DateTimeField(default=timezone.now)
    
    # Metadata stored as JSON
    dashboard_metadata = models.JSONField(default=dict)

    class Meta:
        ordering = ['-created_at']
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def update_counts(self):
        self.total_work_orders = self.work_orders.count()
        self.total_deleted_work_orders = self.deleted_work_orders.count()
        self.save()

class BaseWorkOrder(models.Model):
    """Abstract class to share fields between Active and Deleted Work Orders"""
    priority_color = models.CharField(max_length=50, default='')
    priority_name = models.CharField(max_length=100, default='')
    work_order_number = models.CharField(max_length=100, unique=True, null=True, blank=True)
    customer_po = models.CharField(max_length=100, default='')
    customer_name = models.CharField(max_length=200, default='')
    customer_address = models.TextField(default='')
    tags = models.TextField(default='')
    tech_name = models.CharField(max_length=100, default='')
    created_date = models.CharField(max_length=50, default='')
    requested_date = models.CharField(max_length=50, default='')
    completed_date_str = models.CharField(max_length=50, default='')  # String version from source
    task = models.TextField(default='')
    serial = models.IntegerField(default=0)
    scheduled_date = models.CharField(max_length=50, default='')
    
    # Call Status Logic
    locates_called = models.BooleanField(default=False)
    CALL_TYPE_CHOICES = [
        ('STANDARD', 'Standard'),
        ('EMERGENCY', 'Emergency'),
    ]
    call_type = models.CharField(max_length=20, choices=CALL_TYPE_CHOICES, null=True, blank=True)
    called_at = models.DateTimeField(null=True, blank=True)
    called_by = models.CharField(max_length=100, default='')
    called_by_email = models.CharField(max_length=100, default='')
    
    completion_date = models.DateTimeField(null=True, blank=True)
    timer_started = models.BooleanField(default=False)
    timer_expired = models.BooleanField(default=False)
    time_remaining = models.CharField(max_length=50, default='')
    
    metadata = models.JSONField(default=dict)

    class Meta:
        abstract = True

class WorkOrder(BaseWorkOrder):
    dashboard = models.ForeignKey(DashboardData, on_delete=models.CASCADE, related_name='work_orders')
    workflow_status = models.CharField(max_length=50, default='PENDING')

    def __str__(self):
        return self.work_order_number

class DeletedWorkOrder(BaseWorkOrder):
    dashboard = models.ForeignKey(DashboardData, on_delete=models.CASCADE, related_name='deleted_work_orders')
    
    # Deletion specific fields
    deleted_at = models.DateTimeField(default=timezone.now)
    deleted_by = models.CharField(max_length=100, default='')
    deleted_by_email = models.CharField(max_length=100, default='')
    deleted_from = models.CharField(max_length=50, default='Dashboard')
    
    original_work_order_id = models.IntegerField(null=True, blank=True) # ID reference
    is_permanently_deleted = models.BooleanField(default=False)
    permanently_deleted_at = models.DateTimeField(null=True, blank=True)
    
    restored = models.BooleanField(default=False)
    restored_at = models.DateTimeField(null=True, blank=True)
    restored_by = models.CharField(max_length=100, default='')
    restored_by_email = models.CharField(max_length=100, default='')

    class Meta:
        ordering = ['-deleted_at']