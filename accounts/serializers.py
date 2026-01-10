from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from .models import UserDevice

User = get_user_model()

class UserDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDevice
        fields = ['id', 'device_id', 'browser', 'browser_version', 'os', 'os_version', 'device_type', 'date']

class UserSerializer(serializers.ModelSerializer):
    """
    Formats response to match Node's formatUserResponse
    """
    # Mapping 'isActive' (Node) to 'is_active' (Django)
    isActive = serializers.BooleanField(source='is_active')
    createdAt = serializers.DateTimeField(source='date_joined')
    updatedAt = serializers.DateTimeField(source='date_joined') # Django default user doesn't have updatedAt, using joined as placeholder or add field to model
    devices = UserDeviceSerializer(many=True, read_only=True, source='userdevice_set') # Assuming related_name is default

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role', 'department', 'isActive', 'devices', 'createdAt', 'updatedAt']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'role']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        user = authenticate(request=self.context.get('request'), email=email, password=password)
        
        if not user:
             raise serializers.ValidationError({'message': 'Invalid credentials'})
        
        if not user.is_active:
             raise serializers.ValidationError({'message': 'User account is inactive'})
             
        data['user'] = user
        return data

class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name', 'email']

class ChangePasswordSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(required=True)
    newPassword = serializers.CharField(required=True)

    def validate(self, data):
        user = self.context['request'].user
        if not user.check_password(data['currentPassword']):
            raise serializers.ValidationError({'message': 'Current password is incorrect'})
        return data

class CreateUserSerializer(serializers.ModelSerializer):
    """ Used by Admin to create users """
    isActive = serializers.BooleanField(source='is_active', required=False)

    class Meta:
        model = User
        fields = ['name', 'email', 'password', 'role', 'isActive']

    def validate(self, data):
        # Role Protection Logic
        request = self.context.get('request')
        if data.get('role') == 'superadmin' and request.user.role != 'superadmin':
             raise serializers.ValidationError("Only superadmin can create superadmin users")
        
        if User.objects.filter(email=data.get('email')).exists():
             raise serializers.ValidationError("User with this email already exists")
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class UpdateUserAdminSerializer(serializers.ModelSerializer):
    """ Used by Admin to update users """
    isActive = serializers.BooleanField(source='is_active', required=False)
    password = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['name', 'email', 'role', 'isActive', 'password']

    def update(self, instance, validated_data):
        # Role Protection Logic
        request = self.context.get('request')
        new_role = validated_data.get('role')
        
        if new_role == 'superadmin' and request.user.role != 'superadmin':
             raise serializers.ValidationError("Only superadmin can assign superadmin role")
        
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)
        
        if password and password.strip():
            user.set_password(password)
            user.save()
            
        return user