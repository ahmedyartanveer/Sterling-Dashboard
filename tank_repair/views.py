# views.py
from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
import django_filters
from .models import TankRepair
from .serializers import TankRepairSerializer


class TankRepairFilter(django_filters.FilterSet):
    needed_items = django_filters.CharFilter(method="filter_needed_items")

    class Meta:
        model = TankRepair
        fields = "__all__"

    def filter_needed_items(self, queryset, name, value):
        # Example: ?needed_items=Drain
        return queryset.filter(needed_items__icontains=value)


class TankRepairViewSet(viewsets.ModelViewSet):
    queryset = TankRepair.objects.filter(is_deleted=False)
    serializer_class = TankRepairSerializer

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter
    ]

    filterset_class = TankRepairFilter
    search_fields = "__all__"
    ordering_fields = "__all__"
