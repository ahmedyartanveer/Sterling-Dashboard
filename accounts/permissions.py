from rest_framework import permissions

class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to users with role='superadmin'.
    Matches Node: roleMiddleware.restrictTo('superadmin')
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'superadmin')