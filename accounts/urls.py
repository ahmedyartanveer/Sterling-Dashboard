from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AuthView, UserViewSet, UserTechView, CheckEmailView
)

# Router for standard CRUD on Users
# Node: router.get('/', ...), router.put('/:id', ...)
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    # ==========================================
    # AUTH ROUTES (Matches authRoutes.js)
    # Prefix: /api/auth/ (Assuming you include this file under 'api/')
    # ==========================================
    path('auth/register', AuthView.as_view({'post': 'register'}), name='register'),
    path('auth/login', AuthView.as_view({'post': 'login'}), name='login'),
    path('auth/me', AuthView.as_view({'get': 'get_me'}), name='get_me'),
    path('auth/profile', AuthView.as_view({'put': 'update_profile'}), name='update_profile'),
    path('auth/change-password', AuthView.as_view({'put': 'change_password'}), name='change_password'),

    # ==========================================
    # USER ROUTES (Matches userRoutes.js)
    # Prefix: /api/users/
    # ==========================================
    
    # 1. Tech Route (Must come before router to avoid ID conflict)
    # Node: router.get('/tech', userController.getTechRoleUsers);
    path('users/tech', UserTechView.as_view(), name='tech_users'),

    # 2. Check Email Route
    # Node: router.get('/check-email/:email', ...);
    path('users/check-email/<str:email>', CheckEmailView.as_view(), name='check_email'),

    # 3. Bulk Status
    # Node: router.patch('/bulk-status', ...);
    path('users/bulk-status', UserViewSet.as_view({'patch': 'bulk_status'}), name='bulk_status'),
    
    # 4. Toggle Status (Specific ID)
    # Node: router.patch('/:id/toggle-status', ...);
    path('users/<str:pk>/toggle-status', UserViewSet.as_view({'patch': 'toggle_status'}), name='toggle_status'),

    # 5. Standard CRUD (Get All, Get By ID, Create, Update, Delete)
    # Node: router.get('/', ...), router.post('/', ...), router.delete('/:id', ...)
    path('', include(router.urls)),
]