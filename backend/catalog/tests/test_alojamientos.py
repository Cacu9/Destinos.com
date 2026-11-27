from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AreaAdmin, Rol, User
from catalog.models import Alojamiento, Destino, TipoAlojamiento


class PruebasAlojamientos(APITestCase):
    url_admin = "/api/admin/accommodations/"
    url_publico = "/api/accommodations/"

    def setUp(self):
        self.admin_general = User.objects.create_user(
            email="general@mail.com", password="Viajar-2026!", role=Rol.ADMINISTRADOR, admin_area=AreaAdmin.GENERAL
        )
        self.admin_catalogo = User.objects.create_user(
            email="catalogo@mail.com", password="Viajar-2026!", role=Rol.ADMINISTRADOR, admin_area=AreaAdmin.CATALOGO
        )
        self.admin_reservas = User.objects.create_user(
            email="reservas@mail.com", password="Viajar-2026!", role=Rol.ADMINISTRADOR, admin_area=AreaAdmin.RESERVAS
        )
        self.cliente = User.objects.create_user(email="cli@mail.com", password="Viajar-2026!")

        self.payload = {
            "name": "Posada de Prueba",
            "accommodation_type": TipoAlojamiento.HOTEL,
            "destination_code": "sla",
            "city": "Salta",
            "address": "Caseros 512",
            "stars": 4,
            "price_per_night": "120000.00",
            "currency": "ARS",
            "max_guests": 4,
            "available_rooms": 5,
            "amenities": "WiFi · Desayuno",
            "cancellation_policy": "Cancelación sin cargo hasta 24 h antes.",
            "is_refundable": True,
        }

    def test_permisos_admin_general_y_catalogo(self):
        self.assertEqual(self.client.get(self.url_admin).status_code, status.HTTP_401_UNAUTHORIZED)
        for usuario in (self.admin_reservas, self.cliente):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(self.url_admin).status_code, status.HTTP_403_FORBIDDEN)

        for usuario in (self.admin_general, self.admin_catalogo):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(self.url_admin).status_code, status.HTTP_200_OK)

    def test_alta_edicion_divisa_baja_y_reactivacion(self):
        self.client.force_authenticate(self.admin_catalogo)
        creado = self.client.post(self.url_admin, self.payload, format="json")
        self.assertEqual(creado.status_code, status.HTTP_201_CREATED, creado.data)
        self.assertEqual(creado.data["destination_code"], "SLA")
        detalle = f"{self.url_admin}{creado.data['id']}/"

        self.client.force_authenticate(self.admin_general)
        editado = self.client.patch(detalle, {"price_per_night": "180.00", "currency": "USD"}, format="json")
        self.assertEqual(editado.status_code, status.HTTP_200_OK)
        self.assertEqual(editado.data["currency"], "USD")
        self.assertEqual(Decimal(editado.data["price_per_night"]), Decimal("180.00"))

        self.assertEqual(self.client.delete(detalle).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Alojamiento.objects.get(pk=creado.data["id"]).is_active)
        publicos = self.client.get(self.url_publico, {"destination": "SLA"}).data
        self.assertNotIn(creado.data["id"], [item["id"] for item in publicos])

        reactivado = self.client.post(f"{detalle}reactivate/")
        self.assertEqual(reactivado.status_code, status.HTTP_200_OK)
        self.assertTrue(reactivado.data["is_active"])

    def test_catalogo_publico_refleja_destino_y_filtros(self):
        destino = Destino.objects.get(code="BRC")
        destino.city = "San Carlos de Bariloche"
        destino.save(update_fields=["city"])

        lista = self.client.get(self.url_publico, {"destination": "BRC"}).data
        self.assertTrue(len(lista) >= 2)
        self.assertTrue(all(item["city"] == "San Carlos de Bariloche" for item in lista))

        destino.is_active = False
        destino.save(update_fields=["is_active"])
        self.assertEqual(self.client.get(self.url_publico, {"destination": "BRC"}).data, [])
