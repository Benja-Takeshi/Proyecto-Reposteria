from django.urls import path
from . import views

urlpatterns = [
    path('', views.inicio, name='inicio'),
    path('productos/', views.productos, name='productos'),
    path('guardar-pedido/', views.guardar_pedido, name='guardar_pedido'),
    path('registro/', views.registro_usuario, name='registro'),
    path('login/', views.login_usuario, name='login'),
    path('logout/', views.logout_usuario, name='logout'),
    path('carrito/', views.carrito, name='carrito'),
    path('panel-empleados/', views.panel_empleados, name='panel_empleados'),
    path('panel-empleados/nuevo/', views.crear_producto_empleado, name='crear_producto_empleado'),
    path('panel-empleados/eliminar/<int:pedido_id>/', views.eliminar_pedido, name='eliminar_pedido'),
]