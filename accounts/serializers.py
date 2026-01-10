from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from .models import UserDevice

User = get_user_model()

# ============================================================================
# 1. User Device Serializer (New)
# ============================================================================
class UserDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDevice
        fields = ['id', 'device_id', 'browser', 'browser_version', 'os', 'os_version', 'device_type', 'date']
        read_only_fields = ['id', 'date', 'user']


# ============================================================================
# 2. General User Serializer (For CRUD & Profile)
# ============================================================================
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'department', 'is_active', 'last_login', 'date_joined', 'password']
        read_only_fields = ['last_login', 'date_joined']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

# ============================================================================
# 3. Auth Serializers
# ============================================================================

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'role']

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, style={'input_type': 'password'})
    # Device field allows JSON input (optional)
    device = serializers.DictField(required=False, help_text="Example: {'deviceId': '123', 'os': 'Windows'}")

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        if email and password:
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            if not user:
                raise serializers.ValidationError("Invalid email or password.")
            if not user.is_active:
                raise serializers.ValidationError("User account is inactive.")
        else:
            raise serializers.ValidationError("Must include 'email' and 'password'.")

        data['user'] = user
        return data

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)