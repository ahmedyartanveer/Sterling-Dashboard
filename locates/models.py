from django.db import models
from django.utils import timezone
from datetime import timedelta
import math

class DashboardData(models.Model):
    filter_start_date = models.DateTimeField(blank=True, null=True)
    filter_end_date = models.DateTimeField(blank=True, null=True)
    dispatch_date = models.DateTimeField(blank=True, null=True)
    total_work_orders = models.IntegerField(default=0)
    source = models.CharField(max_length=100, default='external-dashboard')
    scraped_at = models.DateTimeField(default=timezone.now)
    dashboard_metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Dashboard {self.id} - {self.scraped_at}"


class WorkOrder(models.Model):
    # Enums
    class CallType(models.TextChoices):
        STANDARD = 'STANDARD', 'Standard'
        EMERGENCY = 'EMERGENCY', 'Emergency'

    class WorkflowStatus(models.TextChoices):
        CALL_NEEDED = 'CALL_NEEDED', 'Call Needed'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETE = 'COMPLETE', 'Complete'
        UNKNOWN = 'UNKNOWN', 'Unknown'

    class PriorityName(models.TextChoices):
        EXCAVATOR = 'EXCAVATOR', 'Excavator'
        # Add others if needed

    # Relationships
    dashboard = models.ForeignKey(DashboardData, related_name='work_orders', on_delete=models.CASCADE)

    # Basic Fields
    priority_color = models.CharField(max_length=50, default='', blank=True)
    priority_name = models.CharField(max_length=100, default='', blank=True)
    work_order_number = models.CharField(max_length=100, db_index=True)
    customer_po = models.CharField(max_length=100, default='', blank=True)
    customer_name = models.CharField(max_length=255, default='', blank=True)
    customer_address = models.TextField(default='', blank=True)
    tags = models.CharField(max_length=255, default='', blank=True)
    tech_name = models.CharField(max_length=100, default='', blank=True)
    technician = models.CharField(max_length=100, default='', blank=True)
    promised_appointment = models.CharField(max_length=100, default='', blank=True)
    created_date = models.CharField(max_length=100, default='', blank=True)
    requested_date = models.CharField(max_length=100, default='', blank=True)
    completed_date_str = models.CharField(max_length=100, default='', blank=True) # String representation from scrape
    task = models.TextField(default='', blank=True)
    task_duration = models.CharField(max_length=50, default='', blank=True)
    purchase_status = models.CharField(max_length=100, default='', blank=True)
    purchase_status_name = models.CharField(max_length=100, default='', blank=True)

    # New Added Fields
    serial = models.IntegerField(default=0)
    assigned = models.BooleanField(default=False)
    dispatched = models.BooleanField(default=False)
    scheduled = models.BooleanField(default=False)
    scheduled_date = models.CharField(max_length=100, default='', blank=True)

    # Locate Call Tracking
    locates_called = models.BooleanField(default=False, help_text='Indicates if utility locates have been called in')
    call_type = models.CharField(max_length=20, choices=CallType.choices, null=True, blank=True)
    called_at = models.DateTimeField(null=True, blank=True)
    called_by = models.CharField(max_length=100, default='', blank=True)

    # Three-Stage Workflow
    completion_date = models.DateTimeField(null=True, blank=True, help_text='Date/Time when timer expires')
    manually_tagged = models.BooleanField(default=False)
    tagged_by = models.CharField(max_length=100, default='', blank=True)
    tagged_at = models.DateTimeField(null=True, blank=True)
    timer_started = models.BooleanField(default=False)
    timer_expired = models.BooleanField(default=False)
    
    workflow_status = models.CharField(
        max_length=20, 
        choices=WorkflowStatus.choices, 
        default=WorkflowStatus.UNKNOWN
    )
    
    metadata = models.JSONField(default=dict, blank=True)
    type = models.CharField(max_length=50, default='STANDARD')

    class Meta:
        ordering = ['-id']
        indexes = [
            models.Index(fields=['priority_name']),
            models.Index(fields=['locates_called']),
            models.Index(fields=['workflow_status']),
            models.Index(fields=['completion_date']),
        ]

    def save(self, *args, **kwargs):
        # 1. Auto-set type based on priority
        if self.priority_name and self.priority_name.upper() == 'EXCAVATOR':
            self.type = 'EXCAVATOR'
            if not self.pk and not self.locates_called: # New instance
                self.locates_called = False

        # 2. Auto-set requestedDate
        if self.created_date and not self.requested_date:
            self.requested_date = self.created_date

        # 3. Auto-set timestamps
        if self.locates_called and not self.called_at:
            self.called_at = timezone.now()
        
        if self.manually_tagged and not self.tagged_at:
            self.tagged_at = timezone.now()

        # 4. Calculate Completion Date (Business Logic)
        if self.call_type and self.called_at:
            # Check if call_type or called_at changed (simple check)
            if self.call_type == self.CallType.EMERGENCY:
                # Emergency: 4 hours
                self.completion_date = self.called_at + timedelta(hours=4)
            else:
                # Standard: 2 Business Days
                completion_dt = self.called_at
                business_days = 2
                while business_days > 0:
                    completion_dt += timedelta(days=1)
                    # 5=Saturday, 6=Sunday (Python weekday is 0=Mon, 6=Sun)
                    if completion_dt.weekday() < 5: 
                        business_days -= 1
                self.completion_date = completion_dt
            
            self.timer_started = True
            self.timer_expired = False

        # 5. Check Timer Expiry
        if self.completion_date:
            now = timezone.now()
            self.timer_expired = self.completion_date <= now

        # 6. Update Workflow Status
        self.update_workflow_status()

        super().save(*args, **kwargs)

    def update_workflow_status(self):
        is_excavator = self.priority_name and self.priority_name.upper() == 'EXCAVATOR'
        
        if self.manually_tagged or (is_excavator and not self.locates_called):
            self.workflow_status = self.WorkflowStatus.CALL_NEEDED
        elif self.locates_called and self.timer_started and not self.timer_expired:
            self.workflow_status = self.WorkflowStatus.IN_PROGRESS
        elif self.locates_called and self.timer_expired:
            self.workflow_status = self.WorkflowStatus.COMPLETE
        else:
            self.workflow_status = self.WorkflowStatus.UNKNOWN

    @property
    def time_remaining(self):
        if not self.completion_date or self.timer_expired:
            return "Expired"
        
        now = timezone.now()
        diff = self.completion_date - now
        
        if self.call_type == self.CallType.EMERGENCY:
            hours = diff.seconds // 3600
            minutes = (diff.seconds % 3600) // 60
            return f"{hours}h {minutes}m"
        else:
            days = diff.days
            if days == 0:
                # If less than 1 day but standard, show hours
                hours = diff.seconds // 3600
                return f"{hours} hours"
            return f"{days} business day{'s' if days != 1 else ''}"