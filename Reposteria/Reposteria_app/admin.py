from django.contrib import admin
from .models import Pedido, Producto, Categoria
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied

# Desregistra el User por defecto para usar el personalizado
admin.site.unregister(User)


# ── PEDIDOS ──────────────────────────────────────────────────────────────────
@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display    = ('id', 'nombre', 'telefono', 'total_formateado', 'pago', 'estado', 'fecha')
    list_filter     = ('estado', 'pago')
    search_fields   = ('nombre', 'telefono', 'direccion')
    list_editable   = ('estado',)
    # Campos de solo lectura para no modificar datos del pedido original
    readonly_fields = ('fecha', 'productos', 'total', 'nombre', 'telefono', 'direccion', 'notas', 'pago')

    # Muestra el total con formato de precio chileno
    def total_formateado(self, obj):
        return f"${obj.total:,}".replace(',', '.')
    total_formateado.short_description = 'Total'


# ── PRODUCTOS ─────────────────────────────────────────────────────────────────
@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display  = ('nombre', 'categoria', 'precio', 'stock', 'destacado', 'disponible')
    list_filter   = ('categoria', 'disponible', 'destacado')
    search_fields = ('nombre', 'descripcion')
    # Edición rápida desde la lista sin entrar al detalle
    list_editable = ('stock', 'destacado', 'disponible')


# ── USUARIOS ──────────────────────────────────────────────────────────────────
@admin.register(User)
class PersonalizadoUserAdmin(UserAdmin):

    # Bloquea eliminación individual si el objetivo es superusuario
    def delete_model(self, request, obj):
        if obj.is_superuser and not request.user.is_superuser:
            raise PermissionDenied("No puedes eliminar a un Administrador.")
        super().delete_model(request, obj)

    # Bloquea eliminación masiva si hay superusuarios en la selección
    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions and not request.user.is_superuser:
            original_delete = actions['delete_selected'][0]

            def safe_delete_selected(modeladmin, request, queryset):
                if queryset.filter(is_superuser=True).exists():
                    modeladmin.message_user(
                        request,
                        "Error: No puedes incluir Administradores en la eliminación masiva.",
                        level='error'
                    )
                    return
                return original_delete(modeladmin, request, queryset)

            actions['delete_selected'] = (safe_delete_selected, 'delete_selected', actions['delete_selected'][2])
        return actions


# Categoría sin configuración especial
admin.site.register(Categoria)