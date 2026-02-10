from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from .views import AuthView, UserViewSet, TechUserView

# --- Swagger Config ---
schema_view = get_schema_view(
   openapi.Info(
      title="User Management API",
      default_version='v1',
      description="API documentation matching Node.js Logic",
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

# --- Router ---
router = DefaultRouter()
# /api/users/ (GET, POST) and /api/users/:id/ (PUT, DELETE)
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    # --- Auth Routes (/api/auth/...) ---
    path('auth/register', AuthView.as_view({'post': 'register'}), name='register'),
    path('auth/login', AuthView.as_view({'post': 'login'}), name='login'),
    path('auth/me', AuthView.as_view({'get': 'get_me'}), name='me'),
    path('auth/profile', AuthView.as_view({'put': 'update_profile'}), name='profile'),
    path('auth/change-password', AuthView.as_view({'put': 'change_password'}), name='change-password'),

    # --- Special User Routes (Must be before router.urls) ---
    path('users/tech', TechUserView.as_view(), name='tech-users'),
    path('users/bulk-status', UserViewSet.as_view({'patch': 'bulk_status'}), name='bulk-status'),
    path('users/<int:pk>/toggle-status', UserViewSet.as_view({'patch': 'toggle_status'}), name='toggle-status'),

    # --- Standard User CRUD ---
    path('', include(router.urls)), 

    # --- Swagger URLs ---
    path('docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
]