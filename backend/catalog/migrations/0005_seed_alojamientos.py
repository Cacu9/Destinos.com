from decimal import Decimal

from django.db import migrations


ALOJAMIENTOS_INICIALES = [
    ("Llao Llao Resort", "resort", "BRC", "Bariloche", "Av. Ezequiel Bustillo Km 25", 5, Decimal("420.00"), "USD", 4, 8, "Spa · Pileta climatizada · Desayuno", "Cancelación sin cargo hasta 72 h antes del check-in.", True),
    ("Cabañas Nahuel", "cabin", "BRC", "Bariloche", "Los Coihues 410", 4, Decimal("145000.00"), "ARS", 6, 5, "WiFi · Cocina equipada · Parrilla", "Cancelación con cargo del 20 % hasta 48 h antes.", True),
    ("Park Hyatt Mendoza", "hotel", "MDZ", "Mendoza", "Chile 1124", 5, Decimal("285000.00"), "ARS", 3, 12, "WiFi · Desayuno · Gimnasio · Pileta", "Cancelación gratuita hasta 24 h antes.", True),
    ("Loft Arístides", "apartment", "MDZ", "Mendoza", "Arístides Villanueva 340", 3, Decimal("78000.00"), "ARS", 4, 4, "WiFi · Aire acondicionado · Cocina", "Tarifa promocional sin reembolso.", False),
    ("Selva Iguazú Lodge", "cabin", "IGR", "Puerto Iguazú", "Ruta Nacional 12 Km 5", 4, Decimal("132000.00"), "ARS", 4, 7, "Pileta · Desayuno regional · Estacionamiento", "Cancelación sin cargo hasta 48 h antes.", True),
    ("Hostel Fin del Mundo", "hostel", "USH", "Ushuaia", "San Martín 910", 2, Decimal("46500.00"), "ARS", 2, 14, "WiFi · Cocina compartida · Guardaequipaje", "Sin reembolso. Permite cambio de fecha.", False),
    ("Hotel Alvear Recoleta", "hotel", "AEP", "Buenos Aires", "Av. Alvear 1891", 5, Decimal("390.00"), "USD", 2, 10, "Spa · Desayuno · Traslado al aeropuerto", "Cancelación sin cargo hasta 24 h antes.", True),
    ("Ocean Drive Miami Suites", "apartment", "MIA", "Miami", "1220 Ocean Dr, Miami Beach", 4, Decimal("260.00"), "USD", 4, 9, "WiFi · Acceso a playa · Cocina", "Cancelación sin cargo hasta 72 h antes.", True),
    ("Gran Vía Boutique", "hotel", "MAD", "Madrid", "Gran Vía 42", 4, Decimal("210.00"), "USD", 3, 11, "WiFi · Desayuno · Recepción 24 h", "Reembolso completo hasta 48 h antes.", True),
]


def cargar_alojamientos(apps, schema_editor):
    Alojamiento = apps.get_model("catalog", "Alojamiento")
    Alojamiento.objects.using(schema_editor.connection.alias).bulk_create(
        [
            Alojamiento(
                name=name,
                accommodation_type=tipo,
                destination_code=code,
                city=city,
                address=address,
                stars=stars,
                price_per_night=price,
                currency=currency,
                max_guests=guests,
                available_rooms=rooms,
                amenities=amenities,
                cancellation_policy=policy,
                is_refundable=refundable,
            )
            for name, tipo, code, city, address, stars, price, currency, guests, rooms, amenities, policy, refundable in ALOJAMIENTOS_INICIALES
        ]
    )


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0004_alojamiento"),
    ]

    operations = [
        migrations.RunPython(cargar_alojamientos, migrations.RunPython.noop),
    ]
