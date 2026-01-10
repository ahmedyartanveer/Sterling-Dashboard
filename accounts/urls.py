from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserViewSet, RegisterView, LoginView, 
    UserProfileView, ChangePasswordView, UserDeviceViewSet
)

# Initialize Router for ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'devices', UserDeviceViewSet, basename='devices')

urlpatterns = [
    # Router URLs (Users CRUD & Devices)
    path('', include(router.urls)),

    # Authentication Endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    
    # JWT Refresh Endpoint (Get new Access Token using Refresh Token)
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Profile & Password
    path('me/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]