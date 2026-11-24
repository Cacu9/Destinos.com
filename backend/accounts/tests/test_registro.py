from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Rol, User

URL = "/api/auth/register/"
CONTRASENA = "Viajar-2026!"


class PruebasRegistro(APITestCase):
    datos = {"first_name": "Ana", "last_name": "Suárez", "email": "ana@mail.com", "password": CONTRASENA}

    def test_registra_un_cliente(self):
        respuesta = self.client.post(URL, self.datos)

        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        usuario = User.objects.get(email="ana@mail.com")
        self.assertEqual(usuario.role, Rol.CLIENTE)
        self.assertTrue(usuario.check_password(CONTRASENA))
        self.assertNotIn("password", respuesta.data)

    def test_exige_todos_los_campos(self):
        respuesta = self.client.post(URL, {})

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(respuesta.data), {"first_name", "last_name", "email", "password"})

    def test_rechaza_correo_invalido(self):
        respuesta = self.client.post(URL, {**self.datos, "email": "no-es-un-correo"})

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", respuesta.data)

    def test_rechaza_correo_ya_registrado(self):
        User.objects.create_user(email="ana@mail.com", password=CONTRASENA, first_name="A", last_name="B")

        respuesta = self.client.post(URL, {**self.datos, "email": "ANA@mail.com"})

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(respuesta.data["email"], ["El correo ya se encuentra registrado."])

    def test_rechaza_contrasena_debil(self):
        respuesta = self.client.post(URL, {**self.datos, "password": "12345678"})

        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", respuesta.data)
