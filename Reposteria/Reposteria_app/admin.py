from django.contrib import admin
from .models import Pedido, Producto, Categoria
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
admin.site.unregister(User)

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display  = ('id', 'nombre', 'telefono', 'total_formateado', 'pago', 'estado', 'fecha')
    list_filter   = ('estado', 'pago')
    search_fields = ('nombre', 'telefono', 'direccion')
    list_editable = ('estado',)
    readonly_fields = ('fecha', 'productos', 'total', 'nombre', 'telefono', 'direccion', 'notas', 'pago')

    def total_formateado(self, obj):
        return f"${obj.total:,}".replace(',', '.')
    total_formateado.short_description = 'Total'

@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'destacado', 'disponible')
    list_filter = ('categoria', 'disponible', 'destacado')
    search_fields = ('nombre', 'descripcion')
    list_editable = ('stock', 'destacado', 'disponible')

@admin.register(User)
class PersonalizadoUserAdmin(UserAdmin):
    
    # Bloquea la eliminación individual (desde el formulario de edición)
    def delete_model(self, request, obj):
        if obj.is_superuser and not request.user.is_superuser:
            raise PermissionDenied("No puedes eliminar a un Administrador.")
        super().delete_model(request, obj)

    # Bloquea la eliminación masiva (desde la lista de usuarios seleccionando la acción en lote)
    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions and not request.user.is_superuser:
            # Reemplazamos la acción por defecto por una segura
            original_delete = actions['delete_selected'][0]
            
            def safe_delete_selected(modeladmin, request, queryset):
                if queryset.filter(is_superuser=True).exists():
                    modeladmin.message_user(request, "Error: No puedes incluir Administradores en la eliminación masiva.", level='error')
                    return
                return original_delete(modeladmin, request, queryset)
                
            actions['delete_selected'] = (safe_delete_selected, 'delete_selected', actions['delete_selected'][2])
        return actions

admin.site.register(Categoria)