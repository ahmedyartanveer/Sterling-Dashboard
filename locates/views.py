from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.utils import timezone
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django_filters import FilterSet
from rest_framework.decorators import action
from .models import WorkOrderToday, Locates
from .serializers import WorkOrderTodaySerializer, LocatesSerializer
import subprocess, os, sys

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
    ViewSet for WorkOrderToday.
    Handles standard CRUD operations with automation triggers on specific status updates.
    """
    queryset = WorkOrderToday.objects.all()
    serializer_class = WorkOrderTodaySerializer

    # Filter, Search, and Ordering Configuration
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = WorkOrderTodayFilter
    search_fields = ['wo_number', 'full_address', 'technician', 'notes']
    ordering_fields = '__all__'
    ordering = ['-scheduled_date']
    
    def _run_automation_script(self, script_name, argument, new_status):
        """
        Helper method to execute external automation scripts.
        Raises CalledProcessError if the script fails.
        """
        script_path = os.path.join(os.getcwd(), 'tasks', script_name)
        
        # Inject current working directory to PYTHONPATH to ensure imports work
        env = os.environ.copy()
        env["PYTHONPATH"] = os.getcwd()

        return subprocess.run(
            [sys.executable, script_path, str(argument), str(new_status)],
            capture_output=True,
            text=True,
            check=True,
            env=env
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get('status')
        
        # Map specific statuses to their corresponding automation scripts
        automation_map = {
            'LOCKED': 'run_locked_deleted_task.py',
            'DELETED': 'run_locked_deleted_task.py'
        }

        # Check if automation is required for the new status
        if (new_status in automation_map):
            script_name = automation_map[new_status]
            print(f"🔄 Starting automation: {script_name} for ID: {instance.id}")

            try:
                # Run the script before saving to the database
                result = self._run_automation_script(script_name, instance.full_address, new_status)
                print(f"✅ Automation Success: {result.stdout}")

            except subprocess.CalledProcessError as e:
                # Automation failed; abort the database update and return error
                print(f"❌ Automation Failed: {e.stderr}")
                return Response(
                    {
                        "status": "failed",
                        "message": f"Automation failed for status {new_status}. Database was NOT updated.",
                        "details": e.stderr
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Only perform the database update if automation succeeded (or wasn't required)
        self.perform_update(serializer)

        return Response(
            {
                "status": "success",
                "message": "Work Order updated and automation completed successfully.",
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )
    

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
# LOCATES ENDPOINTS
# =============================

class LocatesViewSet(viewsets.ModelViewSet):
    queryset = Locates.objects.all().order_by('-created_at')
    serializer_class = LocatesSerializer
    permission_classes = [IsAuthenticated]

    # 1. GET ALL (Overriding list method)
    # Equivalent to: get_all_locates_data
    def list(self, request, *args, **kwargs):
        try:
            # Original logic: order by -created_at
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 2. SYNC LOGIC (Custom Action)
    # Equivalent to: sync_assigned_locates
    # Note: Original function didn't have permission_classes, so we use AllowAny for this action to match behavior.
    @action(detail=False, methods=['post'], url_path='sync', permission_classes=[AllowAny])
    def sync_locates(self, request):
        try:
            data = request.data
            
            if isinstance(data.get('workOrders'), list):
                # Filter for EXCAVATOR priority
                filtered = [w for w in data['workOrders'] if w.get('priorityName') == 'EXCAVATOR']
                
                # Deduplicate
                seen = set()
                unique = []
                
                for w in filtered:
                    wo_number = w.get('workOrderNumber')
                    if wo_number and wo_number not in seen:
                        seen.add(wo_number)
                        unique.append(w)
                
                # Create locates in database
                created_count = 0
                for wo_data in unique:
                    locate_data = {
                        'work_order_number': wo_data.get('workOrderNumber', ''),
                        'customer_name': wo_data.get('customerName', ''),
                        'customer_address': wo_data.get('customerAddress', ''),
                        'status': wo_data.get('tags', ''),
                        'priority_name': wo_data.get('priorityName', ''),
                        'tech_name': wo_data.get('techName', ''),
                        'scheduled_date': wo_data.get('scheduledDate', ''),
                        'created_date': wo_data.get('createdDate', ''),
                        'scraped_at': timezone.now()
                    }
                    
                    # Check if already exists
                    if not Locates.objects.filter(work_order_number=locate_data['work_order_number']).exists():
                        Locates.objects.create(**locate_data)
                        created_count += 1
                
                # Get latest data to return (Logic preserved)
                latest_locates = Locates.objects.all().order_by('-scraped_at')[:10]
                serializer = self.get_serializer(latest_locates, many=True)
                
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

    # 3. UPDATE & PATCH (Overriding update method)
    # Equivalent to: update_locate AND patch_locate
    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            update_data = request.data
            partial = kwargs.pop('partial', False) # True if PATCH, False if PUT

            # Custom Logic: Check for duplicate work_order_number
            if 'work_order_number' in update_data and update_data['work_order_number'] != instance.work_order_number:
                if Locates.objects.filter(work_order_number=update_data['work_order_number']).exists():
                    return Response({
                        'success': False,
                        'message': 'Work order number already exists'
                    }, status=status.HTTP_400_BAD_REQUEST)

            # Perform standard update logic manually to control fields
            # Note: For PATCH (partial update), we filter out None values/missing keys effectively via serializer or manual set
            
            if partial:
                # Logic for PATCH: Update only provided fields
                update_object = {}
                for key, value in update_data.items():
                    if hasattr(instance, key) and value is not None:
                        update_object[key] = value
                
                if not update_object:
                    return Response({
                        'success': False,
                        'message': 'No valid fields provided for update'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                for key, value in update_object.items():
                    setattr(instance, key, value)
            else:
                # Logic for PUT: Update allowed fields present in request
                for key, value in update_data.items():
                    if hasattr(instance, key):
                        setattr(instance, key, value)

            instance.save()
            serializer = self.get_serializer(instance)
            
            msg = 'Locate partially updated successfully' if partial else 'Locate updated successfully'
            return Response({
                'success': True,
                'message': msg,
                'data': serializer.data
            })

        except Exception as e:
            # Handle Not Found automatically by get_object(), but catch others
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # 4. DELETE (Overriding destroy method)
    # Equivalent to: delete_locate
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            deleted_id = instance.id
            instance.delete()
            
            return Response({
                'success': True,
                'message': 'Locate permanently deleted',
                'data': {'id': deleted_id}
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)