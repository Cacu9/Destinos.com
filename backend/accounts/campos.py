from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import User

MENSAJE_CORREO_REGISTRADO = "El correo ya se encuentra registrado."
MENSAJE_CORREO_INVALIDO = "Ingresá un correo válido, por ejemplo nombre@gmail.com."
MENSAJE_CORREO_CON_ACENTOS = "El correo no puede tener ñ ni tildes antes del @ (por ejemplo, usá «castana» en vez de «castaña»)."


class CampoCorreo(serializers.EmailField):
    """Correo con mensajes claros: avisa puntualmente si el problema es una ñ o una tilde."""

    def run_validation(self, data=serializers.empty):
        if isinstance(data, str) and "@" in data and not data.split("@", 1)[0].isascii():
            raise serializers.ValidationError(MENSAJE_CORREO_CON_ACENTOS)
        return super().run_validation(data)


def campo_correo_unico() -> serializers.EmailField:
    """Un correo que ninguna otra cuenta usa, comparado sin distinguir mayúsculas."""
    return CampoCorreo(
        error_messages={"invalid": MENSAJE_CORREO_INVALIDO},
        validators=[UniqueValidator(User.objects.all(), message=MENSAJE_CORREO_REGISTRADO, lookup="iexact")],
    )


def validar_contrasena(contrasena: str, usuario: User | None = None) -> None:
    """Aplica los validadores de contraseña de Django e informa sus mensajes en el campo `password`."""
    try:
        validate_password(contrasena, usuario)
    except DjangoValidationError as error:
        raise serializers.ValidationError({"password": list(error.messages)}) from error
