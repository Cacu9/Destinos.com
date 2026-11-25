from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AreaAdmin, Rol, User
from catalog.models import ClaseCabina, Vuelo

URL = "/api/admin/flights/"


def crear_usuario_admin(correo: str, area: AreaAdmin) -> User:
    return User.objects.create_user(
        email=correo, password="Viajar-2026!", first_name="N", last_name="A", role=Rol.ADMINISTRADOR, admin_area=area
    )


class PruebasVuelosAdmin(APITestCase):
    def setUp(self):
        self.admin_general = crear_usuario_admin("general@mail.com", AreaAdmin.GENERAL)
        self.admin_catalogo = crear_usuario_admin("catalogo@mail.com", AreaAdmin.CATALOGO)
        self.admin_reservas = crear_usuario_admin("reservas@mail.com", AreaAdmin.RESERVAS)
        self.cliente = User.objects.create_user(email="cli@mail.com", password="Viajar-2026!", first_name="C", last_name="L")

        self.salida = timezone.now().replace(microsecond=0) + timedelta(days=10)
        self.payload = {
            "flight_number": "ar1234",
            "airline": "Aerolíneas Argentinas",
            "origin_city": "Buenos Aires",
            "origin_code": "eze",
            "destination_city": "Madrid",
            "destination_code": "mad",
            "departure_at": self.salida.isoformat(),
            "arrival_at": (self.salida + timedelta(hours=12)).isoformat(),
            "stops": 0,
            "base_price_ars": "950000.00",
            "cancellation_policy": "Sin devolución en promo.",
            "fares": [
                {
                    "cabin_class": ClaseCabina.ECONOMY,
                    "price_ars": "950000.00",
                    "available_seats": 100,
                    "baggage_included": "1 valija 23 kg",
                    "is_refundable": False,
                },
                {
                    "cabin_class": ClaseCabina.BUSINESS,
                    "price_ars": "2200000.00",
                    "available_seats": 14,
                    "baggage_included": "2 valijas 23 kg",
                    "is_refundable": True,
                },
            ],
        }

    def test_solo_admin_general_y_catalogo_pueden_acceder(self):
        self.assertEqual(self.client.get(URL).status_code, status.HTTP_401_UNAUTHORIZED)

        for usuario in (self.admin_reservas, self.cliente):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.post(URL, self.payload, format="json").status_code, status.HTTP_403_FORBIDDEN)

        for usuario in (self.admin_general, self.admin_catalogo):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(URL).status_code, status.HTTP_200_OK)

    def test_crea_vuelo_con_tarifas_y_normaliza_codigos(self):
        self.client.force_authenticate(self.admin_catalogo)

        respuesta = self.client.post(URL, self.payload, format="json")

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data["flight_number"], "AR1234")
        self.assertEqual(respuesta.data["origin_code"], "EZE")
        self.assertEqual(respuesta.data["destination_code"], "MAD")
        self.assertEqual(len(respuesta.data["fares"]), 2)
        self.assertEqual(Decimal(respuesta.data["min_price_ars"]), Decimal("950000.00"))

    def test_admin_general_edita_da_de_baja_y_reactiva_vuelo(self):
        self.client.force_authenticate(self.admin_general)
        creado = self.client.post(URL, self.payload, format="json").data
        url_detalle = f"{URL}{creado['id']}/"

        editado = self.client.patch(url_detalle, {"base_price_ars": "990000.00"}, format="json")
        self.assertEqual(editado.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(editado.data["base_price_ars"]), Decimal("990000.00"))

        baja = self.client.delete(url_detalle)
        self.assertEqual(baja.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Vuelo.objects.get(pk=creado["id"]).is_active)

        reactivado = self.client.post(f"{url_detalle}reactivate/")
        self.assertEqual(reactivado.status_code, status.HTTP_200_OK)
        self.assertTrue(reactivado.data["is_active"])

    def test_validaciones_vuelo(self):
        self.client.force_authenticate(self.admin_catalogo)

        invalido_fechas = {**self.payload, "arrival_at": self.salida.isoformat()}
        self.assertIn("arrival_at", self.client.post(URL, invalido_fechas, format="json").data)

        invalido_ruta = {**self.payload, "destination_code": "EZE"}
        self.assertIn("destination_code", self.client.post(URL, invalido_ruta, format="json").data)

        invalido_clases = {
            **self.payload,
            "fares": [self.payload["fares"][0], self.payload["fares"][0]],
        }
        self.assertIn("fares", self.client.post(URL, invalido_clases, format="json").data)
