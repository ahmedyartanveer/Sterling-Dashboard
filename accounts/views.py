from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate
from django.db.models import Q
from django.utils import timezone


# Swagger Imports
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import User, UserDevice
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer, 
    UpdateProfileSerializer, ChangePasswordSerializer,
    CreateUserSerializer, UpdateUserSerializer, BulkStatusSerializer
)
from .permissions import IsSuperAdmin 
from .helper import CustomPagination, get_tokens_for_user







# ==========================================
# AUTH CONTROLLER
# ==========================================
class AuthView(viewsets.GenericViewSet):
    permission_classes = [AllowAny] 

    @swagger_auto_schema(request_body=RegisterSerializer, responses={201: UserSerializer})
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'User registered successfully',
                'token': token,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @swagger_auto_schema(request_body=LoginSerializer, responses={200: UserSerializer})
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
             return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        device_data = serializer.validated_data.get('device', {})

        user = authenticate(email=email, password=password)

        if not user:
            return Response({'success': False, 'message': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active:
            return Response({'success': False, 'message': 'User account is inactive'}, status=status.HTTP_403_FORBIDDEN)

        # ---- DEVICE LOGIC (100% Node Match) ----
        if device_data and 'deviceId' in device_data:
            device_id = device_data['deviceId']
            device_obj, created = UserDevice.objects.get_or_create(
                user=user, 
                device_id=device_id,
                defaults={
                    'browser': device_data.get('browser'),
                    'browser_version': device_data.get('browserVersion'),
                    'os': device_data.get('os'),
                    'os_version': device_data.get('osVersion'),
                    'device_type': device_data.get('deviceType')
                }
            )

            if not created:
                device_obj.date = timezone.now() # Update timestamp
                if device_data.get('browser'): device_obj.browser = device_data.get('browser')
                device_obj.save()
            else:
                # Check limit (Max 5)
                current_devices = UserDevice.objects.filter(user=user).order_by('date')
                if current_devices.count() > 5:
                    current_devices.first().delete() # Remove oldest
        # ----------------------------------------

        token = get_tokens_for_user(user)
        return Response({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': UserSerializer(user).data
        })

    @swagger_auto_schema(permission_classes=[IsAuthenticated], responses={200: UserSerializer})
    def get_me(self, request):
        if not request.user.is_authenticated:
            return Response({'success': False, 'message': 'Not authorized'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response({'success': True, 'user': UserSerializer(request.user).data})

    @swagger_auto_schema(request_body=UpdateProfileSerializer, permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        if not request.user.is_authenticated:
            return Response({'success': False, 'message': 'Not authorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response({'success': True, 'user': UserSerializer(user).data})
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @swagger_auto_schema(request_body=ChangePasswordSerializer, permission_classes=[IsAuthenticated])
    def change_password(self, request):
        if not request.user.is_authenticated:
             return Response({'success': False, 'message': 'Not authorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['currentPassword']):
                return Response({'success': False, 'message': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['newPassword'])
            user.save()
            return Response({'success': True, 'message': 'Password changed successfully'})
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# USER CONTROLLER (Admin) - FIXED VERSION
# ==========================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = CustomPagination

    # --- 1. Get All Users (with Filters) ---
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('search', openapi.IN_QUERY, description="Name/Email/Role", type=openapi.TYPE_STRING),
            openapi.Parameter('role', openapi.IN_QUERY, description="Filter by role", type=openapi.TYPE_STRING),
            openapi.Parameter('status', openapi.IN_QUERY, description="active/inactive", type=openapi.TYPE_STRING),
            openapi.Parameter('excludeCurrent', openapi.IN_QUERY, description="true/false", type=openapi.TYPE_BOOLEAN),
        ]
    )
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Node Logic Implementation
        if request.query_params.get('excludeCurrent') == 'true':
            queryset = queryset.exclude(id=request.user.id)
        
        role = request.query_params.get('role')
        if role and role != 'all':
            queryset = queryset.filter(role=role)

        status_param = request.query_params.get('status')
        if status_param and status_param != 'all':
            is_active = True if status_param == 'active' else False
            queryset = queryset.filter(is_active=is_active)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search) | Q(role__icontains=search)
            )

        sort_by = request.query_params.get('sortBy', 'created_at')
        sort_order = request.query_params.get('sortOrder', 'desc')
        if sort_order == 'desc': sort_by = f'-{sort_by}'
        queryset = queryset.order_by(sort_by)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    # --- 2. Create User ---
    @swagger_auto_schema(request_body=CreateUserSerializer)
    def create(self, request, *args, **kwargs):
        # Superadmin can create any role including other superadmins
        serializer = CreateUserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({'success': True, 'message': 'User created successfully', 'data': UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    # --- 3. Update User (Using UpdateUserSerializer) ---
    @swagger_auto_schema(request_body=UpdateUserSerializer)
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Superadmin can update any user including other superadmins
        serializer = UpdateUserSerializer(instance, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response({'success': True, 'message': 'User updated successfully', 'data': UserSerializer(user).data})
        return Response({'success': False, 'message': str(serializer.errors)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # --- 4. Delete User ---
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Prevent self-deletion
        if instance.id == request.user.id:
            return Response({'success': False, 'message': 'Cannot delete your own account'}, status=status.HTTP_403_FORBIDDEN)
        
        # Superadmin can delete any user (including other superadmins)
        self.perform_destroy(instance)
        return Response({'success': True, 'message': 'User deleted successfully'})

    # --- 5. Toggle Status (Route: /:id/toggle-status) ---
    @swagger_auto_schema(request_body=openapi.Schema(type=openapi.TYPE_OBJECT, properties={}))
    def toggle_status(self, request, pk=None):
        try:
            user = self.get_queryset().get(pk=pk)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Prevent self-deactivation/activation
        if user.id == request.user.id:
            return Response({'success': False, 'message': 'Cannot modify status of your own account'}, status=status.HTTP_403_FORBIDDEN)

        user.is_active = not user.is_active
        user.save()
        status_msg = 'activated' if user.is_active else 'deactivated'
        return Response({'success': True, 'message': f'User {status_msg} successfully', 'data': UserSerializer(user).data})

    # --- 6. Bulk Status (Route: /bulk-status) ---
    @swagger_auto_schema(request_body=BulkStatusSerializer)
    def bulk_status(self, request):
        serializer = BulkStatusSerializer(data=request.data)
        if not serializer.is_valid():
             return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user_ids = serializer.validated_data['userIds']
        is_active = serializer.validated_data['isActive']
        
        users = User.objects.filter(id__in=user_ids)
        
        # Prevent self-deactivation
        if request.user.id in user_ids and is_active is False:
             return Response({'success': False, 'message': 'Cannot deactivate your own account'}, status=status.HTTP_403_FORBIDDEN)

        updated_count = users.update(is_active=is_active)
        status_msg = 'activated' if is_active else 'deactivated'
        return Response({'success': True, 'message': f'{updated_count} user(s) {status_msg} successfully'})


# ==========================================
# SPECIAL VIEWS
# ==========================================

# Tech Users View
class TechUserView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = User.objects.filter(role='tech')
        return queryset
    
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return response