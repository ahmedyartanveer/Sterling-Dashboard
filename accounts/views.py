from rest_framework import viewsets, status, filters, generics, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

# Import serializers and models
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer, 
    ChangePasswordSerializer, UserDeviceSerializer
)
from .models import UserDevice

# Get the custom user model
User = get_user_model()

# ============================================================================
# HELPER FUNCTIONS & CLASSES
# ============================================================================

def get_tokens_for_user(user):
    """
    Generates a pair of JWT tokens (Access and Refresh) manually.
    We embed the user's role into the token payload for frontend usage.
    """
    refresh = RefreshToken.for_user(user)
    
    # Custom Claims: Adding 'role' to the token payload
    refresh['role'] = user.role 
    
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class CustomPagination(PageNumberPagination):
    """
    Custom pagination style to return a structured response with metadata.
    """
    page_size = 20
    page_size_query_param = 'limit'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'count': self.page.paginator.count,
            'total': self.page.paginator.count, 
            'totalPages': self.page.paginator.num_pages,
            'currentPage': self.page.number,
            'data': data
        })

# ============================================================================
# PART 1: AUTHENTICATION ENDPOINTS
# ============================================================================

class RegisterView(generics.GenericAPIView):
    """
    API Endpoint for user registration.
    Publicly accessible (AllowAny). Returns JWT tokens upon success.
    """
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate Bearer tokens immediately after registration
            tokens = get_tokens_for_user(user)
            
            return Response({
                'success': True,
                'message': 'User registered successfully',
                'token': tokens['access'],   # This is your Bearer Token
                'refresh': tokens['refresh'],
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
            
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class LoginView(generics.GenericAPIView):
    """
    API Endpoint for user login.
    1. Validates credentials (email/password).
    2. Tracks device information (Browser, OS, IP).
    3. Returns JWT Bearer tokens.
    """
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Pass request context to serializer for authentication
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            device_info = request.data.get('device')

            # ----------------------------------------------------------------
            # DEVICE TRACKING LOGIC
            # ----------------------------------------------------------------
            if device_info and isinstance(device_info, dict) and 'deviceId' in device_info:
                device_id = device_info['deviceId']
                
                # Check if this specific device is already registered for the user
                if not UserDevice.objects.filter(user=user, device_id=device_id).exists():
                    
                    # Security Limit: Allow max 5 devices per user. Remove the oldest if full.
                    current_devices = UserDevice.objects.filter(user=user).order_by('date')
                    if current_devices.count() >= 5:
                        current_devices.first().delete()
                    
                    # Register the new device
                    UserDevice.objects.create(
                        user=user,
                        device_id=device_id,
                        browser=device_info.get('browser'),
                        browser_version=device_info.get('browserVersion'),
                        os=device_info.get('os'),
                        os_version=device_info.get('osVersion'),
                        device_type=device_info.get('deviceType')
                    )
            # ----------------------------------------------------------------

            # Generate Bearer Tokens
            tokens = get_tokens_for_user(user)
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'token': tokens['access'],  # Frontend should store this as "Bearer <token>"
                'refresh': tokens['refresh'],
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    API Endpoint to retrieve or update the currently logged-in user's profile.
    Requires: Authorization: Bearer <token>
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Returns the user associated with the token
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'success': True, 'user': serializer.data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        # Partial update allows sending only changed fields
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({'success': True, 'user': serializer.data})
            
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(generics.GenericAPIView):
    """
    API Endpoint to change password.
    Requires: Authorization: Bearer <token>
    """
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            
            # Verify the old password first
            if not user.check_password(serializer.validated_data['current_password']):
                return Response(
                    {'success': False, 'message': 'Current password is incorrect'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Set the new password (hashes it automatically)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({'success': True, 'message': 'Password changed successfully'}, status=status.HTTP_200_OK)

        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# PART 2: DEVICE MANAGEMENT VIEWSET
# ============================================================================

class UserDeviceViewSet(viewsets.GenericViewSet, 
                        mixins.ListModelMixin, 
                        mixins.RetrieveModelMixin, 
                        mixins.DestroyModelMixin):
    """
    ViewSet to manage logged-in devices.
    Allows users to view their active sessions and revoke (delete) them.
    Requires: Authorization: Bearer <token>
    """
    serializer_class = UserDeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Security: Only return devices belonging to the requesting user
        return UserDevice.objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'success': True, 'message': 'Device removed successfully'}, status=status.HTTP_200_OK)


# ============================================================================
# PART 3: ADMIN USER MANAGEMENT VIEWSET
# ============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """
    Full CRUD ViewSet for managing users (Admin Dashboard).
    Includes filtering, searching, pagination, and bulk actions.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated] 
    pagination_class = CustomPagination
    
    # Advanced Filtering Configuration
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'role']
    filterset_fields = ['role', 'is_active']
    ordering_fields = ['date_joined', 'name', 'email']
    ordering = ['-date_joined']

    def get_queryset(self):
        """
        Custom queryset to handle exclusion logic.
        Example: /api/users/?excludeCurrent=true
        """
        queryset = super().get_queryset()
        if self.request.query_params.get('excludeCurrent') == 'true':
            queryset = queryset.exclude(id=self.request.user.id)
        return queryset

    # --- Create Method (With Role Protection) ---
    def create(self, request, *args, **kwargs):
        # Prevent non-superadmins from creating superadmins
        if request.data.get('role') == 'superadmin' and request.user.role != 'superadmin':
            return Response(
                {'success': False, 'message': 'Only superadmin can create superadmin users'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        email = request.data.get('email')
        if User.objects.filter(email=email).exists():
             return Response(
                 {'success': False, 'message': 'User with this email already exists'}, 
                 status=status.HTTP_400_BAD_REQUEST
             )
        return super().create(request, *args, **kwargs)

    # --- Update Method (With Role Protection) ---
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Prevent modification of superadmin by non-superadmin
        if instance.role == 'superadmin' and request.user.role != 'superadmin':
            return Response(
                {'success': False, 'message': 'Forbidden: Cannot modify superadmin'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    # --- Delete Method (With Protections) ---
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Prevent deletion of superadmin or self
        if instance.role == 'superadmin' or instance.id == request.user.id:
            return Response(
                {'success': False, 'message': 'Cannot delete this user'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        super().destroy(request, *args, **kwargs)
        return Response({'success': True, 'message': 'User deleted successfully'}, status=status.HTTP_200_OK)

    # --- Custom Action: Get Technicians ---
    @action(detail=False, methods=['get'])
    def techs(self, request):
        """ Returns a list of all users with role 'tech'. """
        queryset = self.filter_queryset(self.get_queryset()).filter(role='tech')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    # --- Custom Action: Toggle User Status ---
    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        """ Activates or Deactivates a user account. """
        instance = self.get_object()
        
        if instance.id == request.user.id or instance.role == 'superadmin':
             return Response({'success': False, 'message': 'Action not allowed'}, status=status.HTTP_403_FORBIDDEN)
        
        instance.is_active = not instance.is_active
        instance.save()
        
        status_msg = 'activated' if instance.is_active else 'deactivated'
        return Response({
            'success': True, 
            'message': f'User {status_msg}', 
            'data': self.get_serializer(instance).data
        })

    # --- Custom Action: Bulk Status Update ---
    @action(detail=False, methods=['post'], url_path='bulk-status')
    @swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'userIds': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_INTEGER)),
            'isActive': openapi.Schema(type=openapi.TYPE_BOOLEAN),
        }
    ))
    def bulk_status(self, request):
        """ Bulk activates or deactivates multiple users at once. """
        user_ids = request.data.get('userIds', [])
        is_active = request.data.get('isActive')
        
        # Filter users excluding superadmins and self
        users = User.objects.filter(id__in=user_ids).exclude(role='superadmin').exclude(id=request.user.id)
        
        count = users.update(is_active=is_active)
        status_msg = 'activated' if is_active else 'deactivated'
        
        return Response({'success': True, 'message': f'{count} user(s) {status_msg}'})

    # --- Custom Action: Check Email Existence ---
    @action(detail=False, methods=['get'], url_path='check-email')
    def check_email(self, request):
        """ Checks if an email already exists in the database. """
        email = request.query_params.get('email')
        user = User.objects.filter(email=email).first()
        
        data = {'id': user.id, 'name': user.name} if user else None
        return Response({'success': True, 'exists': bool(user), 'data': data})