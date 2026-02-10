# serializers.py
from rest_framework import serializers
from .models import TankRepair


class TankRepairSerializer(serializers.ModelSerializer):
    class Meta:
        model = TankRepair
        fields = "__all__"
