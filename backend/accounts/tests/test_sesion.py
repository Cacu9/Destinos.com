from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AreaAdmin, Rol, User

CONTRASENA = "Viajar-2026!"


class PruebasInicioSesion(APITestCase):
    def setUp(self):
        self.usuario = User.objects.create_user(
            email="admin@mail.com",
            password=CONTRASENA,
            first_name="Lu",
            last_name="Paz",
            role=Rol.ADMINISTRADOR,
            admin_area=AreaAdmin.CATALOGO,
        )

    def ingresar(self, contrasena=CONTRASENA):
        return self.client.post("/api/auth/login/", {"email": self.usuario.email, "password": contrasena})

    def test_devuelve_tokens_y_perfil_con_area(self):
        respuesta = self.ingresar()

        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertIn("access", respuesta.data)
        self.assertEqual(respuesta.data["user"]["admin_area"], AreaAdmin.CATALOGO)

    def test_credenciales_incorrectas(self):
        respuesta = self.ingresar(contrasena="incorrecta")

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(respuesta.data["detail"], "No corresponde a un usuario existente.")

    def test_cuenta_inactiva_no_puede_ingresar(self):
        self.usuario.is_active = False
        self.usuario.save()

        self.assertEqual(self.ingresar().status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_actual_requiere_sesion(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.ingresar().data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").data["email"], self.usuario.email)
