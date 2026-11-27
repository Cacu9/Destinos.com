from rest_framework.test import APITestCase

from accounts.models import AreaAdmin, Rol, User


class PruebasDestinos(APITestCase):
    url = "/api/admin/destinations/"
    datos = {"city": "Rosario", "region": "Santa Fe", "country": "Argentina", "name": "Islas Malvinas", "code": "ros"}

    def setUp(self):
        self.admin = User.objects.create_user(
            email="catalogo@destinos.com", password="Prueba123!", role=Rol.ADMINISTRADOR, admin_area=AreaAdmin.CATALOGO
        )

    def test_alta_edicion_baja_y_reactivacion_se_reflejan_en_el_catalogo(self):
        self.client.force_authenticate(self.admin)
        alta = self.client.post(self.url, self.datos, format="json")
        self.assertEqual(alta.status_code, 201, alta.data)
        self.assertEqual(alta.data["code"], "ROS")
        detalle = f"{self.url}{alta.data['id']}/"

        self.assertEqual(self.client.patch(detalle, {"name": "Aeropuerto de Rosario"}).status_code, 200)
        publico = self.client.get("/api/airports/")
        self.assertIn("Aeropuerto de Rosario", [destino["name"] for destino in publico.data])

        self.assertEqual(self.client.delete(detalle).status_code, 204)
        self.assertFalse(self.client.get(detalle).data["is_active"])
        self.assertNotIn("ROS", [destino["code"] for destino in self.client.get("/api/airports/").data])

        reactivado = self.client.post(f"{detalle}reactivate/")
        self.assertEqual(reactivado.status_code, 200)
        self.assertTrue(reactivado.data["is_active"])
        self.assertIn("ROS", [destino["code"] for destino in self.client.get("/api/airports/").data])

    def test_permisos_y_validacion(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.get("/api/airports/").status_code, 200)
        admin_general = User.objects.create_user(email="general@destinos.com", password="Prueba123!", role=Rol.ADMINISTRADOR, admin_area=AreaAdmin.GENERAL)
        self.client.force_authenticate(admin_general)
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.post(self.url, {**self.datos, "region": ""}).status_code, 400)
        self.assertEqual(self.client.post(self.url, {**self.datos, "city": "   "}).status_code, 400)
        self.assertEqual(self.client.post(self.url, {**self.datos, "code": "aep"}).status_code, 400)
