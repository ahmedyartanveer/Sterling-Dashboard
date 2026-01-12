from django.db import models
from django.utils import timezone
from datetime import timedelta
import json

# ===========================
# 1. Dashboard Model
# ===========================
class DashboardData(models.Model):
    filter_start_date = models.CharField(max_length=50, blank=True, null=True)
    filter_end_date = models.CharField(max_length=50, blank=True, null=True)
    total_work_orders = models.IntegerField(default=0)
    source = models.CharField(max_length=100, default='external-dashboard')
    scraped_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

# ===========================
# 2. Work Order Model
# ===========================
class WorkOrder(models.Model):
    # Relationship with Dashboard (Nested in Node, FK in Django)
    dashboard = models.ForeignKey(DashboardData, on_delete=models.CASCADE, related_name='workOrders')

    # --- Priority & Identification ---
    priority_color = models.CharField(max_length=50, default='', blank=True)
    priority_name = models.CharField(max_length=100, default='', blank=True)
    work_order_number = models.CharField(max_length=100, default='', blank=True)

    # --- Customer Info ---
    customer_po = models.CharField(max_length=100, default='', blank=True)
    customer_name = models.CharField(max_length=255, default='', blank=True)
    customer_address = models.TextField(default='', blank=True)

    # --- Tags & Notes ---
    tags = models.CharField(max_length=500, default='', blank=True)

    # --- Technician / Scheduling ---
    tech_name = models.CharField(max_length=100, default='', blank=True)
    promised_appointment = models.CharField(max_length=100, default='', blank=True)
    created_date = models.CharField(max_length=100, default='', blank=True)
    requested_date = models.CharField(max_length=100, default='', blank=True)
    completed_date_str = models.CharField(max_length=100, default='', blank=True) # Renamed to avoid conflict with completion_date logic

    # --- Task Info ---
    task = models.TextField(default='', blank=True)
    task_duration = models.CharField(max_length=100, default='', blank=True)

    # --- Purchase Info ---
    purchase_status = models.CharField(max_length=100, default='', blank=True)
    purchase_status_name = models.CharField(max_length=100, default='', blank=True)

    # --- Assignment Flags ---
    serial = models.IntegerField(default=0)
    assigned = models.BooleanField(default=False)
    dispatched = models.BooleanField(default=False)
    scheduled = models.BooleanField(default=False)
    scheduled_date = models.CharField(max_length=100, default='', blank=True)

    # --- Locate Call Tracking ---
    locates_called = models.BooleanField(default=False)
    call_type = models.CharField(max_length=50, null=True, blank=True) # STANDARD, EMERGENCY
    called_at = models.DateTimeField(null=True, blank=True)
    called_by = models.CharField(max_length=100, default='', blank=True)
    called_by_email = models.CharField(max_length=100, default='', blank=True)

    # --- Timer & Completion ---
    completion_date = models.DateTimeField(null=True, blank=True)
    timer_started = models.BooleanField(default=False)
    timer_expired = models.BooleanField(default=False)
    time_remaining = models.CharField(max_length=100, default='', blank=True)

    # --- Manual Tagging ---
    manually_tagged = models.BooleanField(default=False)
    tagged_by = models.CharField(max_length=100, default='', blank=True)
    tagged_by_email = models.CharField(max_length=100, default='', blank=True)
    tagged_at = models.DateTimeField(null=True, blank=True)

    # --- Workflow Status ---
    WORKFLOW_CHOICES = (
        ('CALL_NEEDED', 'CALL_NEEDED'),
        ('IN_PROGRESS', 'IN_PROGRESS'),
        ('COMPLETE', 'COMPLETE'),
        ('UNKNOWN', 'UNKNOWN'),
    )
    workflow_status = models.CharField(max_length=20, choices=WORKFLOW_CHOICES, default='UNKNOWN')

    # --- Classification ---
    TYPE_CHOICES = (
        ('STANDARD', 'STANDARD'),
        ('EMERGENCY', 'EMERGENCY'),
        ('EXCAVATOR', 'EXCAVATOR'),
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='STANDARD')

    # --- Metadata (JSON) ---
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['id']