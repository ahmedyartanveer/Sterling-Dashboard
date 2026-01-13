from rest_framework import serializers
from .models import DashboardData, WorkOrder

# ============================================================================
# 1. MAIN MODEL SERIALIZERS (Output & General Input)
# ============================================================================

class WorkOrderSerializer(serializers.ModelSerializer):
    # --- Map CamelCase (Frontend) to Snake_Case (Django DB) ---
    priorityColor = serializers.CharField(source='priority_color', required=False, allow_blank=True)
    priorityName = serializers.CharField(source='priority_name', required=False, allow_blank=True)
    workOrderNumber = serializers.CharField(source='work_order_number', required=False, allow_blank=True)
    
    customerPO = serializers.CharField(source='customer_po', required=False, allow_blank=True)
    customerName = serializers.CharField(source='customer_name', required=False, allow_blank=True)
    customerAddress = serializers.CharField(source='customer_address', required=False, allow_blank=True)
    
    techName = serializers.CharField(source='tech_name', required=False, allow_blank=True)
    promisedAppointment = serializers.CharField(source='promised_appointment', required=False, allow_blank=True)
    createdDate = serializers.CharField(source='created_date', required=False, allow_blank=True)
    requestedDate = serializers.CharField(source='requested_date', required=False, allow_blank=True)
    completedDate = serializers.CharField(source='completed_date_str', required=False, allow_blank=True)
    
    taskDuration = serializers.CharField(source='task_duration', required=False, allow_blank=True)
    purchaseStatus = serializers.CharField(source='purchase_status', required=False, allow_blank=True)
    purchaseStatusName = serializers.CharField(source='purchase_status_name', required=False, allow_blank=True)
    scheduledDate = serializers.CharField(source='scheduled_date', required=False, allow_blank=True)
    
    # Locates Logic
    locatesCalled = serializers.BooleanField(source='locates_called', required=False)
    callType = serializers.CharField(source='call_type', required=False, allow_null=True)
    calledAt = serializers.DateTimeField(source='called_at', required=False, allow_null=True)
    calledBy = serializers.CharField(source='called_by', required=False, allow_blank=True)
    calledByEmail = serializers.CharField(source='called_by_email', required=False, allow_blank=True)
    
    # Timer & Status
    timerStarted = serializers.BooleanField(source='timer_started', required=False)
    timerExpired = serializers.BooleanField(source='timer_expired', required=False)
    timeRemaining = serializers.CharField(source='time_remaining', read_only=True)
    
    # Tagging
    manuallyTagged = serializers.BooleanField(source='manually_tagged', required=False)
    taggedBy = serializers.CharField(source='tagged_by', required=False, allow_blank=True)
    taggedByEmail = serializers.CharField(source='tagged_by_email', required=False, allow_blank=True)
    taggedAt = serializers.DateTimeField(source='tagged_at', required=False, allow_null=True)
    
    workflowStatus = serializers.CharField(source='workflow_status', required=False)
    
    # Mongoose Compatibility: Output 'id' as '_id' if needed
    _id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = WorkOrder
        fields = [
            '_id', 'id', 'priorityColor', 'priorityName', 'workOrderNumber', 'customerPO',
            'customerName', 'customerAddress', 'tags', 'techName', 'promisedAppointment',
            'createdDate', 'requestedDate', 'completedDate', 'task', 'taskDuration',
            'purchaseStatus', 'purchaseStatusName', 'serial', 'assigned', 'dispatched',
            'scheduled', 'scheduledDate', 'locatesCalled', 'callType', 'calledAt',
            'calledBy', 'calledByEmail', 'timerStarted', 'timerExpired',
            'timeRemaining', 'manuallyTagged', 'taggedBy', 'taggedByEmail', 'taggedAt',
            'workflowStatus', 'type', 'metadata'
        ]

class DashboardDataSerializer(serializers.ModelSerializer):
    # Nested Serializer for 'workOrders' array inside Dashboard
    workOrders = WorkOrderSerializer(many=True, required=False)
    
    filterStartDate = serializers.CharField(source='filter_start_date', required=False)
    filterEndDate = serializers.CharField(source='filter_end_date', required=False)
    totalWorkOrders = serializers.IntegerField(source='total_work_orders', required=False)
    scrapedAt = serializers.DateTimeField(source='scraped_at', read_only=True)
    
    # Mongoose Compatibility
    _id = serializers.IntegerField(source='id', read_only=True)

    class Meta:
        model = DashboardData
        fields = [
            '_id', 'id', 'filterStartDate', 'filterEndDate', 
            'workOrders', 'totalWorkOrders', 'source', 
            'scrapedAt', 'created_at', 'updated_at'
        ]


# ============================================================================
# 2. SWAGGER INPUT SERIALIZERS (For Request Body Definition)
# ============================================================================

class UpdateCallStatusInputSerializer(serializers.Serializer):
    locatesCalled = serializers.BooleanField(required=True)
    callType = serializers.ChoiceField(choices=['STANDARD', 'EMERGENCY', 'standard', 'emergency'], required=False)
    calledAt = serializers.DateTimeField(required=False)
    calledBy = serializers.CharField(required=False)
    calledByEmail = serializers.EmailField(required=False)

class TagLocatesInputSerializer(serializers.Serializer):
    workOrderNumber = serializers.CharField(required=True)
    name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    tags = serializers.CharField(required=False, allow_blank=True)

class BulkTagInputSerializer(serializers.Serializer):
    workOrderNumbers = serializers.ListField(child=serializers.CharField(), required=True)
    name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    tags = serializers.CharField(required=False, allow_blank=True)

class BulkDeleteInputSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.CharField(), required=True)