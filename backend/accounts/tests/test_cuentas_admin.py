from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AreaAdmin, Rol, User

URL = "/api/admin/accounts/"


def crear_admin(correo: str, area: AreaAdmin) -> User:
    return User.objects.create_user(
        email=correo, password="Viajar-2026!", first_name="N", last_name="A", role=Rol.ADMINISTRADOR, admin_area=area
    )


class PruebasCuentasAdmin(APITestCase):
    def setUp(self):
        self.admin_general = crear_admin("general@mail.com", AreaAdmin.GENERAL)
        self.client.force_authenticate(self.admin_general)

    def test_crea_admin_con_area(self):
        datos = {
            "first_name": "Carla",
            "last_name": "Ruiz",
            "email": "carla@mail.com",
            "admin_area": AreaAdmin.RESERVAS,
            "password": "Viajar-2026!",
        }

        respuesta = self.client.post(URL, datos)

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        creada = User.objects.get(email="carla@mail.com")
        self.assertEqual((creada.role, creada.admin_area), (Rol.ADMINISTRADOR, AreaAdmin.RESERVAS))

    def test_el_area_es_obligatoria(self):
        respuesta = self.client.post(
            URL, {"first_name": "C", "last_name": "R", "email": "c@mail.com", "password": "Viajar-2026!"}
        )

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("admin_area", respuesta.data)

    def test_modifica_el_area(self):
        otra_cuenta = crear_admin("otro@mail.com", AreaAdmin.CATALOGO)

        respuesta = self.client.patch(f"{URL}{otra_cuenta.pk}/", {"admin_area": AreaAdmin.RESERVAS})

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        otra_cuenta.refresh_from_db()
        self.assertEqual(otra_cuenta.admin_area, AreaAdmin.RESERVAS)

    def test_eliminar_da_de_baja_sin_borrar(self):
        otra_cuenta = crear_admin("otro@mail.com", AreaAdmin.CATALOGO)

        respuesta = self.client.delete(f"{URL}{otra_cuenta.pk}/")

        self.assertEqual(respuesta.status_code, status.HTTP_204_NO_CONTENT)
        otra_cuenta.refresh_from_db()
        self.assertFalse(otra_cuenta.is_active)

    def test_no_puede_dar_de_baja_su_propia_cuenta(self):
        respuesta = self.client.delete(f"{URL}{self.admin_general.pk}/")

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)

    def test_otras_areas_y_clientes_no_tienen_acceso(self):
        admin_catalogo = crear_admin("catalogo@mail.com", AreaAdmin.CATALOGO)
        cliente = User.objects.create_user(email="cliente@mail.com", password="x", first_name="C", last_name="L")

        for usuario in (admin_catalogo, cliente):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(URL).status_code, status.HTTP_403_FORBIDDEN)
