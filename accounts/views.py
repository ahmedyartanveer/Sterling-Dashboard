from rest_framework import viewsets, status, generics, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer, 
    ChangePasswordSerializer, UserDeviceSerializer, UpdateProfileSerializer, 
    CreateUserSerializer, UpdateUserAdminSerializer
)
from .models import UserDevice
from .permissions import IsSuperAdmin # Import the permission we created

User = get_user_model()

# ============================================================================
# HELPER: Token Generation
# ============================================================================
def get_token(user):
    """
    Generates JWT token. 
    Matches Node: generateToken(user._id, user.role)
    """
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role 
    return str(refresh.access_token)

# ============================================================================
# PAGINATION (Matches Node logic)
# ============================================================================
class CustomPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    
    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'count': len(data),
            'total': self.page.paginator.count,
            'totalPages': self.page.paginator.num_pages,
            'currentPage': self.page.number,
            'data': data
        })

# ============================================================================
# CONTROLLER 1: AUTHENTICATION (authController.js)
# ============================================================================
from rest_framework import viewsets, status, generics, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema  # (Optional) For better docs control
from drf_yasg import openapi

from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer, 
    ChangePasswordSerializer, UserDeviceSerializer, UpdateProfileSerializer, 
    CreateUserSerializer, UpdateUserAdminSerializer
)
from .models import UserDevice
from .permissions import IsSuperAdmin

User = get_user_model()

# ... (Helper function: get_token and CustomPagination remain same) ...

