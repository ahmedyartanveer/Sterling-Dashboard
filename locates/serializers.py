from rest_framework import serializers
from .models import WorkOrderToday, Locates


class WorkOrderTodaySerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkOrderToday
        # Serialize all fields from the model
        fields = '__all__'


class LocatesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Locates
        # Serialize all fields from the model
        fields = '__all__'