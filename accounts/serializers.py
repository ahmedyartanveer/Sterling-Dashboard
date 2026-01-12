from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserDevice

User = get_user_model()

# ==========================================
# 1. Device Serializers
# ==========================================

# Login এর সময় ইনপুট নেওয়ার জন্য
class DeviceInputSerializer(serializers.Serializer):
    deviceId = serializers.CharField(required=True)
    browser = serializers.CharField(required=False, allow_blank=True)
    browserVersion = serializers.CharField(required=False, allow_blank=True)
    os = serializers.CharField(required=False, allow_blank=True)
    osVersion = serializers.CharField(required=False, allow_blank=True)
    deviceType = serializers.CharField(required=False, allow_blank=True)

# রেসপন্স আউটপুট এর জন্য (snake_case -> camelCase)
class DeviceSerializer(serializers.ModelSerializer):
    deviceId = serializers.CharField(source='device_id')
    browserVersion = serializers.CharField(source='browser_version', required=False)
    osVersion = serializers.CharField(source='os_version', required=False)
    deviceType = serializers.CharField(source='device_type', required=False)

    class Meta:
        model = UserDevice
        fields = ['deviceId', 'browser', 'browserVersion', 'os', 'osVersion', 'deviceType', 'date']

# ==========================================
# 2. User Serializers (Output)
# ==========================================
class UserSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active')
    createdAt = serializers.DateTimeField(source='created_at')
    updatedAt = serializers.DateTimeField(source='updated_at')
    devices = DeviceSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'department', 'isActive', 'devices', 'createdAt', 'updatedAt']

# ==========================================
# 3. Auth Action Serializers (Input)
# ==========================================

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    isActive = serializers.BooleanField(source='is_active', required=False)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'role', 'isActive']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    # এই নেস্টেড সিরিয়ালাইজার থাকার কারণে Swagger এ ডিভাইসের ইনপুট বক্স আসবে
    device = DeviceInputSerializer(required=False)

class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name', 'email']

class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(required=True)
    newPassword = serializers.CharField(required=True)

# ==========================================
# 4. Admin Action Serializers (Input)
# ==========================================

class CreateUserSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active', required=False)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'role', 'isActive']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

# --- THIS IS THE SERIALIZER YOU ASKED FOR ---
class UpdateUserSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active', required=False)
    password = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'role', 'isActive', 'password']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        
        # Node Logic: if (password && password.trim() !== '') updateData.password = password;
        if password and password.strip():
            user.set_password(password)
            user.save()
        return user

class BulkStatusSerializer(serializers.Serializer):
    userIds = serializers.ListField(child=serializers.IntegerField(), required=True)
    isActive = serializers.BooleanField(required=True)