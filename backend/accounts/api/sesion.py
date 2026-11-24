"""UC2 · Iniciar sesión."""

from rest_framework import generics, permissions, serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.models import User


class SerializadorUsuario(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "admin_area"]
        read_only_fields = fields


class SerializadorInicioSesion(TokenObtainPairSerializer):
    default_error_messages = {"no_active_account": "No corresponde a un usuario existente."}

    def validate(self, attrs):
        datos = super().validate(attrs)
        datos["user"] = SerializadorUsuario(self.user).data
        return datos


class VistaInicioSesion(TokenObtainPairView):
    serializer_class = SerializadorInicioSesion


class VistaUsuarioActual(generics.RetrieveAPIView):
    serializer_class = SerializadorUsuario
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
