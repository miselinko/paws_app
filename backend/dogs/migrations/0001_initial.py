from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Dog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('breed', models.CharField(max_length=100)),
                ('age', models.PositiveIntegerField(help_text='Age in years')),
                ('weight', models.DecimalField(decimal_places=2, help_text='Weight in kg', max_digits=5)),
                ('size', models.CharField(choices=[('small', 'Small (up to 10kg)'), ('medium', 'Medium (10-25kg)'), ('large', 'Large (25kg+)')], max_length=10)),
                ('gender', models.CharField(choices=[('male', 'Male'), ('female', 'Female')], max_length=10)),
                ('neutered', models.BooleanField(default=False)),
                ('temperament', models.CharField(blank=True, help_text='e.g. calm, energetic, aggressive towards dogs', max_length=255)),
                ('notes', models.TextField(blank=True, help_text='Allergies, medications, fears...')),
                ('image', models.ImageField(blank=True, null=True, upload_to='dogs/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dogs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Dog',
                'verbose_name_plural': 'Dogs',
            },
        ),
    ]
