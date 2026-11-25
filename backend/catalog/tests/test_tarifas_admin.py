from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AreaAdmin, Rol, User
from catalog.models import ClaseCabina, TarifaVuelo, Vuelo


class PruebasTarifasAdmin(APITestCase):
    def setUp(self):
        self.admin_general = User.objects.create_user(
            email="general@mail.com",
            password="Viajar-2026!",
            first_name="G",
            last_name="A",
            role=Rol.ADMINISTRADOR,
            admin_area=AreaAdmin.GENERAL,
        )
        self.admin_catalogo = User.objects.create_user(
            email="catalogo@mail.com",
            password="Viajar-2026!",
            first_name="C",
            last_name="A",
            role=Rol.ADMINISTRADOR,
            admin_area=AreaAdmin.CATALOGO,
        )
        self.admin_reservas = User.objects.create_user(
            email="reservas@mail.com",
            password="Viajar-2026!",
            first_name="R",
            last_name="A",
            role=Rol.ADMINISTRADOR,
            admin_area=AreaAdmin.RESERVAS,
        )

        salida = timezone.now().replace(microsecond=0) + timedelta(days=15)
        self.vuelo = Vuelo.objects.create(
            flight_number="AR1840",
            airline="Aerolíneas Argentinas",
            origin_city="Buenos Aires",
            origin_code="AEP",
            destination_city="Ushuaia",
            destination_code="USH",
            departure_at=salida,
            arrival_at=salida + timedelta(hours=3, minutes=35),
            base_price_ars=Decimal("220000.00"),
        )
        self.url_vuelo_tarifas = f"/api/admin/flights/{self.vuelo.pk}/fares/"

    def test_flujo_completo_tarifas_y_validacion_clase_unica(self):
        self.client.force_authenticate(self.admin_catalogo)

        creada = self.client.post(
            self.url_vuelo_tarifas,
            {
                "cabin_class": ClaseCabina.ECONOMY,
                "price_ars": "220000.00",
                "available_seats": 40,
                "baggage_included": "Carry-on 8 kg",
                "is_refundable": False,
            },
            format="json",
        )
        self.assertEqual(creada.status_code, status.HTTP_201_CREATED)
        tarifa_id = creada.data["id"]

        duplicada = self.client.post(
            self.url_vuelo_tarifas,
            {"cabin_class": ClaseCabina.ECONOMY, "price_ars": "210000.00", "available_seats": 10},
            format="json",
        )
        self.assertEqual(duplicada.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cabin_class", duplicada.data)

        self.client.force_authenticate(self.admin_general)
        listado = self.client.get(self.url_vuelo_tarifas)
        self.assertEqual(listado.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listado.data), 1)

        url_tarifa = f"/api/admin/fares/{tarifa_id}/"
        editada = self.client.patch(url_tarifa, {"price_ars": "235000.00", "is_refundable": True}, format="json")
        self.assertEqual(editada.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(editada.data["price_ars"]), Decimal("235000.00"))
        self.assertTrue(editada.data["is_refundable"])

        baja = self.client.delete(url_tarifa)
        self.assertEqual(baja.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(TarifaVuelo.objects.get(pk=tarifa_id).is_active)

        reactivada = self.client.post(f"{url_tarifa}reactivate/")
        self.assertEqual(reactivada.status_code, status.HTTP_200_OK)
        self.assertTrue(reactivada.data["is_active"])

    def test_vuelo_inexistente_y_permisos_otras_areas(self):
        self.client.force_authenticate(self.admin_catalogo)
        self.assertEqual(self.client.get("/api/admin/flights/9999/fares/").status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(self.admin_reservas)
        self.assertEqual(self.client.get(self.url_vuelo_tarifas).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(
                self.url_vuelo_tarifas,
                {"cabin_class": ClaseCabina.ECONOMY, "price_ars": "100000.00", "available_seats": 5},
                format="json",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
