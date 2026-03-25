from django.db import migrations
import os


def create_default_admin(apps, schema_editor):
    from django.contrib.auth.hashers import make_password
    User = apps.get_model('users', 'User')
    email = os.environ.get('ADMIN_EMAIL', 'admin@paws.rs')
    password = os.environ.get('ADMIN_PASSWORD', 'admin123')

    if not User.objects.filter(role='admin').exists():
        User.objects.create(
            email=email,
            first_name='Admin',
            last_name='Paws',
            role='admin',
            is_staff=True,
            is_superuser=True,
            is_active=True,
            password=make_password(password),
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_walkerprofile_is_featured'),
    ]

    operations = [
        migrations.RunPython(create_default_admin, migrations.RunPython.noop),
    ]
