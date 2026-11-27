from django.db import migrations, models


DESTINOS_INICIALES = [
    ("AEP", "Aeroparque Jorge Newbery", "Buenos Aires", "Ciudad Autónoma de Buenos Aires", "Argentina"),
    ("EZE", "Ministro Pistarini (Ezeiza)", "Buenos Aires", "Buenos Aires", "Argentina"),
    ("COR", "Ingeniero Taravella", "Córdoba", "Córdoba", "Argentina"),
    ("MDZ", "El Plumerillo", "Mendoza", "Mendoza", "Argentina"),
    ("BRC", "Teniente Candelaria", "Bariloche", "Río Negro", "Argentina"),
    ("IGR", "Cataratas del Iguazú", "Puerto Iguazú", "Misiones", "Argentina"),
    ("USH", "Malvinas Argentinas", "Ushuaia", "Tierra del Fuego", "Argentina"),
    ("SLA", "Martín Miguel de Güemes", "Salta", "Salta", "Argentina"),
    ("GRU", "Guarulhos", "San Pablo", "São Paulo", "Brasil"),
    ("SCL", "Arturo Merino Benítez", "Santiago", "Región Metropolitana", "Chile"),
    ("MIA", "Internacional de Miami", "Miami", "Florida", "Estados Unidos"),
    ("MAD", "Adolfo Suárez Madrid-Barajas", "Madrid", "Comunidad de Madrid", "España"),
    ("BCN", "Josep Tarradellas Barcelona-El Prat", "Barcelona", "Cataluña", "España"),
]


def cargar_destinos(apps, schema_editor):
    destino = apps.get_model("catalog", "Destino")
    destino.objects.using(schema_editor.connection.alias).bulk_create(
        [
            destino(code=code, name=name, city=city, region=region, country=country)
            for code, name, city, region, country in DESTINOS_INICIALES
        ]
    )


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0002_tarifavuelo_currency_vuelo_currency_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Destino",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("city", models.CharField(max_length=100, verbose_name="ciudad")),
                ("region", models.CharField(max_length=100, verbose_name="provincia o estado")),
                ("country", models.CharField(max_length=100, verbose_name="país")),
                ("name", models.CharField(max_length=120, verbose_name="aeropuerto")),
                ("code", models.CharField(max_length=3, unique=True, verbose_name="código IATA")),
                ("is_active", models.BooleanField(default=True, verbose_name="activo")),
            ],
            options={
                "ordering": ["city", "code"],
            },
        ),
        migrations.RunPython(cargar_destinos, migrations.RunPython.noop),
    ]
