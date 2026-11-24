from django.core.management.base import BaseCommand

from accounts.models import AreaAdmin, Rol, User

CONTRASENA_DEMO = "Destinos2026!"

USUARIOS_DEMO = [
    ("admin@destinos.com", "Lucía", "Fernández", Rol.ADMINISTRADOR, AreaAdmin.GENERAL),
    ("catalogo@destinos.com", "Martín", "Gómez", Rol.ADMINISTRADOR, AreaAdmin.CATALOGO),
    ("reservas@destinos.com", "Sofía", "Ramírez", Rol.ADMINISTRADOR, AreaAdmin.RESERVAS),
    ("cliente@destinos.com", "Juan", "Pérez", Rol.CLIENTE, ""),
]


class Command(BaseCommand):
    help = "Crea un administrador por área y un cliente de demostración."

    def handle(self, *args, **options):
        for correo, nombre, apellido, rol, area in USUARIOS_DEMO:
            if not User.objects.filter(email=correo).exists():
                User.objects.create_user(
                    email=correo,
                    password=CONTRASENA_DEMO,
                    first_name=nombre,
                    last_name=apellido,
                    role=rol,
                    admin_area=area,
                )
        self.stdout.write(self.style.SUCCESS(f"Usuarios de demostración listos. Contraseña: {CONTRASENA_DEMO}"))
