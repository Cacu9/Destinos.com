from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User

CONTRASENA = "Viajar-2026!"


class PruebasCierreSesion(APITestCase):
    def setUp(self):
        User.objects.create_user(email="ana@mail.com", password=CONTRASENA, first_name="Ana", last_name="Paz")
        self.tokens = self.client.post("/api/auth/login/", {"email": "ana@mail.com", "password": CONTRASENA}).data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens['access']}")

    def test_cerrar_sesion_invalida_el_token(self):
        cierre = self.client.post("/api/auth/logout/", {"refresh": self.tokens["refresh"]})
        renovacion = self.client.post("/api/auth/refresh/", {"refresh": self.tokens["refresh"]})

        self.assertEqual(cierre.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(renovacion.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cerrar_sesion_requiere_sesion(self):
        self.client.credentials()

        respuesta = self.client.post("/api/auth/logout/", {"refresh": self.tokens["refresh"]})

        self.assertEqual(respuesta.status_code, status.HTTP_401_UNAUTHORIZED)
