# from rest_framework import serializers
# from .models import DashboardData, WorkOrder, DeletedWorkOrder

# class WorkOrderSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = WorkOrder
#         exclude = ['dashboard']  # Dashboard will be assigned automatically

# class DeletedWorkOrderSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = DeletedWorkOrder
#         fields = '__all__'

# class DashboardDataSerializer(serializers.ModelSerializer):
#     work_orders = WorkOrderSerializer(many=True, read_only=True)
#     deleted_work_orders = DeletedWorkOrderSerializer(many=True, read_only=True)

#     class Meta:
#         model = DashboardData
#         fields = '__all__'

# # Serializer for Sync Input (To match Swagger UI requirements)


# # Serializer for Update Call Status
# class UpdateCallStatusSerializer(serializers.Serializer):
#     locatesCalled = serializers.BooleanField()
#     callType = serializers.ChoiceField(choices=['STANDARD', 'EMERGENCY'], required=False)
#     calledAt = serializers.DateTimeField(required=False)
#     calledBy = serializers.CharField(required=False)
#     calledByEmail = serializers.EmailField(required=False)

# # Serializer for Bulk Delete
# class BulkDeleteSerializer(serializers.Serializer):
#     ids = serializers.ListField(child=serializers.IntegerField())
    
    


from rest_framework import serializers
from .models import DashboardData, WorkOrder, DeletedWorkOrder



class SyncInputSerializer(serializers.Serializer):
    filterStartDate = serializers.CharField(required=False)
    filterEndDate = serializers.CharField(required=False)
    workOrders = serializers.ListField(child=serializers.DictField())


class WorkOrderSerializer(serializers.ModelSerializer):
    """Serializer for WorkOrder model"""
    
    class Meta:
        model = WorkOrder
        fields = [
            'id', 'priority_color', 'priority_name', 'work_order_number',
            'customer_po', 'customer_name', 'customer_address', 'tags',
            'tech_name', 'created_date', 'requested_date', 'completed_date',
            'task', 'serial', 'scheduled_date', 'locates_called', 'call_type',
            'called_at', 'called_by', 'called_by_email', 'completion_date',
            'timer_started', 'timer_expired', 'time_remaining', 'metadata'
        ]


class DeletedWorkOrderSerializer(serializers.ModelSerializer):
    """Serializer for DeletedWorkOrder model"""
    dashboard_id = serializers.IntegerField(source='dashboard.id', read_only=True)
    dashboard_name = serializers.SerializerMethodField()
    dashboard_created_at = serializers.DateTimeField(source='dashboard.created_at', read_only=True)
    
    class Meta:
        model = DeletedWorkOrder
        fields = [
            'id', 'priority_color', 'priority_name', 'work_order_number',
            'customer_po', 'customer_name', 'customer_address', 'tags',
            'tech_name', 'created_date', 'requested_date', 'completed_date',
            'task', 'serial', 'scheduled_date', 'locates_called', 'call_type',
            'called_at', 'called_by', 'called_by_email', 'completion_date',
            'timer_started', 'timer_expired', 'time_remaining', 'metadata',
            'deleted_at', 'deleted_by', 'deleted_by_email', 'deleted_from',
            'original_dashboard', 'original_work_order_id', 'is_permanently_deleted',
            'permanently_deleted_at', 'restored', 'restored_at', 'restored_by',
            'restored_by_email', 'dashboard_id', 'dashboard_name', 'dashboard_created_at'
        ]
    
    def get_dashboard_name(self, obj):
        if obj.dashboard:
            return f"Dashboard {obj.dashboard.id}"
        return None


class DashboardDataSerializer(serializers.ModelSerializer):
    """Serializer for DashboardData model"""
    work_orders = WorkOrderSerializer(many=True, read_only=True)
    deleted_work_orders = DeletedWorkOrderSerializer(many=True, read_only=True)
    
    class Meta:
        model = DashboardData
        fields = [
            'id', 'filter_start_date', 'filter_end_date', 'work_orders',
            'deleted_work_orders', 'total_work_orders', 'total_deleted_work_orders',
            'total_active_deleted_work_orders', 'total_permanently_deleted_work_orders',
            'scraped_at', 'dashboard_metadata', 'created_at', 'updated_at'
        ]


class DashboardWithHistorySerializer(serializers.ModelSerializer):
    """Serializer for dashboard with history"""
    active_work_orders = serializers.SerializerMethodField()
    deleted_work_orders_list = serializers.SerializerMethodField()
    permanently_deleted_work_orders = serializers.SerializerMethodField()
    
    class Meta:
        model = DashboardData
        fields = [
            'id', 'filter_start_date', 'filter_end_date',
            'active_work_orders', 'deleted_work_orders_list', 'permanently_deleted_work_orders',
            'total_work_orders', 'total_deleted_work_orders',
            'total_active_deleted_work_orders', 'total_permanently_deleted_work_orders',
            'scraped_at', 'dashboard_metadata', 'created_at', 'updated_at'
        ]
    
    def get_active_work_orders(self, obj):
        return WorkOrderSerializer(obj.work_orders.all(), many=True).data
    
    def get_deleted_work_orders_list(self, obj):
        deleted_orders = obj.deleted_work_orders.filter(is_permanently_deleted=False)
        return DeletedWorkOrderSerializer(deleted_orders, many=True).data
    
    def get_permanently_deleted_work_orders(self, obj):
        perm_deleted = obj.deleted_work_orders.filter(is_permanently_deleted=True)
        return DeletedWorkOrderSerializer(perm_deleted, many=True).data


class CallStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating call status"""
    locates_called = serializers.BooleanField(required=True)
    call_type = serializers.ChoiceField(
        choices=['STANDARD', 'EMERGENCY'],
        required=False,
        allow_null=True
    )
    called_at = serializers.DateTimeField(required=False, allow_null=True)
    called_by = serializers.CharField(required=False, allow_blank=True)
    called_by_email = serializers.EmailField(required=False, allow_blank=True)


class BulkDeleteSerializer(serializers.Serializer):
    """Serializer for bulk delete operations"""
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=False
    )