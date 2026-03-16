from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        # 1. Rename model Poruka -> Message
        migrations.RenameModel(
            old_name='Poruka',
            new_name='Message',
        ),
        # 2. Rename fields
        migrations.RenameField(
            model_name='message',
            old_name='posiljalac',
            new_name='sender',
        ),
        migrations.RenameField(
            model_name='message',
            old_name='primalac',
            new_name='recipient',
        ),
        migrations.RenameField(
            model_name='message',
            old_name='tekst',
            new_name='text',
        ),
        migrations.RenameField(
            model_name='message',
            old_name='kreirana',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='message',
            old_name='procitana',
            new_name='read',
        ),
    ]
