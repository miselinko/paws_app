from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0002_reservation_cancelled_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='reservation',
            name='last_lat',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='last_lng',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='reservation',
            name='walk_started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='reservation',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('confirmed', 'Confirmed'),
                    ('in_progress', 'In Progress'),
                    ('rejected', 'Rejected'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ],
                default='pending',
                max_length=15,
            ),
        ),
    ]
