from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser # 1. Permission Import
from django.utils import timezone
from django.db.models import Count, Q
from .models import DashboardData, WorkOrder
from .serializers import DashboardDataSerializer, WorkOrderSerializer

class DashboardViewSet(viewsets.ModelViewSet):
    queryset = DashboardData.objects.all()
    serializer_class = DashboardDataSerializer
    permission_classes = [IsAuthenticated]  # 2. Added Authentication Check

    @action(detail=False, methods=['post'])
    def sync(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            dashboard = serializer.save()
            return Response({'success': True, 'message': 'Synced successfully', 'id': dashboard.id})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WorkOrderViewSet(viewsets.ModelViewSet):
    queryset = WorkOrder.objects.all()
    serializer_class = WorkOrderSerializer
    permission_classes = [IsAuthenticated]  # 3. Added Authentication Check
    
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['work_order_number', 'customer_name', 'priority_name']
    ordering_fields = ['created_at', 'workflow_status']

    # --- 1. Update Call Status (Individual) ---
    @action(detail=True, methods=['patch'], url_path='update-call-status')
    def update_call_status(self, request, pk=None):
        work_order = self.get_object()
        
        locates_called = request.data.get('locatesCalled')
        call_type = request.data.get('callType')
        called_by = request.data.get('calledBy')

        # Validation: You can uncomment this to enforce role checks
        # if request.user.role not in ['manager', 'superadmin']:
        #     return Response({'message': 'Permission denied'}, status=403)

        if locates_called is not None:
            work_order.locates_called = locates_called
        if call_type:
            work_order.call_type = call_type
        if called_by:
            work_order.called_by = called_by
        
        work_order.save()
        
        return Response({
            'success': True, 
            'message': 'Status updated', 
            'data': WorkOrderSerializer(work_order).data
        })

    # --- 2. Bulk Update Call Status ---
    @action(detail=False, methods=['post'], url_path='bulk-update-status')
    def bulk_update_status(self, request):
        ids = request.data.get('ids', [])
        call_type = request.data.get('callType')
        called_by = request.data.get('calledBy')

        if not ids or not call_type:
            return Response({'success': False, 'message': 'Missing IDs or callType'}, status=400)

        updated_count = 0
        # Filter logic: Only update work orders matching specific criteria
        work_orders = WorkOrder.objects.filter(id__in=ids)

        for wo in work_orders:
            if (wo.priority_name.upper() == 'EXCAVATOR') or wo.manually_tagged:
                wo.locates_called = True
                wo.call_type = call_type
                wo.called_by = called_by
                wo.save()
                updated_count += 1

        return Response({
            'success': True, 
            'message': f'Updated {updated_count} work orders',
            'updated_count': updated_count
        })

    # --- 3. Get Excavator Locates Needing Calls ---
    @action(detail=False, methods=['get'], url_path='needing-calls')
    def needing_calls(self, request):
        queryset = self.queryset.filter(
            Q(priority_name__iexact='EXCAVATOR', locates_called=False) |
            Q(manually_tagged=True, locates_called=False)
        )
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'total': queryset.count(), 'data': serializer.data})

    # --- 4. Cleanup Expired Locates ---
    @action(detail=False, methods=['post'], url_path='cleanup-expired')
    def cleanup_expired(self, request):
        # Note: This logic is usually handled by a background task (e.g., Celery) or Admin
        now = timezone.now()
        expired_orders = self.queryset.filter(
            locates_called=True,
            completion_date__lte=now,
            timer_expired=False
        )
        
        count = 0
        for wo in expired_orders:
            wo.timer_expired = True
            wo.workflow_status = WorkOrder.WorkflowStatus.COMPLETE
            wo.metadata['expired_at'] = str(now)
            wo.metadata['auto_moved'] = True
            wo.save()
            count += 1
            
        return Response({'success': True, 'message': f'Cleaned up {count} expired locates'})

    # --- 5. Statistics ---
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        stats = self.queryset.aggregate(
            call_needed=Count('id', filter=Q(workflow_status=WorkOrder.WorkflowStatus.CALL_NEEDED)),
            in_progress=Count('id', filter=Q(workflow_status=WorkOrder.WorkflowStatus.IN_PROGRESS)),
            complete=Count('id', filter=Q(workflow_status=WorkOrder.WorkflowStatus.COMPLETE)),
            manual_tags=Count('id', filter=Q(manually_tagged=True))
        )
        return Response({'success': True, 'data': stats})

    # --- 6. Manual Tagging ---
    @action(detail=True, methods=['post'], url_path='tag-needed')
    def tag_needed(self, request, pk=None):
        work_order = self.get_object()
        work_order.manually_tagged = True
        
        # If 'taggedBy' is not provided in the request, use the logged-in user's name
        work_order.tagged_by = request.data.get('taggedBy', request.user.name)
        work_order.priority_color = '#f97316'
        work_order.save()
        return Response({'success': True, 'message': 'Tagged successfully'})