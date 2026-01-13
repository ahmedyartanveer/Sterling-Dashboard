from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q
import datetime

# --- SWAGGER IMPORTS ---
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# --- PROJECT IMPORTS ---
# Only import Dashboard/Locates related models and serializers
from .models import DashboardData, WorkOrder
from .serializers import (
    DashboardDataSerializer, WorkOrderSerializer,
    UpdateCallStatusInputSerializer, TagLocatesInputSerializer, 
    BulkTagInputSerializer, BulkDeleteInputSerializer
)

class LocatesController(viewsets.GenericViewSet):
    """
    Handles Dashboard Sync, Work Order Management, Tagging, and Timer Logic.
    No Auth logic here.
    """
    permission_classes = [IsAuthenticated]
    queryset = DashboardData.objects.all() 
    serializer_class = DashboardDataSerializer 

    # --- 1. Sync Dashboard ---
    @swagger_auto_schema(request_body=DashboardDataSerializer)
    @action(detail=False, methods=['post'], url_path='sync-dashboard')
    def sync_dashboard(self, request):
        data = request.data
        
        # Create Dashboard Parent
        dashboard = DashboardData.objects.create(
            filter_start_date=data.get('filterStartDate'),
            filter_end_date=data.get('filterEndDate'),
            total_work_orders=data.get('totalWorkOrders', 0),
            source=data.get('source', 'external-dashboard')
        )
        
        # Create Nested Work Orders
        work_orders_data = data.get('workOrders', [])
        for wo in work_orders_data:
            WorkOrder.objects.create(
                dashboard=dashboard,
                work_order_number=wo.get('workOrderNumber', 0),
                priority_color=wo.get('priorityColor', ''),
                priority_name=wo.get('priorityName', ''),
                customer_name=wo.get('customerName', ''),
                customer_address=wo.get('customerAddress', ''),
                tags=wo.get('tags', ''),
                tech_name=wo.get('techName', ''),
                promised_appointment=wo.get('promisedAppointment', ''),
                created_date=wo.get('createdDate', ''),
                requested_date=wo.get('requestedDate', ''),
                completed_date_str=wo.get('completedDate', ''),
                task=wo.get('task', ''),
                task_duration=wo.get('taskDuration', ''),
                purchase_status=wo.get('purchaseStatus', ''),
                purchase_status_name=wo.get('purchaseStatusName', ''),
                serial=wo.get('serial', 0),
                assigned=wo.get('assigned', False),
                dispatched=wo.get('dispatched', False),
                scheduled=wo.get('scheduled', False),
                scheduled_date=wo.get('scheduledDate', '')
            )
            
        return Response({'success': True, 'message': 'Dashboard synced successfully'}, status=status.HTTP_201_CREATED)

    # --- 2. Get All Data ---
    @action(detail=False, methods=['get'], url_path='all-locates')
    def get_all_dashboard_data(self, request):
        dashboards = DashboardData.objects.all().order_by('-created_at')
        serializer = DashboardDataSerializer(dashboards, many=True)
        return Response({
            'success': True,
            'total': dashboards.count(),
            'data': serializer.data
        })

    # --- 3. Update Call Status (With Timer Logic) ---
    @swagger_auto_schema(request_body=UpdateCallStatusInputSerializer)
    @action(detail=True, methods=['patch'], url_path='update-call-status')
    def update_work_order_call_status(self, request, pk=None):
        try:
            # Note: pk here is the WorkOrder ID (Django ID)
            work_order = WorkOrder.objects.get(pk=pk)
        except WorkOrder.DoesNotExist:
            return Response({'success': False, 'message': 'Work order not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateCallStatusInputSerializer(data=request.data)
        if not serializer.is_valid():
             return Response({'success': False, 'message': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        
        # User Info (From Request or Input)
        # Assuming request.user has 'name' or 'email' fields from your Auth App
        user_name = getattr(request.user, 'name', 'Unknown Manager')
        user_email = getattr(request.user, 'email', 'unknown@email.com')

        called_by = data.get('calledBy') or user_name
        called_by_email = data.get('calledByEmail') or user_email

        # Update Basic Info
        work_order.locates_called = data['locatesCalled']
        
        call_type = data.get('callType')
        if call_type:
            work_order.call_type = call_type.upper()
            work_order.type = call_type.upper()

        work_order.called_by = called_by
        work_order.called_by_email = called_by_email
        
        called_at_date = data.get('calledAt') or timezone.now()
        work_order.called_at = called_at_date

        # --- Business Logic: Calculate Completion Date ---
        if str(call_type).upper() == 'EMERGENCY':
            # Emergency: +4 hours
            work_order.completion_date = called_at_date + datetime.timedelta(hours=4)
        else:
            # Standard: +2 Business Days (Skipping Sat/Sun)
            completion_date = called_at_date
            business_days = 2
            
            while business_days > 0:
                completion_date += datetime.timedelta(days=1)
                # 5 = Saturday, 6 = Sunday
                if completion_date.weekday() < 5:
                    business_days -= 1
            
            work_order.completion_date = completion_date

        # Update Workflow Status
        work_order.workflow_status = 'IN_PROGRESS'
        work_order.timer_started = True
        work_order.timer_expired = False
        
        # Update Metadata
        meta = work_order.metadata or {}
        meta['lastCallStatusUpdate'] = str(timezone.now())
        meta['updatedBy'] = called_by
        meta['updatedByEmail'] = called_by_email
        work_order.metadata = meta
        
        work_order.save()
        
        return Response({
            'success': True,
            'message': 'Work order call status updated successfully',
            'data': {
                'workOrder': WorkOrderSerializer(work_order).data
            }
        })

    # --- 4. Tag Locates Needed ---
    @swagger_auto_schema(request_body=TagLocatesInputSerializer)
    @action(detail=False, methods=['post'], url_path='tag-locates-needed')
    def tag_locates_needed(self, request):
        serializer = TagLocatesInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'message': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        wo_number = data['workOrderNumber']
        
        work_order = WorkOrder.objects.filter(work_order_number=wo_number).first()
        if not work_order:
             return Response({'success': False, 'message': f'Work order {wo_number} not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Tagging Logic
        work_order.manually_tagged = True
        work_order.tagged_by = data['name']
        work_order.tagged_by_email = data['email']
        work_order.tagged_at = timezone.now()
        
        work_order.priority_name = 'EXCAVATOR'
        work_order.priority_color = 'rgb(255, 102, 204)' # Pink Color
        work_order.type = 'EXCAVATOR'
        work_order.workflow_status = 'CALL_NEEDED'
        
        # Append Tags
        new_tags = data.get('tags', '')
        current_tags = work_order.tags or ''
        
        if new_tags:
            work_order.tags = f"{current_tags}, {new_tags}".strip(', ')
        elif 'Locates Needed' not in current_tags:
            work_order.tags = f"{current_tags}, Locates Needed".strip(', ')
            
        # Metadata
        meta = work_order.metadata or {}
        meta['manuallyTaggedAt'] = str(timezone.now())
        meta['tagAddedBy'] = data['name']
        work_order.metadata = meta

        work_order.save()
        
        return Response({
            'success': True,
            'message': f"Work order {wo_number} tagged successfully",
            'data': WorkOrderSerializer(work_order).data
        })

    # --- 5. Bulk Tag ---
    @swagger_auto_schema(request_body=BulkTagInputSerializer)
    @action(detail=False, methods=['post'], url_path='bulk-tag-locates-needed')
    def bulk_tag_locates_needed(self, request):
        serializer = BulkTagInputSerializer(data=request.data)
        if not serializer.is_valid(): 
            return Response({'success': False, 'message': str(serializer.errors)}, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        results = {'successful': [], 'failed': []}
        
        for wo_number in data['workOrderNumbers']:
            work_order = WorkOrder.objects.filter(work_order_number=wo_number).first()
            if not work_order:
                results['failed'].append({'workOrderNumber': wo_number, 'reason': 'Not Found'})
                continue
            
            # Apply same tagging logic
            work_order.manually_tagged = True
            work_order.tagged_by = data['name']
            work_order.tagged_by_email = data['email']
            work_order.tagged_at = timezone.now()
            work_order.priority_name = 'EXCAVATOR'
            work_order.priority_color = 'rgb(255, 102, 204)'
            work_order.type = 'EXCAVATOR'
            work_order.workflow_status = 'CALL_NEEDED'
            
            if data.get('tags'):
                work_order.tags = f"{work_order.tags}, {data['tags']}".strip(', ')
            elif 'Locates Needed' not in (work_order.tags or ''):
                work_order.tags = f"{work_order.tags or ''}, Locates Needed".strip(', ')
            
            work_order.save()
            results['successful'].append({'workOrderNumber': wo_number})
            
        return Response({
            'success': True,
            'message': f"Bulk tagging completed: {len(results['successful'])} success, {len(results['failed'])} failed",
            'data': results
        })

    # --- 6. Delete Single Work Order ---
    @action(detail=True, methods=['delete'], url_path='work-order')
    def delete_work_order(self, request, pk=None):
        try:
            work_order = WorkOrder.objects.get(pk=pk)
            # Update parent total count before delete
            dashboard = work_order.dashboard
            work_order.delete()
            
            # Recalculate total
            dashboard.total_work_orders = dashboard.workOrders.count()
            dashboard.save()
            
            return Response({'success': True, 'message': 'Work order deleted successfully'})
        except WorkOrder.DoesNotExist:
            return Response({'success': False, 'message': 'Work order not found'}, status=status.HTTP_404_NOT_FOUND)

    # --- 7. Bulk Delete ---
    @swagger_auto_schema(request_body=BulkDeleteInputSerializer)
    @action(detail=False, methods=['delete'], url_path='work-order/bulk-delete')
    def bulk_delete_work_orders(self, request):
        ids = request.data.get('ids', [])
        if not ids: 
            return Response({'success': False, 'message': 'IDs required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get dashboards affected to update counts later
        affected_dashboards_ids = WorkOrder.objects.filter(id__in=ids).values_list('dashboard_id', flat=True).distinct()
        
        deleted_count, _ = WorkOrder.objects.filter(id__in=ids).delete()
        
        # Update counts
        for d_id in affected_dashboards_ids:
            dash = DashboardData.objects.get(id=d_id)
            dash.total_work_orders = dash.workOrders.count()
            dash.save()
        
        return Response({'success': True, 'message': f"{deleted_count} work order(s) deleted successfully"})

    # --- 8. Check Expired Timers ---
    @action(detail=False, methods=['get'], url_path='check-expired-timers')
    def check_expired_timers(self, request):
        now = timezone.now()
        
        # Query: Called + Not Expired + Completion Date Passed
        expired_orders = WorkOrder.objects.filter(
            locates_called=True,
            timer_expired=False,
            completion_date__lt=now
        )
        
        count = 0
        for wo in expired_orders:
            wo.timer_expired = True
            wo.workflow_status = 'COMPLETE'
            
            meta = wo.metadata or {}
            meta['timerExpiredAt'] = str(now)
            meta['autoUpdatedAt'] = str(now)
            wo.metadata = meta
            
            wo.save()
            count += 1
            
        return Response({
            'success': True,
            'message': f"Updated {count} expired work orders",
            'expiredCount': count
        })
        
    # --- 9. Get By Number ---
    @action(detail=False, methods=['get'], url_path='work-order/(?P<wo_number>[^/.]+)')
    def get_by_number(self, request, wo_number=None):
        wo = WorkOrder.objects.filter(work_order_number=wo_number).first()
        if not wo:
             return Response({'success': False, 'message': 'Not Found'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'success': True, 'data': WorkOrderSerializer(wo).data})