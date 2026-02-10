from rest_framework import serializers
from .models import WorkOrderToday, WorkOrderTodayEdit, WorkOrderSeen, Locates, LocateSeen

class WorkOrderTodaySerializer(serializers.ModelSerializer):
    is_seen = serializers.SerializerMethodField()

    class Meta:
        model = WorkOrderToday
        fields = '__all__'

    def get_is_seen(self, obj):
        user = self.context['request'].user
        return WorkOrderSeen.objects.filter(
            user=user,
            work_order=obj
        ).exists()

class LocatesSerializer(serializers.ModelSerializer):
    is_seen = serializers.SerializerMethodField()

    class Meta:
        model = Locates
        fields = '__all__'

    def get_is_seen(self, obj):
        user = self.context['request'].user
        return LocateSeen.objects.filter(
            user=user,
            locate=obj
        ).exists()


class BulkSeenSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )


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


class WorkOrderTodayEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrderTodayEdit
        fields = '__all__' 
        read_only_fields = ['created_at', 'updated_at']