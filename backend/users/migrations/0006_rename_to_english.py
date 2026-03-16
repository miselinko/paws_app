from django.db import migrations


def update_role_values(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(role='vlasnik').update(role='owner')
    User.objects.filter(role='setac').update(role='walker')


def update_services_values(apps, schema_editor):
    WalkerProfile = apps.get_model('users', 'WalkerProfile')
    WalkerProfile.objects.filter(services='setanje').update(services='walking')
    WalkerProfile.objects.filter(services='cuvanje').update(services='boarding')
    WalkerProfile.objects.filter(services='oba').update(services='both')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_setacprofil_dostupnost'),
    ]

    operations = [
        # 1. Rename model SetacProfil -> WalkerProfile
        migrations.RenameModel(
            old_name='SetacProfil',
            new_name='WalkerProfile',
        ),
        # 2. Rename User fields
        migrations.RenameField(
            model_name='user',
            old_name='ime',
            new_name='first_name',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='prezime',
            new_name='last_name',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='broj_telefona',
            new_name='phone',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='profilna_slika',
            new_name='profile_image',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='tip',
            new_name='role',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='adresa',
            new_name='address',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='kreiran',
            new_name='created_at',
        ),
        # 3. Rename WalkerProfile fields
        migrations.RenameField(
            model_name='walkerprofile',
            old_name='korisnik',
            new_name='user',
        ),
        migrations.RenameField(
            model_name='walkerprofile',
            old_name='cena_po_satu',
            new_name='hourly_rate',
        ),
        migrations.RenameField(
            model_name='walkerprofile',
            old_name='usluge',
            new_name='services',
        ),
        migrations.RenameField(
            model_name='walkerprofile',
            old_name='opis',
            new_name='bio',
        ),
        migrations.RenameField(
            model_name='walkerprofile',
            old_name='aktivan',
            new_name='active',
        ),
        migrations.RenameField(
            model_name='walkerprofile',
            old_name='dostupnost',
            new_name='availability',
        ),
        # 4. Update role values in DB
        migrations.RunPython(update_role_values, migrations.RunPython.noop),
        # 5. Update services values in DB
        migrations.RunPython(update_services_values, migrations.RunPython.noop),
    ]
