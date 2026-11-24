from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import User

MENSAJE_CORREO_REGISTRADO = "El correo ya se encuentra registrado."


def campo_correo_unico() -> serializers.EmailField:
    """Un correo que ninguna otra cuenta usa, comparado sin distinguir mayúsculas."""
    return serializers.EmailField(
        validators=[UniqueValidator(User.objects.all(), message=MENSAJE_CORREO_REGISTRADO, lookup="iexact")],
    )


def validar_contrasena(contrasena: str, usuario: User | None = None) -> None:
    """Aplica los validadores de contraseña de Django e informa sus mensajes en el campo `password`."""
    try:
        validate_password(contrasena, usuario)
    except DjangoValidationError as error:
        raise serializers.ValidationError({"password": list(error.messages)}) from error
