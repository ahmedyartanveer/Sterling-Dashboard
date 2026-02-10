from django.db import models


class TankRepair(models.Model):
    # Basic Identification
    work_order_id = models.PositiveIntegerField(null=True, blank=True)
    work_order_number = models.CharField(
        max_length=50, unique=True, null=True, blank=True
    )

    # Customer Information
    name = models.CharField(max_length=255, null=True, blank=True)
    address = models.TextField(null=True, blank=True)

    # Stage Tracking
    stage = models.CharField(max_length=50, null=True, blank=True)
    stage_name = models.CharField(max_length=100, null=True, blank=True)
    stage_color = models.CharField(max_length=20, null=True, blank=True)

    # Timestamps (date field – unchanged)
    created_date = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    # Stage 1: Job Creation Details
    stress_test = models.CharField(max_length=50, null=True, blank=True)
    stress_test_description = models.CharField(max_length=255, null=True, blank=True)
    as_built_condition = models.CharField(max_length=50, null=True, blank=True)
    rme_report = models.CharField(max_length=50, null=True, blank=True)
    rme_inspection_filed = models.BooleanField(null=True, blank=True)

    # Stage 1B: More Work Needed
    needed_items = models.JSONField(null=True, blank=True)

    # Stage 2: Permitting (date field – unchanged)
    permit_submitted_date = models.DateField(null=True, blank=True)
    permit_days_pending = models.PositiveIntegerField(null=True, blank=True)

    # Stage 3: Approved (date field – unchanged)
    approved_date = models.DateField(null=True, blank=True)
    ready_to_schedule = models.BooleanField(null=True, blank=True)

    # Stage 4: Testing
    water_tightness_test = models.BooleanField(null=True, blank=True)
    follow_up_report = models.BooleanField(null=True, blank=True)

    # Stage 5: Completed (date field – unchanged)
    completion_date = models.DateField(null=True, blank=True)

    # General Information
    notes = models.TextField(null=True, blank=True)
    assigned_to = models.CharField(max_length=100, null=True, blank=True)
    priority = models.CharField(max_length=50, null=True, blank=True)

    # Deletion Tracking (date field – unchanged)
    is_deleted = models.BooleanField(null=True, blank=True)
    deleted_by = models.CharField(max_length=100, null=True, blank=True)
    deleted_by_email = models.EmailField(null=True, blank=True)
    deleted_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.work_order_number or "TankRepair"
