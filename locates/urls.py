from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardViewSet, WorkOrderViewSet

router = DefaultRouter()
router.register(r'dashboards', DashboardViewSet)
router.register(r'work-orders', WorkOrderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]