from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken


class CustomPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'limit'
    def get_paginated_response(self, data):
        return Response({
            'success': True,
            'count': len(data),
            'total': self.page.paginator.count,
            'totalPages': self.page.paginator.num_pages,
            'currentPage': self.page.number,
            'data': data
        })


# --- Helper: Token ---
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    return str(refresh.access_token)