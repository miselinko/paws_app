from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_passwordresettoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='walkerprofile',
            name='daily_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True),
        ),
    ]
