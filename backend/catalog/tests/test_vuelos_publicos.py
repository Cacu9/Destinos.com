from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from catalog.models import ClaseCabina, TarifaVuelo, Vuelo


class PruebasVuelosPublicos(APITestCase):
    def setUp(self):
        salida = timezone.now().replace(microsecond=0) + timedelta(days=5)
        self.vuelo_brc = Vuelo.objects.create(
            flight_number="AR1680",
            airline="Aerolíneas Argentinas",
            origin_city="Buenos Aires",
            origin_code="AEP",
            destination_city="Bariloche",
            destination_code="BRC",
            departure_at=salida,
            arrival_at=salida + timedelta(hours=2, minutes=20),
            stops=0,
            base_price_ars=Decimal("200000.00"),
            cancellation_policy="Cancelación sin cargo hasta 48h antes.",
            notes="Embarque por puerta 12.",
        )
        TarifaVuelo.objects.create(
            flight=self.vuelo_brc,
            cabin_class=ClaseCabina.ECONOMY,
            price_ars=Decimal("180000.00"),
            available_seats=25,
            baggage_included="Equipaje de mano 8 kg",
            is_refundable=False,
        )
        TarifaVuelo.objects.create(
            flight=self.vuelo_brc,
            cabin_class=ClaseCabina.BUSINESS,
            price_ars=Decimal("410000.00"),
            available_seats=6,
            baggage_included="2 valijas 23 kg",
            is_refundable=True,
        )
        TarifaVuelo.objects.create(
            flight=self.vuelo_brc,
            cabin_class=ClaseCabina.FIRST,
            price_ars=Decimal("700000.00"),
            available_seats=2,
            is_active=False,
        )

        self.vuelo_mdz = Vuelo.objects.create(
            flight_number="FO5210",
            airline="Flybondi",
            origin_city="Buenos Aires",
            origin_code="EZE",
            destination_city="Mendoza",
            destination_code="MDZ",
            departure_at=salida + timedelta(days=2),
            arrival_at=salida + timedelta(days=2, hours=2),
            stops=1,
            base_price_ars=Decimal("95000.00"),
        )
        TarifaVuelo.objects.create(
            flight=self.vuelo_mdz,
            cabin_class=ClaseCabina.ECONOMY,
            price_ars=Decimal("95000.00"),
            available_seats=10,
        )

        self.vuelo_inactivo = Vuelo.objects.create(
            flight_number="XX999",
            airline="Oculta",
            origin_city="Córdoba",
            origin_code="COR",
            destination_city="Salta",
            destination_code="SLA",
            departure_at=salida + timedelta(days=3),
            arrival_at=salida + timedelta(days=3, hours=1, minutes=30),
            base_price_ars=Decimal("80000.00"),
            is_active=False,
        )

    def test_catalogo_publico_sin_login_muestra_solo_activos(self):
        respuesta = self.client.get("/api/flights/")

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        numeros = [item["flight_number"] for item in respuesta.data]
        self.assertEqual(numeros, ["AR1680", "FO5210"])

        brc = respuesta.data[0]
        self.assertEqual(Decimal(brc["min_price_ars"]), Decimal("180000.00"))
        self.assertEqual([t["cabin_class"] for t in brc["fares"]], [ClaseCabina.ECONOMY, ClaseCabina.BUSINESS])
        self.assertEqual(brc["cancellation_summary"], "Cancelación sin cargo hasta 48h antes.")
        self.assertFalse(brc["fares"][0]["is_refundable"])
        self.assertNotIn("cancellation_policy", brc)

    def test_filtros_catalogo_publico(self):
        self.assertEqual(len(self.client.get("/api/flights/?destination=bariloche").data), 1)
        self.assertEqual(len(self.client.get("/api/flights/?direct_only=true").data), 1)
        self.assertEqual(len(self.client.get("/api/flights/?cabin_class=business").data), 1)
        self.assertEqual(len(self.client.get("/api/flights/?max_price=120000").data), 1)
        self.assertEqual(len(self.client.get("/api/flights/?min_seats=20").data), 1)

        ordenados = self.client.get("/api/flights/?ordering=min_price_ars").data
        self.assertEqual([item["flight_number"] for item in ordenados], ["FO5210", "AR1680"])

    def test_detalle_requiere_sesion_y_devuelve_mas_info(self):
        url = f"/api/flights/{self.vuelo_brc.pk}/"
        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)

        cliente = User.objects.create_user(email="c@mail.com", password="Viajar-2026!", first_name="A", last_name="B")
        self.client.force_authenticate(cliente)

        respuesta = self.client.get(url)
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data["cancellation_policy"], "Cancelación sin cargo hasta 48h antes.")
        self.assertEqual(respuesta.data["notes"], "Embarque por puerta 12.")
        self.assertIn("baggage_included", respuesta.data["fares"][0])
        self.assertIn("is_refundable", respuesta.data["fares"][0])

    def test_detalle_oculta_vuelo_inactivo(self):
        cliente = User.objects.create_user(email="c@mail.com", password="Viajar-2026!", first_name="A", last_name="B")
        self.client.force_authenticate(cliente)

        respuesta = self.client.get(f"/api/flights/{self.vuelo_inactivo.pk}/")
        self.assertEqual(respuesta.status_code, status.HTTP_404_NOT_FOUND)

    def test_cambios_de_destino_se_reflejan_en_vuelos_publicos(self):
        from catalog.models import Destino

        destino = Destino.objects.get(code="BRC")
        destino.city = "San Carlos de Bariloche"
        destino.save(update_fields=["city"])
        encontrados = self.client.get("/api/flights/", {"destination": "San Carlos"}).data
        self.assertEqual([vuelo["destination_city"] for vuelo in encontrados], ["San Carlos de Bariloche"])
        destino.is_active = False
        destino.save(update_fields=["is_active"])
        self.assertEqual(self.client.get("/api/flights/", {"destination": "BRC"}).data, [])
