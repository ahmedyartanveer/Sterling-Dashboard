from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json


class WorkOrder(models.Model):
    """Embedded work order model"""
    priority_color = models.CharField(max_length=50, default='', blank=True)
    priority_name = models.CharField(max_length=50, default='', blank=True)
    work_order_number = models.CharField(max_length=100, default='', blank=True)
    customer_po = models.CharField(max_length=100, default='', blank=True)
    customer_name = models.CharField(max_length=200, default='', blank=True)
    customer_address = models.TextField(default='', blank=True)
    tags = models.CharField(max_length=200, default='', blank=True)
    tech_name = models.CharField(max_length=100, default='', blank=True)
    created_date = models.CharField(max_length=50, default='', blank=True)
    requested_date = models.CharField(max_length=50, default='', blank=True)
    completed_date = models.CharField(max_length=50, default='', blank=True)
    task = models.TextField(default='', blank=True)
    serial = models.IntegerField(default=0)
    scheduled_date = models.CharField(max_length=50, default='', blank=True)
    locates_called = models.BooleanField(default=False)
    
    CALL_TYPE_CHOICES = [
        ('STANDARD', 'Standard'),
        ('EMERGENCY', 'Emergency'),
        (None, 'None'),
    ]
    call_type = models.CharField(max_length=20, choices=CALL_TYPE_CHOICES, null=True, blank=True)
    called_at = models.DateTimeField(null=True, blank=True)
    called_by = models.CharField(max_length=100, default='', blank=True)
    called_by_email = models.EmailField(default='', blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    timer_started = models.BooleanField(default=False)
    timer_expired = models.BooleanField(default=False)
    time_remaining = models.CharField(max_length=50, default='', blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Reference to parent dashboard
    dashboard = models.ForeignKey('DashboardData', on_delete=models.CASCADE, related_name='work_orders')

    class Meta:
        db_table = 'locates_workorder'
        indexes = [
            models.Index(fields=['work_order_number']),
        ]

    def __str__(self):
        return f"WorkOrder {self.work_order_number}"


class DeletedWorkOrder(models.Model):
    """Deleted work order model"""
    priority_color = models.CharField(max_length=50, default='', blank=True)
    priority_name = models.CharField(max_length=50, default='', blank=True)
    work_order_number = models.CharField(max_length=100, default='', blank=True)
    customer_po = models.CharField(max_length=100, default='', blank=True)
    customer_name = models.CharField(max_length=200, default='', blank=True)
    customer_address = models.TextField(default='', blank=True)
    tags = models.CharField(max_length=200, default='', blank=True)
    tech_name = models.CharField(max_length=100, default='', blank=True)
    created_date = models.CharField(max_length=50, default='', blank=True)
    requested_date = models.CharField(max_length=50, default='', blank=True)
    completed_date = models.CharField(max_length=50, default='', blank=True)
    task = models.TextField(default='', blank=True)
    serial = models.IntegerField(default=0)
    scheduled_date = models.CharField(max_length=50, default='', blank=True)
    locates_called = models.BooleanField(default=False)
    
    CALL_TYPE_CHOICES = [
        ('STANDARD', 'Standard'),
        ('EMERGENCY', 'Emergency'),
        (None, 'None'),
    ]
    call_type = models.CharField(max_length=20, choices=CALL_TYPE_CHOICES, null=True, blank=True)
    called_at = models.DateTimeField(null=True, blank=True)
    called_by = models.CharField(max_length=100, default='', blank=True)
    called_by_email = models.EmailField(default='', blank=True)
    completion_date = models.DateTimeField(null=True, blank=True)
    timer_started = models.BooleanField(default=False)
    timer_expired = models.BooleanField(default=False)
    time_remaining = models.CharField(max_length=50, default='', blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Deletion tracking fields
    deleted_at = models.DateTimeField(auto_now_add=True)
    deleted_by = models.CharField(max_length=100, default='', blank=True)
    deleted_by_email = models.EmailField(default='', blank=True)
    
    DELETED_FROM_CHOICES = [
        ('Dashboard', 'Dashboard'),
        ('AssignedDashboard', 'AssignedDashboard'),
        ('Unknown', 'Unknown'),
    ]
    deleted_from = models.CharField(max_length=50, choices=DELETED_FROM_CHOICES, default='Unknown')
    original_dashboard = models.ForeignKey('DashboardData', on_delete=models.SET_NULL, null=True, blank=True)
    original_work_order_id = models.IntegerField(null=True, blank=True)
    is_permanently_deleted = models.BooleanField(default=False)
    permanently_deleted_at = models.DateTimeField(null=True, blank=True)
    restored = models.BooleanField(default=False)
    restored_at = models.DateTimeField(null=True, blank=True)
    restored_by = models.CharField(max_length=100, default='', blank=True)
    restored_by_email = models.EmailField(default='', blank=True)
    
    # Reference to parent dashboard
    dashboard = models.ForeignKey('DashboardData', on_delete=models.CASCADE, related_name='deleted_work_orders')

    class Meta:
        db_table = 'locates_deletedworkorder'
        indexes = [
            models.Index(fields=['work_order_number']),
            models.Index(fields=['-deleted_at']),
            models.Index(fields=['is_permanently_deleted']),
            models.Index(fields=['restored']),
        ]

    def __str__(self):
        return f"DeletedWorkOrder {self.work_order_number}"


class DashboardData(models.Model):
    """Main dashboard model"""
    filter_start_date = models.CharField(max_length=50, blank=True, null=True)
    filter_end_date = models.CharField(max_length=50, blank=True, null=True)
    total_work_orders = models.IntegerField(default=0)
    total_deleted_work_orders = models.IntegerField(default=0)
    total_active_deleted_work_orders = models.IntegerField(default=0)
    total_permanently_deleted_work_orders = models.IntegerField(default=0)
    scraped_at = models.DateTimeField(auto_now_add=True)
    
    # Dashboard metadata as JSON
    dashboard_metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'locates_dashboarddata'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        """Override save to update counts"""
        # Save first to ensure related objects exist
        super().save(*args, **kwargs)
        
        # Update counts
        self.total_work_orders = self.work_orders.count()
        self.total_deleted_work_orders = self.deleted_work_orders.count()
        self.total_active_deleted_work_orders = self.deleted_work_orders.filter(
            is_permanently_deleted=False, 
            restored=False
        ).count()
        self.total_permanently_deleted_work_orders = self.deleted_work_orders.filter(
            is_permanently_deleted=True
        ).count()
        
        # Save again with updated counts (avoid recursion with update)
        DashboardData.objects.filter(pk=self.pk).update(
            total_work_orders=self.total_work_orders,
            total_deleted_work_orders=self.total_deleted_work_orders,
            total_active_deleted_work_orders=self.total_active_deleted_work_orders,
            total_permanently_deleted_work_orders=self.total_permanently_deleted_work_orders
        )

    @classmethod
    def find_by_work_order_number(cls, work_order_number):
        """Find dashboard by work order number"""
        return cls.objects.filter(
            models.Q(work_orders__work_order_number=work_order_number) |
            models.Q(deleted_work_orders__work_order_number=work_order_number)
        ).first()

    def get_active_deleted_work_orders(self):
        """Get active deleted work orders"""
        return self.deleted_work_orders.filter(
            is_permanently_deleted=False,
            restored=False
        )

    def get_permanently_deleted_work_orders(self):
        """Get permanently deleted work orders"""
        return self.deleted_work_orders.filter(is_permanently_deleted=True)

    def __str__(self):
        return f"Dashboard {self.id} - {self.created_at}"