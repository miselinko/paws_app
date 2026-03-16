from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0002_initial'),
        ('reservations', '0005_rename_to_english'),
    ]

    operations = [
        # 1. Rename model Recenzija -> Review
        migrations.RenameModel(
            old_name='Recenzija',
            new_name='Review',
        ),
        # 2. Rename fields
        migrations.RenameField(
            model_name='review',
            old_name='rezervacija',
            new_name='reservation',
        ),
        migrations.RenameField(
            model_name='review',
            old_name='vlasnik',
            new_name='owner',
        ),
        migrations.RenameField(
            model_name='review',
            old_name='setac',
            new_name='walker',
        ),
        migrations.RenameField(
            model_name='review',
            old_name='ocena',
            new_name='rating',
        ),
        migrations.RenameField(
            model_name='review',
            old_name='komentar',
            new_name='comment',
        ),
        migrations.RenameField(
            model_name='review',
            old_name='kreirana',
            new_name='created_at',
        ),
    ]
