from rest_framework import serializers
from .models import WorkOrderToday, Locates

class WorkOrderTodaySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrderToday
        fields = '__all__'

class LocatesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Locates
        fields = '__all__'

# --- Bulk Update Serializers ---

class BulkUpdatePayloadSerializer(serializers.Serializer):
    """
    Serializer to define the expected structure of the bulk update payload.
    It expects two lists: 'work_orders' and 'locates'.
    Each list contains objects with an 'id' and fields to update.
    """
    work_orders = serializers.ListField(
        child=serializers.DictField(), 
        required=False, 
        allow_empty=True,
        help_text="List of WorkOrder objects to update. Must include 'id'."
    )
    locates = serializers.ListField(
        child=serializers.DictField(), 
        required=False, 
        allow_empty=True,
        help_text="List of Locates objects to update. Must include 'id'."
    )