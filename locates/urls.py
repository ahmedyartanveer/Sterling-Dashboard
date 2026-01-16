from django.urls import path, include
from . import views
from .views import WorkOrderTodayViewSet
from rest_framework.routers import DefaultRouter

app_name = 'locates'

router = DefaultRouter()
router.register(r'work-orders-today', WorkOrderTodayViewSet)

urlpatterns = [
    
    path('', include(router.urls)),
    
    # Sync routes (no authentication required)
    path('sync-dashboard', views.sync_dashboard, name='sync_dashboard'),
    path('sync-assigned-dashboard/', views.sync_assigned_dashboard, name='sync_assigned_dashboard'),
    
    # Protected routes (authentication required)
    path('all-locates/', views.get_all_dashboard_data, name='all_locates'),
    
    # Work order management
    path('work-order/bulk-delete/', views.bulk_delete_work_orders, name='bulk_delete_work_orders'),
    path('work-order/<int:id>/', views.delete_work_order, name='delete_work_order'),
    path('work-order/<int:id>/update-call-status/', views.update_work_order_call_status, name='update_call_status'),
    path('work-order/<int:id>/complete/', views.complete_work_order_manually, name='complete_work_order'),
    
    # Timer and work order queries
    path('check-expired-timers/', views.check_and_update_expired_timers, name='check_expired_timers'),
    path('work-order/<str:work_order_number>/', views.get_work_order_by_number, name='get_work_order_by_number'),
    
    # History management routes
    path('deleted-history/', views.get_deleted_history, name='deleted_history'),
    path('dashboard/<int:id>/history/', views.get_dashboard_with_history, name='dashboard_with_history'),
    path('history/<int:dashboard_id>/<int:deleted_order_id>/restore/', views.restore_work_order, name='restore_work_order'),
    path('history/<int:dashboard_id>/<int:deleted_order_id>/permanent/', views.permanently_delete_from_history, name='permanently_delete'),
    path('history/bulk-permanent-delete/', views.bulk_permanently_delete, name='bulk_permanent_delete'),
    path('history/clear-all/', views.clear_all_history, name='clear_all_history'),
]