from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserViewSet, 
    RegisterView, 
    LoginView, 
    UserProfileView, 
    ChangePasswordView,
    UserDeviceViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'devices', UserDeviceViewSet, basename='user-devices') # Register Device API

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),

    # Auth Endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Profile Endpoints
    path('me/', UserProfileView.as_view(), name='profile'),
    path('update-profile/', UserProfileView.as_view(), name='update-profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]