from django.urls import path, include
from .views import WorkOrderTodayViewSet, LocatesViewSet, UnifiedBulkUpdateView, WorkOrderTodayEditViewSet
from rest_framework.routers import DefaultRouter

app_name = 'locates'

# Router for ViewSets
router = DefaultRouter()
router.register(r'work-orders-today', WorkOrderTodayViewSet, basename='work-orders-today')
router.register(r'locates', LocatesViewSet, basename='locates')
router.register(r'work-order-edit', WorkOrderTodayEditViewSet, basename='work-order-edit')

urlpatterns = [
    # Custom APIView path
    path('bulk-update/', UnifiedBulkUpdateView.as_view(), name='bulk-update'),

    # Router generated URLs
    path('', include(router.urls)),
]