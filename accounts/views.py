from rest_framework import viewsets, status, filters, generics, views, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth import get_user_model
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer, ChangePasswordSerializer, UserDeviceSerializer
)
from .models import UserDevice

User = get_user_model()

# --- Helper Function: Token Generation ---
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    # Add custom claims
    refresh['role'] = user.role 
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

# --- Helper Class: Custom Pagination ---
class CustomPagination(PageNumberPagination):
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
# PART 1: AUTHENTICATION VIEWS
# ============================================================================

class RegisterView(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'User registered successfully',
                'token': tokens['access'],
                'refresh': tokens['refresh'],
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class LoginView(generics.GenericAPIView):
    """
    Standard Login View.
    Inheriting from GenericAPIView ensures Swagger automatically detects
    the input fields (email, password) from the serializer_class.
    """
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            device_info = request.data.get('device')

            # ---- DEVICE SAVE LOGIC ----
            if device_info and isinstance(device_info, dict) and 'deviceId' in device_info:
                device_id = device_info['deviceId']
                
                # Check if device already exists for this user
                if not UserDevice.objects.filter(user=user, device_id=device_id).exists():
                    # Check limit (Max 5), remove oldest if limit reached
                    current_devices = UserDevice.objects.filter(user=user).order_by('date')
                    if current_devices.count() >= 5:
                        current_devices.first().delete()
                    
                    # Add new device
                    UserDevice.objects.create(
                        user=user,
                        device_id=device_id,
                        browser=device_info.get('browser'),
                        browser_version=device_info.get('browserVersion'),
                        os=device_info.get('os'),
                        os_version=device_info.get('osVersion'),
                        device_type=device_info.get('deviceType')
                    )

            tokens = get_tokens_for_user(user)
            return Response({
                'success': True,
                'message': 'Login successful',
                'token': tokens['access'],
                'refresh': tokens['refresh'],
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({'success': True, 'user': serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response({'success': True, 'user': serializer.data})
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['current_password']):
                return Response({'success': False, 'message': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'success': True, 'message': 'Password changed successfully'}, status=status.HTTP_200_OK)

        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================================
# PART 2: DEVICE MANAGEMENT VIEWSET (NEW)
# ============================================================================
class UserDeviceViewSet(viewsets.GenericViewSet, 
                        mixins.ListModelMixin, 
                        mixins.RetrieveModelMixin, 
                        mixins.DestroyModelMixin):
    """
    ViewSet for users to manage their logged-in devices.
    Users can see their own devices and delete (logout) them.
    """
    serializer_class = UserDeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only return devices belonging to the currently authenticated user
        return UserDevice.objects.filter(user=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'success': True, 'message': 'Device removed successfully'}, status=status.HTTP_200_OK)


# ============================================================================
# PART 3: USER MANAGEMENT VIEWSET
# ============================================================================

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated] 
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'role']
    filterset_fields = ['role', 'is_active']
    ordering_fields = ['date_joined', 'name', 'email']
    ordering = ['-date_joined']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('excludeCurrent') == 'true':
            queryset = queryset.exclude(id=self.request.user.id)
        return queryset

    # --- Create Protection ---
    def create(self, request, *args, **kwargs):
        if request.data.get('role') == 'superadmin' and request.user.role != 'superadmin':
            return Response({'success': False, 'message': 'Only superadmin can create superadmin users'}, status=status.HTTP_403_FORBIDDEN)
        
        email = request.data.get('email')
        if User.objects.filter(email=email).exists():
             return Response({'success': False, 'message': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    # --- Update Protection ---
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.role == 'superadmin' and request.user.role != 'superadmin':
            return Response({'success': False, 'message': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    # --- Delete Protection ---
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.role == 'superadmin' or instance.id == request.user.id:
            return Response({'success': False, 'message': 'Cannot delete this user'}, status=status.HTTP_403_FORBIDDEN)
        super().destroy(request, *args, **kwargs)
        return Response({'success': True, 'message': 'User deleted successfully'}, status=status.HTTP_200_OK)

    # --- Custom Actions ---
    @action(detail=False, methods=['get'])
    def techs(self, request):
        queryset = self.filter_queryset(self.get_queryset()).filter(role='tech')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        instance = self.get_object()
        if instance.id == request.user.id or instance.role == 'superadmin':
             return Response({'success': False, 'message': 'Action not allowed'}, status=status.HTTP_403_FORBIDDEN)
        
        instance.is_active = not instance.is_active
        instance.save()
        status_msg = 'activated' if instance.is_active else 'deactivated'
        return Response({'success': True, 'message': f'User {status_msg}', 'data': self.get_serializer(instance).data})

    @action(detail=False, methods=['post'], url_path='bulk-status')
    @swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            'userIds': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_INTEGER)),
            'isActive': openapi.Schema(type=openapi.TYPE_BOOLEAN),
        }
    ))
    def bulk_status(self, request):
        user_ids = request.data.get('userIds', [])
        is_active = request.data.get('isActive')
        
        users = User.objects.filter(id__in=user_ids).exclude(role='superadmin').exclude(id=request.user.id)
        count = users.update(is_active=is_active)
        status_msg = 'activated' if is_active else 'deactivated'
        return Response({'success': True, 'message': f'{count} user(s) {status_msg}'})

    @action(detail=False, methods=['get'], url_path='check-email')
    def check_email(self, request):
        email = request.query_params.get('email')
        user = User.objects.filter(email=email).first()
        data = {'id': user.id, 'name': user.name} if user else None
        return Response({'success': True, 'exists': bool(user), 'data': data})