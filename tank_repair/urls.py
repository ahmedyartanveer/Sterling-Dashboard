# urls.py
from rest_framework.routers import DefaultRouter
from .views import TankRepairViewSet

router = DefaultRouter()
router.register(r'tank-repairs', TankRepairViewSet, basename='tank-repair')

urlpatterns = router.urls
