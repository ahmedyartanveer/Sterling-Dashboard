from django.urls import path
from .views import (
    SyncDashboardView, DashboardListView, WorkOrderOperationsView,
    UpdateCallStatusView, CheckExpiredTimersView, RestoreWorkOrderView, BulkDeleteView
)

urlpatterns = [
    # Sync Dashboard (Superadmin Only)
    path('sync-dashboard', SyncDashboardView.as_view(), name='sync_dashboard'),
    
    # Get Data
    path('all-locates', DashboardListView.as_view(), name='all_locates'),
    
    # Work Order Operations
    path('work-order/<int:pk>', WorkOrderOperationsView.as_view(), name='work_order_ops'),
    path('work-order/<int:pk>/update-call-status', UpdateCallStatusView.as_view(), name='update_call_status'),
    path('work-order/bulk-delete', BulkDeleteView.as_view(), name='bulk_delete'),
    
    # Timers
    path('check-expired-timers', CheckExpiredTimersView.as_view(), name='check_expired'),
    
    # History & Restore
    path('history/<int:dashboard_id>/<int:deleted_order_id>/restore', RestoreWorkOrderView.as_view(), name='restore_work_order'),
]