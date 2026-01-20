from django.urls import path, include
from . import views
from .views import WorkOrderTodayViewSet
from rest_framework.routers import DefaultRouter

app_name = 'locates'

router = DefaultRouter()
router.register(r'work-orders-today', WorkOrderTodayViewSet)

urlpatterns = [
    # WorkOrderToday ViewSet routes
    path('', include(router.urls)),
    
    # Locates endpoints (from Node.js controller)
    path('all-locates/', views.get_all_locates_data, name='get_all_locates_data'),
    path('sync-assigned/', views.sync_assigned_locates, name='sync_assigned_locates'),
    path('<int:id>/', views.update_locate, name='update_locate'),
    path('all-locates/<int:id>/', views.patch_locate, name='patch_locate'),
    path('all-locates/<int:id>/delete/', views.delete_locate, name='delete_locate'),
]