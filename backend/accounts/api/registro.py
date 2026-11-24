"""UC1 · Registrar cuenta."""

from rest_framework import generics, permissions, serializers

from accounts.campos import campo_correo_unico, validar_contrasena
from accounts.models import Rol, User


class SerializadorRegistro(serializers.ModelSerializer):
    email = campo_correo_unico()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["first_name", "last_name", "email", "password"]
        extra_kwargs = {"first_name": {"required": True}, "last_name": {"required": True}}

    def validate(self, attrs):
        perfil = {campo: valor for campo, valor in attrs.items() if campo != "password"}
        validar_contrasena(attrs["password"], User(**perfil))
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(role=Rol.CLIENTE, **validated_data)


class VistaRegistro(generics.CreateAPIView):
    serializer_class = SerializadorRegistro
    permission_classes = [permissions.AllowAny]
