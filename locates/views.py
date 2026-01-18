from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Q
from django.core.paginator import Paginator
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django_filters import FilterSet

from .models import DashboardData, WorkOrder, DeletedWorkOrder, WorkOrderToday
from .serializers import (
    DashboardDataSerializer, WorkOrderSerializer, DeletedWorkOrderSerializer,
    DashboardWithHistorySerializer, CallStatusUpdateSerializer, BulkDeleteSerializer, WorkOrderTodaySerializer
)


class WorkOrderTodayFilter(FilterSet):
    class Meta:
        model = WorkOrderToday
        fields = {
            # --- ID & Numbers ---
            'id': ['exact'],
            'wo_number': ['exact', 'icontains'],
            'report_id': ['exact', 'icontains'],

            # --- Basic Info ---
            'technician': ['exact', 'icontains'],
            'full_address': ['icontains'],  # Address usually needs partial search
            
            # --- URLs (Critical for NULL check) ---
            'last_report_link': ['exact', 'isnull'],
            'unlocked_report_link': ['exact', 'isnull'],

            # --- Status & Booleans ---
            'status': ['exact', 'icontains'],
            'tech_report_submitted': ['exact'],
            'wait_to_lock': ['exact'],
            'is_deleted': ['exact'],
            'rme_completed': ['exact'],

            # --- Dates (Range/Time filtering) ---
            'scheduled_date': ['exact', 'gte', 'lte', 'isnull', 'range'],
            'elapsed_time': ['exact', 'gte', 'lte', 'isnull'], # Assuming DateTimeField based on your model
            'moved_to_holding_date': ['exact', 'gte', 'lte', 'isnull'],
            'deleted_date': ['exact', 'gte', 'lte', 'isnull'],
            'finalized_date': ['exact', 'gte', 'lte', 'isnull'],

            # --- Details & Text ---
            'reason': ['icontains'],
            'notes': ['icontains'],

            # --- Audit / User Info ---
            'moved_created_by': ['exact', 'icontains'],
            'deleted_by': ['exact', 'icontains'],
            'deleted_by_email': ['exact', 'icontains'],
            'finalized_by': ['exact', 'icontains'],
            'finalized_by_email': ['exact', 'icontains'],
        }

class WorkOrderTodayViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing WorkOrderToday instances.
    Provides automatic list, create, retrieve, update, and destroy actions.
    """
    queryset = WorkOrderToday.objects.all()
    serializer_class = WorkOrderTodaySerializer

    # Setup for filtering, searching, and ordering
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = WorkOrderTodayFilter
    search_fields = ['wo_number', 'full_address', 'technician', 'notes']
    ordering_fields = '__all__'
    ordering = ['-scheduled_date']

    def create(self, request, *args, **kwargs):
        """
        Custom create method to filter out duplicates before saving.
        Supports both single object and list of objects (Bulk Create).
        """
        incoming_data = request.data

        # 1. Check if data is a list (Bulk Create)
        if isinstance(incoming_data, list):
            unique_data = []
            seen = set()

            for w in incoming_data:
                # Get the work order number (Assuming the field name is 'wo_number')
                # If your input JSON uses 'workOrderNumber', change this line accordingly.
                wo_number = w.get('wo_number') 

                # Skip if no wo_number is provided
                if not wo_number:
                    continue

                # Skip if already seen in the current batch (Current request check)
                if wo_number in seen:
                    continue

                # Skip if already exists in the database (Database check)
                if WorkOrderToday.objects.filter(wo_number=wo_number).exists():
                    continue

                seen.add(wo_number)
                unique_data.append(w)

            # If there is valid data left after filtering
            if unique_data:
                serializer = self.get_serializer(data=unique_data, many=True)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(
                    {"message": "All items were duplicates or invalid."},
                    status=status.HTTP_200_OK
                )

        # 2. If data is a single object (Normal Create)
        else:
            # Check for duplicates for single post as well
            wo_number = incoming_data.get('wo_number')
            if wo_number and WorkOrderToday.objects.filter(wo_number=wo_number).exists():
                return Response(
                    {"message": f"WorkOrder {wo_number} already exists."},
                    status=status.HTTP_409_CONFLICT
                )
            
            return super().create(request, *args, **kwargs)

@api_view(['POST'])
def sync_dashboard(request):
    """Sync dashboard from scraper"""
    try:
        # Get data from request body
        data = request.data
        
        # Validate required fields
        if 'workOrders' not in data:
            return Response({
                'success': False,
                'message': 'work_orders field is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        workOrders = data.get('workOrders', [])
        
        # Deduplicate by workOrderNumber and check database
        unique = []
        seen = set()
        
        for w in workOrders:
            wo_number = w.get('workOrderNumber')
            
            # Skip if no workOrderNumber
            if not wo_number:
                continue
            
            # Skip if already seen in current batch
            if wo_number in seen:
                continue
            
            # Skip if already exists in database
            if WorkOrder.objects.filter(work_order_number=wo_number).exists():
                continue
            
            seen.add(wo_number)
            unique.append(w)
        
        # Check if there are any work orders after filtering and deduplication
        if not unique:
            return Response({
                'success': False,
                'message': 'No new unique EXCAVATOR work orders found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create dashboard only if work orders exist
        dashboard = DashboardData.objects.create(
            filter_start_date=data.get('filterStartDate', ''),
            filter_end_date=data.get('filterEndDate', ''),
        )
        
        # Create work orders
        for wo_data in unique:
            WorkOrder.objects.create(
                dashboard=dashboard,
                priority_color=wo_data.get('priorityColor', ''),
                priority_name=wo_data.get('priorityName', ''),
                work_order_number=wo_data.get('workOrderNumber', ''),
                customer_po=wo_data.get('customerPO', ''),
                customer_name=wo_data.get('customerName', ''),
                customer_address=wo_data.get('customerAddress', ''),
                tags=wo_data.get('tags', ''),
                tech_name=wo_data.get('techName', ''),
                created_date=wo_data.get('createdDate', ''),
                task=wo_data.get('task', ''),
                scheduled_date=wo_data.get('scheduledDate', ''),
            )
        
        dashboard.save()  # Trigger count updates
        
        serializer = DashboardDataSerializer(dashboard)
        return Response({
            'success': True,
            'message': f'Dashboard synced successfully with {len(unique)} new work orders',
            'data': serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def sync_assigned_dashboard(request):
    """Sync assigned dashboard from scraper"""
    try:
        # Call your scraper service
        # data = assigned_locates_dispatch_board()
        
        # For now, return placeholder
        data = {
            'work_orders': [],
            'filter_start_date': '',
            'filter_end_date': ''
        }
        
        if isinstance(data.get('work_orders'), list):
            filtered = [w for w in data['work_orders'] if w.get('priority_name') == 'EXCAVATOR']
            
            seen = set()
            unique = []
            
            for w in filtered:
                wo_number = w.get('work_order_number')
                if wo_number and wo_number not in seen:
                    seen.add(wo_number)
                    unique.append(w)
            
            # Create dashboard
            dashboard = DashboardData.objects.create(
                filter_start_date=data.get('filter_start_date', ''),
                filter_end_date=data.get('filter_end_date', ''),
            )
            
            # Create work orders
            for wo_data in unique:
                WorkOrder.objects.create(
                    dashboard=dashboard,
                    **wo_data
                )
            
            dashboard.save()
            
            serializer = DashboardDataSerializer(dashboard)
            return Response({
                'success': True,
                'message': 'Dashboard synced successfully',
                'data': serializer.data
            })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_dashboard_data(request):
    """Get all dashboard data"""
    try:
        data = DashboardData.objects.all().order_by('-created_at')
        serializer = DashboardDataSerializer(data, many=True)
        
        return Response({
            'success': True,
            'total': data.count(),
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_work_order(request, id):
    """Delete a single work order (move to recycle bin)"""
    try:
        work_order = WorkOrder.objects.filter(id=id).first()
        
        if not work_order:
            return Response({
                'success': False,
                'message': 'Work order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        dashboard = work_order.dashboard
        
        # Create deleted work order
        deleted_wo = DeletedWorkOrder.objects.create(
            dashboard=dashboard,
            priority_color=work_order.priority_color,
            priority_name=work_order.priority_name,
            work_order_number=work_order.work_order_number,
            customer_po=work_order.customer_po,
            customer_name=work_order.customer_name,
            customer_address=work_order.customer_address,
            tags=work_order.tags,
            tech_name=work_order.tech_name,
            created_date=work_order.created_date,
            requested_date=work_order.requested_date,
            completed_date=work_order.completed_date,
            task=work_order.task,
            serial=work_order.serial,
            scheduled_date=work_order.scheduled_date,
            locates_called=work_order.locates_called,
            call_type=work_order.call_type,
            called_at=work_order.called_at,
            called_by=work_order.called_by,
            called_by_email=work_order.called_by_email,
            completion_date=work_order.completion_date,
            timer_started=work_order.timer_started,
            timer_expired=work_order.timer_expired,
            time_remaining=work_order.time_remaining,
            metadata=work_order.metadata,
            deleted_by=request.user.get_full_name() or request.user.name,
            deleted_by_email=request.user.email,
            deleted_from='Dashboard',
            is_permanently_deleted=False,
            original_work_order_id=work_order.id
        )
        
        # Delete original work order
        work_order.delete()
        
        # Update dashboard counts
        dashboard.save()
        
        return Response({
            'success': True,
            'message': 'Work order moved to recycle bin successfully',
            'data': {
                'dashboard': DashboardDataSerializer(dashboard).data,
                'deleted_work_order': DeletedWorkOrderSerializer(deleted_wo).data
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def bulk_delete_work_orders(request):
    """Bulk delete work orders"""
    try:
        serializer = BulkDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Please provide an array of work order IDs'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ids = serializer.validated_data['ids']
        
        work_orders = WorkOrder.objects.filter(id__in=ids).select_related('dashboard')
        
        if not work_orders.exists():
            return Response({
                'success': False,
                'message': 'No matching work orders found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        deleted_count = 0
        dashboards_to_update = set()
        
        for work_order in work_orders:
            dashboard = work_order.dashboard
            dashboards_to_update.add(dashboard.id)
            
            # Create deleted work order
            DeletedWorkOrder.objects.create(
                dashboard=dashboard,
                priority_color=work_order.priority_color,
                priority_name=work_order.priority_name,
                work_order_number=work_order.work_order_number,
                customer_po=work_order.customer_po,
                customer_name=work_order.customer_name,
                customer_address=work_order.customer_address,
                tags=work_order.tags,
                tech_name=work_order.tech_name,
                created_date=work_order.created_date,
                requested_date=work_order.requested_date,
                completed_date=work_order.completed_date,
                task=work_order.task,
                serial=work_order.serial,
                scheduled_date=work_order.scheduled_date,
                locates_called=work_order.locates_called,
                call_type=work_order.call_type,
                called_at=work_order.called_at,
                called_by=work_order.called_by,
                called_by_email=work_order.called_by_email,
                completion_date=work_order.completion_date,
                timer_started=work_order.timer_started,
                timer_expired=work_order.timer_expired,
                time_remaining=work_order.time_remaining,
                metadata=work_order.metadata,
                deleted_by=request.user.get_full_name() or request.user.name,
                deleted_by_email=request.user.email,
                deleted_from='Dashboard',
                is_permanently_deleted=False,
                original_work_order_id=work_order.id
            )
            deleted_count += 1
        
        # Delete work orders
        work_orders.delete()
        
        # Update dashboard counts
        for dashboard_id in dashboards_to_update:
            dashboard = DashboardData.objects.get(id=dashboard_id)
            dashboard.save()
        
        return Response({
            'success': True,
            'message': f'{deleted_count} work order(s) moved to recycle bin successfully',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_work_order_call_status(request, id):
    """Update work order call status"""
    try:
        serializer = CallStatusUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        work_order = WorkOrder.objects.filter(id=id).first()
        
        if not work_order:
            return Response({
                'success': False,
                'message': 'Work order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        data = serializer.validated_data
        called_by_name = request.user.get_full_name() or request.user.name or data.get('called_by', 'Unknown Manager')
        called_by_email = request.user.email or data.get('called_by_email', 'unknown@email.com')
        
        work_order.locates_called = data['locates_called']
        
        if 'call_type' in data and data['call_type']:
            work_order.call_type = data['call_type'].upper()
        
        work_order.called_by = called_by_name
        work_order.called_by_email = called_by_email
        
        called_at_date = data.get('called_at') or timezone.now()
        work_order.called_at = called_at_date
        
        # Calculate completion date
        if work_order.call_type == 'EMERGENCY':
            work_order.completion_date = called_at_date + timedelta(hours=4)
        else:
            completion_date = called_at_date
            business_days = 2
            
            while business_days > 0:
                completion_date += timedelta(days=1)
                if completion_date.weekday() < 5:  # Monday = 0, Sunday = 6
                    business_days -= 1
            
            work_order.completion_date = completion_date
        
        work_order.timer_started = True
        work_order.timer_expired = False
        
        if not work_order.metadata:
            work_order.metadata = {}
        
        work_order.metadata.update({
            'last_call_status_update': timezone.now().isoformat(),
            'updated_by': called_by_name,
            'updated_by_email': called_by_email,
            'updated_at': timezone.now().isoformat()
        })
        
        work_order.save()
        
        return Response({
            'success': True,
            'message': 'Work order call status updated successfully',
            'data': {
                'work_order': WorkOrderSerializer(work_order).data,
                'updates': {
                    'locates_called': work_order.locates_called,
                    'call_type': work_order.call_type,
                    'called_at': work_order.called_at,
                    'called_by': work_order.called_by,
                    'called_by_email': work_order.called_by_email,
                    'completion_date': work_order.completion_date,
                }
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_and_update_expired_timers(request):
    """Check and update expired timers"""
    try:
        now = timezone.now()
        
        work_orders = WorkOrder.objects.filter(
            locates_called=True,
            timer_expired=False,
            completion_date__lt=now
        )
        
        expired_count = 0
        
        for work_order in work_orders:
            work_order.timer_expired = True
            
            if not work_order.metadata:
                work_order.metadata = {}
            
            work_order.metadata.update({
                'timer_expired_at': now.isoformat(),
                'auto_updated_at': now.isoformat()
            })
            
            work_order.save()
            expired_count += 1
        
        return Response({
            'success': True,
            'message': f'Updated {expired_count} expired work orders',
            'expired_count': expired_count
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_work_order_by_number(request, work_order_number):
    """Get work order by number"""
    try:
        work_order = WorkOrder.objects.filter(
            work_order_number=str(work_order_number)
        ).first()
        
        if not work_order:
            return Response({
                'success': False,
                'message': f'Work order {work_order_number} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        return Response({
            'success': True,
            'data': WorkOrderSerializer(work_order).data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def complete_work_order_manually(request, id):
    """Complete work order manually"""
    try:
        work_order = WorkOrder.objects.filter(id=id).first()
        
        if not work_order:
            return Response({
                'success': False,
                'message': 'Work order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        work_order.timer_expired = False
        work_order.timer_started = False
        
        if not work_order.metadata:
            work_order.metadata = {}
        
        work_order.metadata.update({
            'completed_manually': True,
            'completed_at': timezone.now().isoformat(),
            'completed_by': request.user.get_full_name() or request.user.name,
            'completed_by_email': request.user.email
        })
        
        work_order.completion_date = timezone.now()
        work_order.save()
        
        return Response({
            'success': True,
            'message': 'Work order marked as COMPLETE successfully',
            'data': WorkOrderSerializer(work_order).data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_deleted_history(request):
    """Get deleted work orders history"""
    try:
        page = int(request.GET.get('page', 1))
        limit = int(request.GET.get('limit', 20))
        search = request.GET.get('search', '')
        
        # Get all deleted work orders
        queryset = DeletedWorkOrder.objects.filter(
            is_permanently_deleted=False
        ).select_related('dashboard').order_by('-deleted_at')
        
        # Apply search filter
        if search:
            queryset = queryset.filter(
                Q(work_order_number__icontains=search) |
                Q(customer_name__icontains=search) |
                Q(customer_address__icontains=search) |
                Q(deleted_by__icontains=search)
            )
        
        # Paginate
        paginator = Paginator(queryset, limit)
        page_obj = paginator.get_page(page)
        
        serializer = DeletedWorkOrderSerializer(page_obj, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'pagination': {
                'current_page': page,
                'total_pages': paginator.num_pages,
                'total_records': paginator.count,
                'limit': limit
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_with_history(request, id):
    """Get dashboard with history"""
    try:
        dashboard = DashboardData.objects.filter(id=id).first()
        
        if not dashboard:
            return Response({
                'success': False,
                'message': 'Dashboard not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = DashboardWithHistorySerializer(dashboard)
        
        return Response({
            'success': True,
            'data': {
                'dashboard': serializer.data,
                'active_work_orders': serializer.data['active_work_orders'],
                'deleted_work_orders': serializer.data['deleted_work_orders_list'],
                'permanently_deleted_work_orders': serializer.data['permanently_deleted_work_orders']
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_work_order(request, dashboard_id, deleted_order_id):
    """Restore a deleted work order"""
    try:
        dashboard = DashboardData.objects.filter(id=dashboard_id).first()
        
        if not dashboard:
            return Response({
                'success': False,
                'message': 'Dashboard not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        deleted_order = DeletedWorkOrder.objects.filter(
            Q(id=deleted_order_id) | Q(original_work_order_id=deleted_order_id),
            dashboard=dashboard,
            is_permanently_deleted=False
        ).first()
        
        if not deleted_order:
            return Response({
                'success': False,
                'message': 'Deleted work order not found or already permanently deleted'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Create restored work order
        restored_wo = WorkOrder.objects.create(
            dashboard=dashboard,
            priority_color=deleted_order.priority_color,
            priority_name=deleted_order.priority_name,
            work_order_number=deleted_order.work_order_number,
            customer_po=deleted_order.customer_po,
            customer_name=deleted_order.customer_name,
            customer_address=deleted_order.customer_address,
            tags=deleted_order.tags,
            tech_name=deleted_order.tech_name,
            created_date=deleted_order.created_date,
            requested_date=deleted_order.requested_date,
            completed_date=deleted_order.completed_date,
            task=deleted_order.task,
            serial=deleted_order.serial,
            scheduled_date=deleted_order.scheduled_date,
            locates_called=deleted_order.locates_called,
            call_type=deleted_order.call_type,
            called_at=deleted_order.called_at,
            called_by=deleted_order.called_by,
            called_by_email=deleted_order.called_by_email,
            completion_date=deleted_order.completion_date,
            timer_started=deleted_order.timer_started,
            timer_expired=deleted_order.timer_expired,
            time_remaining=deleted_order.time_remaining,
            metadata={
                **deleted_order.metadata,
                'restored': True,
                'restored_at': timezone.now().isoformat(),
                'restored_by': request.user.get_full_name() or request.user.name,
                'restored_by_email': request.user.email
            }
        )
        
        # Delete from deleted work orders
        deleted_order.delete()
        
        # Update dashboard counts
        dashboard.save()
        
        return Response({
            'success': True,
            'message': 'Work order restored successfully',
            'data': {
                'dashboard': DashboardDataSerializer(dashboard).data,
                'restored_work_order': WorkOrderSerializer(restored_wo).data
            }
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permanently_delete_from_history(request, dashboard_id, deleted_order_id):
    """Permanently delete from history"""
    try:
        dashboard = DashboardData.objects.filter(id=dashboard_id).first()
        
        if not dashboard:
            return Response({
                'success': False,
                'message': 'Dashboard not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        deleted_order = DeletedWorkOrder.objects.filter(
            Q(id=deleted_order_id) | Q(original_work_order_id=deleted_order_id),
            dashboard=dashboard
        ).first()
        
        if not deleted_order:
            return Response({
                'success': False,
                'message': 'Deleted work order not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        deleted_data = DeletedWorkOrderSerializer(deleted_order).data
        deleted_order.delete()
        
        dashboard.save()
        
        return Response({
            'success': True,
            'message': 'Work order permanently deleted from database',
            'data': deleted_data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def bulk_permanently_delete(request):
    """Bulk permanently delete"""
    try:
        serializer = BulkDeleteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'message': 'Please provide an array of deleted work order IDs'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        ids = serializer.validated_data['ids']
        
        deleted_orders = DeletedWorkOrder.objects.filter(
            Q(id__in=ids) | Q(original_work_order_id__in=ids)
        )
        
        if not deleted_orders.exists():
            return Response({
                'success': False,
                'message': 'No matching deleted work orders found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        deleted_count = deleted_orders.count()
        deleted_items = list(deleted_orders.values()[:10])
        
        dashboards_to_update = set(deleted_orders.values_list('dashboard_id', flat=True))
        deleted_orders.delete()
        
        # Update dashboard counts
        for dashboard_id in dashboards_to_update:
            dashboard = DashboardData.objects.get(id=dashboard_id)
            dashboard.save()
        
        return Response({
            'success': True,
            'message': f'{deleted_count} record(s) permanently deleted from database',
            'deleted_count': deleted_count,
            'deleted_items': deleted_items
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def clear_all_history(request):
    """Clear all history"""
    try:
        dashboards_with_deleted = DashboardData.objects.filter(
            deleted_work_orders__isnull=False
        ).distinct()
        
        cleared_count = 0
        dashboard_ids = []
        
        for dashboard in dashboards_with_deleted:
            count = dashboard.deleted_work_orders.count()
            cleared_count += count
            dashboard_ids.append(dashboard.id)
            dashboard.deleted_work_orders.all().delete()
        
        # Update dashboard counts
        for dashboard_id in dashboard_ids:
            dashboard = DashboardData.objects.get(id=dashboard_id)
            dashboard.save()
        
        return Response({
            'success': True,
            'message': f'{cleared_count} history records permanently deleted from database',
            'cleared_count': cleared_count
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)