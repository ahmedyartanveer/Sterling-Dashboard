from django.urls import path, include
from . import views
from .views import WorkOrderTodayViewSet, LocatesViewSet
from rest_framework.routers import DefaultRouter

app_name = 'locates'

router = DefaultRouter()
router.register(r'work-orders-today', WorkOrderTodayViewSet, basename='work-orders-today')
router.register(r'locates', LocatesViewSet, basename='locates')

urlpatterns = [
    # WorkOrderToday ViewSet routes
    path('', include(router.urls)),
]