# sterling_dashboard/urls.py (Main URL file)

from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')), # Your app URLs
    
    # --- API Documentation URLs ---
    # 1. Schema File (Downloadable YAML/JSON)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    
    # 2. Swagger UI (Clean Interface - Recommended)
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # 3. Redoc UI (Alternative Interface)
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]