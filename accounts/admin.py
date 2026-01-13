from django.contrib import admin
from .models import User, UserDevice

admin.site.site_header = "Sterling Dashboard"          # Login page & Top Bar
admin.site.site_title = "Sterling Dashboard Admin"     # Browser Tab Title
admin.site.index_title = "Welcome to Sterling Dashboard" # Home page subtitle

admin.site.register(User)
admin.site.register(UserDevice)

# Register your models here.
