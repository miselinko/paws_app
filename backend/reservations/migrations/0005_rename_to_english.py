from django.db import migrations


def update_service_type_values(apps, schema_editor):
    Reservation = apps.get_model('reservations', 'Reservation')
    Reservation.objects.filter(service_type='setanje').update(service_type='walking')
    Reservation.objects.filter(service_type='cuvanje').update(service_type='boarding')


def update_status_values(apps, schema_editor):
    Reservation = apps.get_model('reservations', 'Reservation')
    Reservation.objects.filter(status='na_cekanju').update(status='pending')
    Reservation.objects.filter(status='potvrdjeno').update(status='confirmed')
    Reservation.objects.filter(status='odbijeno').update(status='rejected')
    Reservation.objects.filter(status='zavrseno').update(status='completed')
    Reservation.objects.filter(status='otkazano').update(status='cancelled')


class Migration(migrations.Migration):

    dependencies = [
        ('reservations', '0004_alter_rezervacija_tip_usluge'),
        ('dogs', '0003_rename_to_english'),
    ]

    operations = [
        # 1. Rename model Rezervacija -> Reservation
        migrations.RenameModel(
            old_name='Rezervacija',
            new_name='Reservation',
        ),
        # 2. Rename fields
        migrations.RenameField(
            model_name='reservation',
            old_name='vlasnik',
            new_name='owner',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='setac',
            new_name='walker',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='psi',
            new_name='dogs',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='tip_usluge',
            new_name='service_type',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='trajanje',
            new_name='duration',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='datum_od',
            new_name='start_time',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='datum_do',
            new_name='end_time',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='napomena',
            new_name='notes',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='kreirana',
            new_name='created_at',
        ),
        migrations.RenameField(
            model_name='reservation',
            old_name='azurirana',
            new_name='updated_at',
        ),
        # 3. Update service_type values in DB
        migrations.RunPython(update_service_type_values, migrations.RunPython.noop),
        # 4. Update status values in DB
        migrations.RunPython(update_status_values, migrations.RunPython.noop),
    ]
