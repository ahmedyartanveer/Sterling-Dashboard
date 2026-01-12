from django.urls import path
from .views import LocatesController

urlpatterns = [
    # ==========================
    # LOCATES / DASHBOARD ROUTES
    # ==========================
    
    # Sync Dashboard
    # Supports both URL styles if needed, or stick to one.
    path('sync-assigned-dashboard', LocatesController.as_view({'post': 'sync_dashboard'})),
    path('sync-dashboard', LocatesController.as_view({'post': 'sync_dashboard'})),
    
    # Get All Data
    path('all-locates', LocatesController.as_view({'get': 'get_all_dashboard_data'})),
    
    # Work Order Management
    path('work-order/bulk-delete', LocatesController.as_view({'delete': 'bulk_delete_work_orders'})),
    
    # Single Work Order Operations (Using ID)
    path('work-order/<int:pk>', LocatesController.as_view({'delete': 'delete_work_order'})),
    path('work-order/<int:pk>/update-call-status', LocatesController.as_view({'patch': 'update_work_order_call_status'})),
    
    # Tagging
    path('tag-locates-needed', LocatesController.as_view({'post': 'tag_locates_needed'})),
    path('bulk-tag-locates-needed', LocatesController.as_view({'post': 'bulk_tag_locates_needed'})),
    
    # Timers & Queries
    path('check-expired-timers', LocatesController.as_view({'get': 'check_expired_timers'})),
    path('work-order/<str:wo_number>', LocatesController.as_view({'get': 'get_by_number'})),
]