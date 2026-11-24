from django.core.management import call_command
from django.db import migrations


def create_cache_table(apps, schema_editor):
    # Tabela za DatabaseCache (deljeni throttle brojači). Idempotentno.
    call_command('createcachetable', database=schema_editor.connection.alias, verbosity=0)


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0010_favorite'),
    ]

    operations = [
        migrations.RunPython(create_cache_table, migrations.RunPython.noop),
    ]
