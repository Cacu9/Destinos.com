from decimal import Decimal

from django.db import migrations

from catalog.aeropuertos import AEROPUERTOS


def cargar_coordenadas(apps, schema_editor):
    """Ubica en el mapa los destinos ya cargados cuyo código IATA es conocido."""
    Destino = apps.get_model("catalog", "Destino")
    for destino in Destino.objects.using(schema_editor.connection.alias).filter(latitude__isnull=True):
        datos = AEROPUERTOS.get(destino.code)
        if datos:
            destino.latitude = Decimal(str(datos[4]))
            destino.longitude = Decimal(str(datos[5]))
            destino.save(update_fields=["latitude", "longitude"])


class Migration(migrations.Migration):
    dependencies = [("catalog", "0006_itinerarios_politicas_coordenadas")]

    operations = [migrations.RunPython(cargar_coordenadas, migrations.RunPython.noop)]
