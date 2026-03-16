from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('dogs', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('service_type', models.CharField(choices=[('walking', 'Walking'), ('boarding', 'Boarding')], max_length=10)),
                ('duration', models.PositiveIntegerField(blank=True, help_text='Duration in minutes (20, 30, 60)', null=True)),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('rejected', 'Rejected'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='pending', max_length=15)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='owner_reservations', to=settings.AUTH_USER_MODEL)),
                ('walker', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='walker_reservations', to=settings.AUTH_USER_MODEL)),
                ('dogs', models.ManyToManyField(related_name='reservations', to='dogs.dog')),
            ],
            options={
                'verbose_name': 'Reservation',
                'verbose_name_plural': 'Reservations',
                'ordering': ['-created_at'],
            },
        ),
    ]
