from rest_framework import serializers
from .models import DashboardData, WorkOrder

class WorkOrderSerializer(serializers.ModelSerializer):
    time_remaining = serializers.ReadOnlyField() # Calculated field from model property

    class Meta:
        model = WorkOrder
        fields = '__all__'
        read_only_fields = ['id', 'workflow_status', 'timer_expired', 'timer_started', 'completion_date']

class DashboardDataSerializer(serializers.ModelSerializer):
    # Nested serializer to show work orders inside dashboard
    work_orders = WorkOrderSerializer(many=True, read_only=True)

    class Meta:
        model = DashboardData
        fields = '__all__'