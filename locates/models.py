from django.db import models
from django.utils import timezone


class WorkOrderToday(models.Model):
    # Django automatically creates an auto-incrementing integer 'id' field as the Primary Key.
    # If your interface 'id' is a specific string (like a UUID), you might want to uncomment the line below:
    # id = models.CharField(max_length=255, primary_key=True, editable=False)

    # Basic Information
    scheduled_date = models.DateTimeField(null=True, blank=True, help_text="Date the work is scheduled")
    elapsed_time = models.DateTimeField(max_length=50, null=True, blank=True, help_text="Time elapsed as a string")
    technician = models.CharField(max_length=255, null=True, blank=True, help_text="Name or ID of the technician")
    wo_number = models.CharField(max_length=100, null=True, blank=True, help_text="Work Order Number")
    
    # Address field can be long, so TextField is safer
    full_address = models.TextField(null=True, blank=True, help_text="Full address of the location")

    # Links - URLField validates the format, but CharField is safer if the input isn't a strict URL
    last_report_link = models.URLField(max_length=500, null=True, blank=True, help_text="Link to the last report")
    unlocked_report_link = models.URLField(max_length=500, null=True, blank=True, help_text="Link to the unlocked report")

    # Status Flags
    tech_report_submitted = models.BooleanField(null=True, blank=True, default=False, help_text="Has the technician report been submitted?")
    status = models.CharField(max_length=50, null=True, blank=True, help_text="Current status of the work order")
    wait_to_lock = models.BooleanField(null=True, blank=True, default=False, help_text="Flag to wait before locking")

    # Details
    reason = models.TextField(null=True, blank=True, help_text="Reason for the status or action")
    notes = models.TextField(null=True, blank=True, help_text="Additional notes")

    # Holding Information
    moved_to_holding_date = models.DateTimeField(null=True, blank=True, help_text="Date when moved to holding")
    moved_created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who moved it to holding")

    # Deletion Information
    deleted_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who deleted the record")
    deleted_by_email = models.EmailField(max_length=255, null=True, blank=True, help_text="Email of the user who deleted the record")
    deleted_date = models.DateTimeField(null=True, blank=True, help_text="Date of deletion")
    is_deleted = models.BooleanField(null=True, blank=True, default=False, help_text="Soft delete flag")

    # Completion Information
    rme_completed = models.BooleanField(null=True, blank=True, default=False, help_text="Is RME completed?")

    # Finalization Information
    finalized_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who finalized the order")
    finalized_by_email = models.EmailField(max_length=255, null=True, blank=True, help_text="Email of the user who finalized")
    finalized_date = models.DateTimeField(null=True, blank=True, help_text="Date of finalization")
    
    # Report Reference
    report_id = models.CharField(max_length=100, null=True, blank=True, help_text="Associated Report ID")
    
    is_seen = models.BooleanField(default=False, help_text="Indicates if this work order has been seen")
    

    def __str__(self):
        # Returns the WO number or ID as the string representation
        return self.wo_number or str(self.id)

    class Meta:
        verbose_name = "Work Order"
        verbose_name_plural = "Work Orders"
        ordering = ['-elapsed_time']


class Locates(models.Model):
    CALL_TYPE_CHOICES = [
        ('STANDARD', 'Standard'),
        ('EMERGENCY', 'Emergency'),
        (None, 'None'),
    ]
    
    work_order_number = models.CharField(max_length=100)
    customer_name = models.CharField(max_length=200)
    customer_address = models.TextField()
    status = models.CharField(max_length=100)
    priority_name = models.CharField(max_length=100, blank=True, null=True)
    tech_name = models.CharField(max_length=100, blank=True, null=True)
    scheduled_date = models.CharField(max_length=50, blank=True, null=True)
    created_date = models.CharField(max_length=50, blank=True, null=True)
    
    call_type = models.CharField(
        max_length=20, 
        choices=CALL_TYPE_CHOICES, 
        blank=True, 
        null=True
    )
    called_at = models.DateTimeField(blank=True, null=True)
    called_by = models.CharField(max_length=100, blank=True, null=True)
    called_by_email = models.EmailField(max_length=100, blank=True, null=True)
    locates_called = models.BooleanField(default=False)
    
    completed_at = models.DateTimeField(blank=True, null=True)
    time_remaining = models.CharField(max_length=50, blank=True, null=True)
    timer_started = models.BooleanField(default=False)
    timer_expired = models.BooleanField(default=False)
    
    # Deletion tracking
    deleted_by = models.CharField(max_length=100, blank=True, null=True)
    deleted_by_email = models.EmailField(max_length=100, blank=True, null=True)
    deleted_date = models.DateTimeField(blank=True, null=True)
    is_deleted = models.BooleanField(default=False)
    
    is_seen = models.BooleanField(default=False, help_text="Indicates if this locate record has been seen")
    
    scraped_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'locates_dashboard'
        ordering = ['-created_at']
        verbose_name = 'Locate'
        verbose_name_plural = 'Locates'

    def __str__(self):
        return f"{self.work_order_number} - {self.customer_name}"