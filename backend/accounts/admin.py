from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as AdminUsuarioBase

from .models import User


@admin.register(User)
class AdminUsuario(AdminUsuarioBase):
    ordering = ["email"]
    list_display = ["email", "first_name", "last_name", "role", "admin_area", "is_active"]
    list_filter = ["role", "admin_area", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    fieldsets = [
        (None, {"fields": ["email", "password"]}),
        ("Datos personales", {"fields": ["first_name", "last_name"]}),
        ("Acceso", {"fields": ["role", "admin_area", "is_active", "is_staff", "is_superuser"]}),
    ]
    add_fieldsets = [
        (None, {"fields": ["email", "first_name", "last_name", "role", "admin_area", "password1", "password2"]}),
    ]
