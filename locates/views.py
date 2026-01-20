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

from .models import WorkOrderToday, Locates
from .serializers import WorkOrderTodaySerializer, LocatesSerializer


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


# =============================
# LOCATES ENDPOINTS (From Node.js)
# =============================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_locates_data(request):
    """Get all locates data - equivalent to Node.js getAllLocatesData"""
    try:
        data = Locates.objects.all().order_by('-created_at')
        serializer = LocatesSerializer(data, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def sync_assigned_locates(request):
    """Sync assigned locates from scraper - equivalent to Node.js syncAssignedLocates"""
    try:
        # Get data from request (in Node.js, this comes from assignedLocatesDispatchBoard service)
        data = request.data
        
        if isinstance(data.get('work_orders'), list):
            # Filter for EXCAVATOR priority
            filtered = [w for w in data['work_orders'] if w.get('priority_name') == 'EXCAVATOR']
            
            # Deduplicate
            seen = set()
            unique = []
            
            for w in filtered:
                wo_number = w.get('work_order_number')
                if wo_number and wo_number not in seen:
                    seen.add(wo_number)
                    unique.append(w)
            
            # Create locates in database
            created_count = 0
            for wo_data in unique:
                # Map Node.js field names to Django model field names
                locate_data = {
                    'work_order_number': wo_data.get('work_order_number', ''),
                    'customer_name': wo_data.get('customer_name', ''),
                    'customer_address': wo_data.get('customer_address', ''),
                    'status': wo_data.get('status', ''),
                    'priority_name': wo_data.get('priority_name', ''),
                    'tech_name': wo_data.get('tech_name', ''),
                    'scheduled_date': wo_data.get('scheduled_date', ''),
                    'created_date': wo_data.get('created_date', ''),
                    'scraped_at': timezone.now()
                }
                
                # Check if already exists
                if not Locates.objects.filter(work_order_number=locate_data['work_order_number']).exists():
                    Locates.objects.create(**locate_data)
                    created_count += 1
            
            # Get latest data to return
            latest_locates = Locates.objects.all().order_by('-scraped_at')[:10]
            serializer = LocatesSerializer(latest_locates, many=True)
            
            return Response({
                'success': True,
                'message': f"Dashboard synced successfully with {created_count} new work orders",
                'data': serializer.data
            })
        
        return Response({
            'success': False,
            'message': 'No work orders data found'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_locate(request, id):
    """Update a locate record - equivalent to Node.js updateLocate"""
    try:
        locate = Locates.objects.filter(id=id).first()
        
        if not locate:
            return Response({
                'success': False,
                'message': 'Locate not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        update_data = request.data
        
        # Check for duplicate work_order_number if being changed
        if 'work_order_number' in update_data and update_data['work_order_number'] != locate.work_order_number:
            if Locates.objects.filter(work_order_number=update_data['work_order_number']).exists():
                return Response({
                    'success': False,
                    'message': 'Work order number already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update fields
        for key, value in update_data.items():
            if hasattr(locate, key):
                setattr(locate, key, value)
        
        locate.save()
        
        serializer = LocatesSerializer(locate)
        return Response({
            'success': True,
            'message': 'Locate updated successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def patch_locate(request, id):
    """Partially update a locate record - equivalent to Node.js patchLocate"""
    try:
        locate = Locates.objects.filter(id=id).first()
        
        if not locate:
            return Response({
                'success': False,
                'message': 'Locate not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        update_data = request.data
        
        # Check for duplicate work_order_number if being changed
        if 'work_order_number' in update_data and update_data['work_order_number'] != locate.work_order_number:
            if Locates.objects.filter(work_order_number=update_data['work_order_number']).exists():
                return Response({
                    'success': False,
                    'message': 'Work order number already exists'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update only provided fields
        update_object = {}
        for key, value in update_data.items():
            if hasattr(locate, key) and value is not None:
                update_object[key] = value
        
        if not update_object:
            return Response({
                'success': False,
                'message': 'No valid fields provided for update'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the locate
        for key, value in update_object.items():
            setattr(locate, key, value)
        
        locate.save()
        
        serializer = LocatesSerializer(locate)
        return Response({
            'success': True,
            'message': 'Locate partially updated successfully',
            'data': serializer.data
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_locate(request, id):
    """Delete a locate record - equivalent to Node.js deleteLocate"""
    try:
        locate = Locates.objects.filter(id=id).first()
        
        if not locate:
            return Response({
                'success': False,
                'message': 'Locate not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Hard delete - completely remove from database
        locate.delete()
        
        return Response({
            'success': True,
            'message': 'Locate permanently deleted',
            'data': {'id': id}
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)