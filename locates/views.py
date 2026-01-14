from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import DashboardData, WorkOrder, DeletedWorkOrder
from .serializers import (
    DashboardDataSerializer, WorkOrderSerializer, DeletedWorkOrderSerializer,
    SyncInputSerializer, UpdateCallStatusSerializer, BulkDeleteSerializer
)

class SyncDashboardView(APIView):
    permission_classes = [permissions.IsAdminUser]  # Only Superadmin/Staff

    @swagger_auto_schema(
        request_body=SyncInputSerializer,
        responses={201: DashboardDataSerializer},
        operation_description="Sync dashboard data. Filters for EXCAVATOR and deduplicates."
    )
    def post(self, request):
        data = request.data
        raw_work_orders = data.get('workOrders', [])

        # 1. Filter only EXCAVATOR
        filtered_orders = [w for w in raw_work_orders if w.get('priorityName') == "EXCAVATOR"]

        # 2. Deduplicate by workOrderNumber
        unique_orders = []
        seen = set()
        for w in filtered_orders:
            wo_num = w.get('workOrderNumber')
            if wo_num and wo_num not in seen:
                seen.add(wo_num)
                unique_orders.append(w)

        # 3. Create Dashboard Parent
        dashboard = DashboardData.objects.create(
            filter_start_date=data.get('filterStartDate'),
            filter_end_date=data.get('filterEndDate'),
            total_work_orders=len(unique_orders)
        )

        incoming_numbers = [wo.get('workOrderNumber') for wo in unique_orders if wo.get('workOrderNumber')]
        existing_numbers = set(
            WorkOrder.objects.filter(work_order_number__in=incoming_numbers)
            .values_list('work_order_number', flat=True)
        )
        # 4. Bulk Create Work Orders
        work_order_objects = []
        for wo in unique_orders:
            wo_number = wo.get('workOrderNumber', '')
            
            if wo_number in existing_numbers:
                continue 

            work_order_objects.append(
                WorkOrder(
                    dashboard=dashboard,
                    priority_color=wo.get('priorityColor', ''),
                    priority_name=wo.get('priorityName', ''),
                    work_order_number=wo_number,
                    customer_po=wo.get('customerPO', ''),
                    customer_name=wo.get('customerName', ''),
                    customer_address=wo.get('customerAddress', ''),
                    tags=wo.get('tags', ''),
                    tech_name=wo.get('techName', ''),
                    created_date=wo.get('createdDate', ''),
                    requested_date=wo.get('requestedDate', ''),
                    completed_date_str=wo.get('completedDate', ''),
                    task=wo.get('task', ''),
                    serial=wo.get('serial', 0),
                    scheduled_date=wo.get('scheduledDate', ''),
                )
            )

        if work_order_objects:
            WorkOrder.objects.bulk_create(work_order_objects)

        serializer = DashboardDataSerializer(dashboard)
        return Response({
            'success': True,
            'message': "Dashboard synced successfully",
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)


class DashboardListView(APIView):
    @swagger_auto_schema(responses={200: DashboardDataSerializer(many=True)})
    def get(self, request):
        dashboards = DashboardData.objects.all().order_by('-created_at')
        serializer = DashboardDataSerializer(dashboards, many=True)
        return Response({'success': True, 'total': len(serializer.data), 'data': serializer.data})


class WorkOrderOperationsView(APIView):
    """
    Handles Delete (Soft), Update Call Status, Manual Complete
    """

    @swagger_auto_schema(
        operation_description="Delete Work Order (Soft Delete - Move to Recycle Bin)",
        responses={200: "Work order moved to recycle bin successfully"}
    )
    def delete(self, request, pk):
        work_order = get_object_or_404(WorkOrder, pk=pk)
        dashboard = work_order.dashboard
        
        # Create Deleted Entry
        DeletedWorkOrder.objects.create(
            dashboard=dashboard,
            original_work_order_id=work_order.id,
            work_order_number=work_order.work_order_number,
            customer_name=work_order.customer_name,
            customer_address=work_order.customer_address,
            priority_name=work_order.priority_name,
            priority_color=work_order.priority_color,
            # Copy other fields as needed...
            deleted_by=request.user.username if request.user.is_authenticated else 'Unknown',
            deleted_by_email=request.user.email if request.user.is_authenticated else 'unknown@email.com',
            metadata=work_order.metadata
        )

        # Delete Original
        work_order.delete()
        dashboard.update_counts()

        return Response({'success': True, 'message': "Work order moved to recycle bin successfully"})


class UpdateCallStatusView(APIView):
    
    @swagger_auto_schema(request_body=UpdateCallStatusSerializer)
    def patch(self, request, pk):
        work_order = get_object_or_404(WorkOrder, pk=pk)
        serializer = UpdateCallStatusSerializer(data=request.data)
        
        if serializer.is_valid():
            data = serializer.validated_data
            
            work_order.locates_called = data['locatesCalled']
            work_order.call_type = data.get('callType')
            
            # User info
            user_name = request.user.username if request.user.is_authenticated else data.get('calledBy', 'Unknown')
            user_email = request.user.email if request.user.is_authenticated else data.get('calledByEmail', 'unknown@email.com')
            work_order.called_by = user_name
            work_order.called_by_email = user_email
            
            # Date Logic
            called_at_date = data.get('calledAt', timezone.now())
            work_order.called_at = called_at_date
            
            # Calculate Completion Date
            if work_order.call_type == 'EMERGENCY':
                work_order.completion_date = called_at_date + timedelta(hours=4)
            else:
                # Standard: 2 Business Days logic
                completion_date = called_at_date
                business_days = 2
                while business_days > 0:
                    completion_date += timedelta(days=1)
                    # 0=Monday, 4=Friday, 5=Saturday, 6=Sunday
                    if completion_date.weekday() < 5: 
                        business_days -= 1
                work_order.completion_date = completion_date

            work_order.workflow_status = 'IN_PROGRESS'
            work_order.timer_started = True
            
            # Update Metadata
            work_order.metadata['lastCallStatusUpdate'] = str(timezone.now())
            work_order.metadata['updatedBy'] = user_name
            
            work_order.save()
            
            return Response({
                'success': True,
                'message': 'Work order call status updated successfully',
                'data': WorkOrderSerializer(work_order).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CheckExpiredTimersView(APIView):
    def get(self, request):
        now = timezone.now()
        # Find active work orders where timer passed
        expired_orders = WorkOrder.objects.filter(
            locates_called=True,
            timer_expired=False,
            completion_date__lt=now
        )
        
        count = 0
        for wo in expired_orders:
            wo.timer_expired = True
            wo.workflow_status = 'COMPLETE'
            wo.metadata['timerExpiredAt'] = str(now)
            wo.save()
            count += 1
            
        return Response({
            'success': True, 
            'message': f"Updated {count} expired work orders",
            'expiredCount': count
        })

class RestoreWorkOrderView(APIView):
    @swagger_auto_schema(
        operation_description="Restore a deleted work order to active list",
        responses={200: "Work order restored successfully"}
    )
    def post(self, request, dashboard_id, deleted_order_id):
        deleted_wo = get_object_or_404(
            DeletedWorkOrder, 
            dashboard_id=dashboard_id, 
            id=deleted_order_id, 
            is_permanently_deleted=False
        )
        
        # Create Active Work Order from Deleted Data
        WorkOrder.objects.create(
            dashboard=deleted_wo.dashboard,
            work_order_number=deleted_wo.work_order_number,
            priority_name=deleted_wo.priority_name,
            priority_color=deleted_wo.priority_color,
            customer_name=deleted_wo.customer_name,
            customer_address=deleted_wo.customer_address,
            # ... copy other fields ...
            metadata={**deleted_wo.metadata, 'restored': True, 'restoredAt': str(timezone.now())}
        )
        
        # Remove from Deleted Table
        dashboard = deleted_wo.dashboard
        deleted_wo.delete()
        dashboard.update_counts()
        
        return Response({'success': True, 'message': "Work order restored successfully"})

class BulkDeleteView(APIView):
    @swagger_auto_schema(request_body=BulkDeleteSerializer)
    def delete(self, request):
        ids = request.data.get('ids', [])
        work_orders = WorkOrder.objects.filter(id__in=ids)
        
        count = 0
        for wo in work_orders:
            DeletedWorkOrder.objects.create(
                dashboard=wo.dashboard,
                original_work_order_id=wo.id,
                work_order_number=wo.work_order_number,
                customer_name=wo.customer_name,
                # Copy minimal fields for brevity
                deleted_at=timezone.now()
            )
            wo.delete()
            count += 1
            
        return Response({'success': True, 'message': f"{count} work orders moved to recycle bin"})