from django.db import migrations


def update_size_values(apps, schema_editor):
    Dog = apps.get_model('dogs', 'Dog')
    Dog.objects.filter(size='mali').update(size='small')
    Dog.objects.filter(size='srednji').update(size='medium')
    Dog.objects.filter(size='veliki').update(size='large')


def update_gender_values(apps, schema_editor):
    Dog = apps.get_model('dogs', 'Dog')
    Dog.objects.filter(gender='muz').update(gender='male')
    Dog.objects.filter(gender='zenka').update(gender='female')


class Migration(migrations.Migration):

    dependencies = [
        ('dogs', '0002_initial'),
    ]

    operations = [
        # 1. Rename model Pas -> Dog
        migrations.RenameModel(
            old_name='Pas',
            new_name='Dog',
        ),
        # 2. Rename fields
        migrations.RenameField(
            model_name='dog',
            old_name='vlasnik',
            new_name='owner',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='ime',
            new_name='name',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='rasa',
            new_name='breed',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='starost',
            new_name='age',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='tezina',
            new_name='weight',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='velicina',
            new_name='size',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='pol',
            new_name='gender',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='sterilizovan',
            new_name='neutered',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='posebne_napomene',
            new_name='notes',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='slika',
            new_name='image',
        ),
        migrations.RenameField(
            model_name='dog',
            old_name='kreiran',
            new_name='created_at',
        ),
        # 3. Update size values in DB
        migrations.RunPython(update_size_values, migrations.RunPython.noop),
        # 4. Update gender values in DB
        migrations.RunPython(update_gender_values, migrations.RunPython.noop),
    ]
