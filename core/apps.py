from django.apps import AppConfig
import os

class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'

    def ready(self):
        if os.environ.get('RUN_MAIN', None) == 'true':
            from . import scheduler
            try:
                print("Starting Scheduler from apps.py...")
                scheduler.start()
            except Exception as e:
                print(f"Scheduler error: {e}")