# ============================================================================
# CONTROLLER 1: AUTHENTICATION (Fixed for Swagger Input Body)
# ============================================================================
class AuthView(viewsets.GenericViewSet):
    """
    Groups all Auth related logic.
    Inherits from GenericViewSet to support Swagger Schema generation automatically.
    """
    
    def get_serializer_class(self):
        """
        This function tells Swagger which serializer to use for which action.
        """
        if self.action == 'register':
            return RegisterSerializer
        elif self.action == 'login':
            return LoginSerializer
        elif self.action == 'update_profile':
            return UpdateProfileSerializer
        elif self.action == 'change_password':
            return ChangePasswordSerializer
        elif self.action == 'get_me':
            return UserSerializer
        return UserSerializer # Default fallback

    def get_permissions(self):
        if self.action in ['register', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]

    # --- Register ---
    def register(self, request):
        # Use self.get_serializer to let DRF handle context automatically
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = get_token(user)
            
            return Response({
                'success': True,
                'message': 'User registered successfully',
                'token': token,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    # --- Login ---
    def login(self, request):
        # Swagger will now see LoginSerializer fields here
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            device_info = request.data.get('device')

            # ---- DEVICE SAVE LOGIC ----
            if device_info and isinstance(device_info, dict) and 'deviceId' in device_info:
                device_id = device_info['deviceId']
                
                # Check if device exists
                existing_device = UserDevice.objects.filter(user=user, device_id=device_id).exists()
                
                if not existing_device:
                    current_count = UserDevice.objects.filter(user=user).count()
                    if current_count >= 5:
                        oldest = UserDevice.objects.filter(user=user).order_by('date').first()
                        if oldest:
                            oldest.delete()
                    
                    UserDevice.objects.create(
                        user=user,
                        device_id=device_id,
                        browser=device_info.get('browser'),
                        os=device_info.get('os'),
                        device_type=device_info.get('deviceType')
                    )
            # ---- END DEVICE LOGIC ----

            token = get_token(user)
            
            return Response({
                'success': True,
                'message': 'Login successful',
                'token': token,
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        return Response({'success': False, 'message': 'Invalid credentials or inactive account'}, status=status.HTTP_400_BAD_REQUEST)

    # --- Get Me ---
    def get_me(self, request):
        user = request.user
        return Response({
            'success': True,
            'user': UserSerializer(user).data
        })

    # --- Update Profile ---
    def update_profile(self, request):
        user = request.user
        serializer = self.get_serializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            updated_user = serializer.save()
            return Response({
                'success': True,
                'user': UserSerializer(updated_user).data
            })
            
        return Response({'success': False, 'message': serializer.errors}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # --- Change Password ---
    def change_password(self, request):
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['newPassword'])
            user.save()
            return Response({'success': True, 'message': 'Password changed successfully'})
            
        return Response({'success': False, 'message': serializer.errors.get('message', 'Error')}, status=status.HTTP_400_BAD_REQUEST)

# ============================================================================
# CONTROLLER 2: USER MANAGEMENT (userController.js)
# ============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """
    Handles getAllUsers, createUser, updateUser, deleteUser
    Matches: router.get('/', adminAccess, ...)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin] # Matches adminAccess
    pagination_class = CustomPagination

    # --- Get All Users (Logic Match) ---
    def list(self, request, *args, **kwargs):
        # 1. Base Query
        queryset = self.get_queryset()

        # 2. Filter: excludeCurrent
        if request.query_params.get('excludeCurrent') == 'true':
            queryset = queryset.exclude(id=request.user.id)

        # 3. Filter: Role
        role = request.query_params.get('role')
        if role and role != 'all':
            queryset = queryset.filter(role=role)

        # 4. Filter: Status
        status_param = request.query_params.get('status')
        if status_param and status_param != 'all':
            if status_param == 'active':
                queryset = queryset.filter(is_active=True)
            elif status_param == 'inactive':
                queryset = queryset.filter(is_active=False)

        # 5. Search (Regex in Node -> icontains in Django)
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(email__icontains=search) | 
                Q(role__icontains=search)
            )

        # 6. Sorting
        sort_by = request.query_params.get('sortBy', 'date_joined')
        sort_order = request.query_params.get('sortOrder', 'desc')
        if sort_order == 'desc':
            sort_by = f'-{sort_by}'
        queryset = queryset.order_by(sort_by)

        # 7. Pagination & Response
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response({'success': True, 'data': serializer.data})

    # --- Create User (Logic Match) ---
    def create(self, request, *args, **kwargs):
        serializer = CreateUserSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            
            # Format output specifically to remove password etc
            user_data = UserSerializer(user).data
            return Response({
                'success': True, 
                'message': 'User created successfully', 
                'data': user_data
            }, status=status.HTTP_201_CREATED)
            
        return Response({'success': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    # --- Update User (Logic Match) ---
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Superadmin Protection Logic
        if instance.role == 'superadmin' and request.user.role != 'superadmin':
            return Response({'success': False, 'message': 'Only superadmin can modify superadmin users'}, status=status.HTTP_403_FORBIDDEN)

        serializer = UpdateUserAdminSerializer(instance, data=request.data, partial=True, context={'request': request})
        
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'success': True, 
                'message': 'User updated successfully', 
                'data': UserSerializer(user).data
            })
            
        return Response({'success': False, 'message': str(serializer.errors)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # --- Delete User (Logic Match) ---
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.role == 'superadmin':
            return Response({'success': False, 'message': 'Cannot delete superadmin user'}, status=status.HTTP_403_FORBIDDEN)
        
        if instance.id == request.user.id:
            return Response({'success': False, 'message': 'Cannot delete your own account'}, status=status.HTTP_403_FORBIDDEN)

        self.perform_destroy(instance)
        return Response({'success': True, 'message': 'User deleted successfully'})

    # --- Get By ID ---
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            return Response({'success': True, 'data': UserSerializer(instance).data})
        except:
             return Response({'success': False, 'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # --- Toggle Status ---
    def toggle_status(self, request, pk=None):
        try:
            user = self.get_queryset().get(pk=pk)
        except User.DoesNotExist:
            return Response({'success': False, 'message': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if user.role == 'superadmin':
            return Response({'success': False, 'message': 'Cannot deactivate superadmin user'}, status=status.HTTP_403_FORBIDDEN)
        
        if user.id == request.user.id:
             return Response({'success': False, 'message': 'Cannot deactivate your own account'}, status=status.HTTP_403_FORBIDDEN)

        user.is_active = not user.is_active
        user.save()

        status_msg = 'activated' if user.is_active else 'deactivated'
        return Response({
            'success': True, 
            'message': f'User {status_msg} successfully', 
            'data': UserSerializer(user).data
        })

    # --- Bulk Update Status ---
    def bulk_status(self, request):
        user_ids = request.data.get('userIds', [])
        is_active = request.data.get('isActive')
        
        if not user_ids:
            return Response({'success': False, 'message': 'Please provide user IDs'}, status=status.HTTP_400_BAD_REQUEST)

        # Logic: Filter out superadmins and self
        users_to_update = User.objects.filter(id__in=user_ids)
        
        # Validation checks
        if users_to_update.filter(role='superadmin').exists():
            return Response({'success': False, 'message': 'Cannot modify superadmin users'}, status=status.HTTP_403_FORBIDDEN)
        
        if users_to_update.filter(id=request.user.id).exists() and is_active is False:
             return Response({'success': False, 'message': 'Cannot deactivate your own account'}, status=status.HTTP_403_FORBIDDEN)
            
        count = users_to_update.update(is_active=is_active)
        status_msg = 'activated' if is_active else 'deactivated'
        
        return Response({'success': True, 'message': f'{count} user(s) {status_msg} successfully'})


# ============================================================================
# SPECIAL VIEWS (To match specific Node Routes)
# ============================================================================

class UserTechView(generics.ListAPIView):
    """
    Matches: router.get('/tech', userController.getTechRoleUsers);
    NOTE: In Node, this route does NOT have 'adminAccess', only 'protect'.
    So permission is IsAuthenticated (not SuperAdmin).
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def list(self, request, *args, **kwargs):
        # Base filter: role='tech'
        queryset = User.objects.filter(role='tech')
        
        # Apply standard filters (Copy of list logic above)
        if request.query_params.get('excludeCurrent') == 'true':
            queryset = queryset.exclude(id=request.user.id)
            
        status_param = request.query_params.get('status')
        if status_param == 'active': queryset = queryset.filter(is_active=True)
        elif status_param == 'inactive': queryset = queryset.filter(is_active=False)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search)
            )
            
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        return Response({'success': True, 'count': queryset.count(), 'data': self.get_serializer(queryset, many=True).data})

class CheckEmailView(APIView):
    """
    Matches: router.get('/check-email/:email', adminAccess, ...);
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, email):
        user = User.objects.filter(email=email).first()
        data = {'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role} if user else None
        
        return Response({
            'success': True, 
            'exists': bool(user), 
            'data': data
        })