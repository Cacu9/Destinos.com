from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AreaAdmin, Rol, User
from catalog.models import TipoViaje, Vuelo


class PruebasPoliticasEItinerarios(APITestCase):
    def setUp(self):
        self.catalogo = User.objects.create_user(
            email="cat@test.com", password="x", first_name="C", last_name="P",
            role=Rol.ADMINISTRADOR, admin_area=AreaAdmin.CATALOGO,
        )
        self.reservas = User.objects.create_user(
            email="res@test.com", password="x", first_name="R", last_name="O",
            role=Rol.ADMINISTRADOR, admin_area=AreaAdmin.RESERVAS,
        )
        self.salida = timezone.now().replace(microsecond=0) + timedelta(days=5)
        self.vuelo = Vuelo.objects.create(
            flight_number="AR1", airline="AR", origin_city="Buenos Aires", origin_code="AEP",
            destination_city="Mendoza", destination_code="MDZ", departure_at=self.salida,
            arrival_at=self.salida + timedelta(hours=2), base_price_ars=Decimal("1000"),
        )
        self.client.force_authenticate(self.catalogo)

    def _politica(self, datos):
        return self.client.put(f"/api/admin/flights/{self.vuelo.id}/policy/", datos, format="json")

    def test_configura_tramos_y_los_muestra_en_el_catalogo(self):
        r = self._politica({"is_non_refundable": False, "cancellation_rules": [
            {"hours_before": 24, "penalty_percent": 50}, {"hours_before": 72, "penalty_percent": 0},
        ]})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        self.assertEqual([t["hours_before"] for t in r.data["cancellation_rules"]], [72, 24])
        publico = self.client.get("/api/flights/").json()[0]
        self.assertIn("Sin cargo hasta 3 días antes", publico["cancellation_summary"])

    def test_rechaza_plazos_incoherentes(self):
        r = self._politica({"is_non_refundable": False, "cancellation_rules": [
            {"hours_before": 72, "penalty_percent": 50}, {"hours_before": 24, "penalty_percent": 10},
        ]})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cancellation_rules", r.data)

    def test_rechaza_penalizacion_fuera_de_rango_y_plazos_repetidos(self):
        r = self._politica({"is_non_refundable": False, "cancellation_rules": [{"hours_before": 24, "penalty_percent": 120}]})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        r = self._politica({"is_non_refundable": False, "cancellation_rules": [
            {"hours_before": 24, "penalty_percent": 10}, {"hours_before": 24, "penalty_percent": 20},
        ]})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_reembolsable_sin_tramos(self):
        r = self._politica({"is_non_refundable": True, "cancellation_rules": []})
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["cancellation_summary"], "No reembolsable.")

    def test_otra_area_no_configura_politicas(self):
        self.client.force_authenticate(self.reservas)
        r = self._politica({"is_non_refundable": True})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def _vuelo_con_tramos(self, tipo, tramos):
        datos = {
            "flight_number": "LA9", "airline": "LATAM", "origin_city": "Buenos Aires", "origin_code": "EZE",
            "destination_city": "Madrid", "destination_code": "MAD", "departure_at": self.salida.isoformat(),
            "arrival_at": (self.salida + timedelta(hours=12)).isoformat(), "stops": 0, "base_price_ars": "900",
            "currency": "USD", "trip_type": tipo, "legs": tramos,
        }
        return self.client.post("/api/admin/flights/", datos, format="json")

    def _tramo(self, origen, destino, dias):
        salida = self.salida + timedelta(days=dias)
        return {"flight_number": "XX2", "origin_city": origen, "origin_code": origen, "destination_city": destino,
                "destination_code": destino, "departure_at": salida.isoformat(),
                "arrival_at": (salida + timedelta(hours=2)).isoformat(), "stops": 0}

    def test_crea_multidestino_y_se_encuentra_por_cualquier_destino(self):
        r = self._vuelo_con_tramos(TipoViaje.MULTI_CITY, [self._tramo("MAD", "BCN", 3)])
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        self.assertEqual(len(r.data["legs"]), 1)
        encontrados = self.client.get("/api/flights/", {"destination": "BCN"}).json()
        self.assertEqual([v["flight_number"] for v in encontrados], ["LA9"])

    def test_ida_y_vuelta_exige_ruta_inversa(self):
        r = self._vuelo_con_tramos(TipoViaje.ROUND_TRIP, [self._tramo("MAD", "BCN", 3)])
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        r = self._vuelo_con_tramos(TipoViaje.ROUND_TRIP, [self._tramo("MAD", "EZE", 3)])
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)

    def test_solo_ida_no_lleva_tramos(self):
        r = self._vuelo_con_tramos(TipoViaje.ONE_WAY, [self._tramo("MAD", "BCN", 3)])
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
