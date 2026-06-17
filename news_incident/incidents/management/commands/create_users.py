from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create default users for the application'

    def handle(self, *args, **kwargs):
        # Create superuser
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@test.com',
                password='admin123'
            )
            self.stdout.write('Created admin user')
        else:
            self.stdout.write('Admin user already exists')

        # Create reviewer
        if not User.objects.filter(username='reviewer').exists():
            User.objects.create_user(
                username='reviewer',
                email='reviewer@test.com',
                password='reviewer123'
            )
            self.stdout.write('Created reviewer user')
        else:
            self.stdout.write('Reviewer user already exists')