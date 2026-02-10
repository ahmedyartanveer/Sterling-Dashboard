# models.py
from django.db import models


class TankRepair(models.Model):
    # Basic Identification
    work_order_id = models.PositiveIntegerField()
    work_order_number = models.CharField(max_length=50, unique=True)

    # Customer Information
    name = models.CharField(max_length=255)
    address = models.TextField()

    # Stage Tracking
    stage = models.CharField(max_length=50)
    stage_name = models.CharField(max_length=100)
    stage_color = models.CharField(max_length=20)

    # Timestamps
    created_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    # Stage 1: Job Creation Details
    stress_test = models.CharField(max_length=50, blank=True)
    stress_test_description = models.CharField(max_length=255, blank=True)
    as_built_condition = models.CharField(max_length=50, blank=True)
    rme_report = models.CharField(max_length=50, blank=True)
    rme_inspection_filed = models.BooleanField(default=False)

    # Stage 1B: More Work Needed
    needed_items = models.JSONField(default=list, blank=True)

    # Stage 2: Permitting
    permit_submitted_date = models.DateField(null=True, blank=True)
    permit_days_pending = models.PositiveIntegerField(default=0)

    # Stage 3: Approved
    approved_date = models.DateField(null=True, blank=True)
    ready_to_schedule = models.BooleanField(default=False)

    # Stage 4: Testing
    water_tightness_test = models.BooleanField(default=False)
    follow_up_report = models.BooleanField(default=False)

    # Stage 5: Completed
    completion_date = models.DateField(null=True, blank=True)

    # General Information
    notes = models.TextField(blank=True)
    assigned_to = models.CharField(max_length=100, default="Unassigned")
    priority = models.CharField(max_length=50, default="Standard")

    # Deletion Tracking
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.CharField(max_length=100, blank=True)
    deleted_by_email = models.EmailField(blank=True)
    deleted_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.work_order_number
