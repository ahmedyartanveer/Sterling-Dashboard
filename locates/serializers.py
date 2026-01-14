from rest_framework import serializers
from .models import DashboardData, WorkOrder, DeletedWorkOrder

class WorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrder
        exclude = ['dashboard']  # Dashboard will be assigned automatically

class DeletedWorkOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeletedWorkOrder
        fields = '__all__'

class DashboardDataSerializer(serializers.ModelSerializer):
    work_orders = WorkOrderSerializer(many=True, read_only=True)
    deleted_work_orders = DeletedWorkOrderSerializer(many=True, read_only=True)

    class Meta:
        model = DashboardData
        fields = '__all__'

# Serializer for Sync Input (To match Swagger UI requirements)
class SyncInputSerializer(serializers.Serializer):
    filterStartDate = serializers.CharField(required=False)
    filterEndDate = serializers.CharField(required=False)
    workOrders = serializers.ListField(child=serializers.DictField())

# Serializer for Update Call Status
class UpdateCallStatusSerializer(serializers.Serializer):
    locatesCalled = serializers.BooleanField()
    callType = serializers.ChoiceField(choices=['STANDARD', 'EMERGENCY'], required=False)
    calledAt = serializers.DateTimeField(required=False)
    calledBy = serializers.CharField(required=False)
    calledByEmail = serializers.EmailField(required=False)

# Serializer for Bulk Delete
class BulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField())