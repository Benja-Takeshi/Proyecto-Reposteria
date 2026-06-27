import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Producto, Categoria, Pedido

def inicio(request):
    productos_destacados = Producto.objects.filter(destacado=True, disponible=True)[:4]
    for prod in productos_destacados:
        if prod.descuento and prod.descuento > 0:
            prod.precio_rebajado = int(prod.precio * (100 - prod.descuento) / 100)
        else:
            prod.precio_rebajado = prod.precio
    contexto = {
        'productos_destacados': productos_destacados
    }
    return render(request, 'Reposteria_app/index.html', contexto)

def productos(request):
    lista_productos = Producto.objects.filter(disponible=True)
    lista_categorias = Categoria.objects.all()
    for prod in lista_productos:
        if prod.descuento and prod.descuento > 0:
            prod.precio_rebajado = int(prod.precio * (100 - prod.descuento) / 100)
        else:
            prod.precio_rebajado = prod.precio
    
    contexto = {
        'productos': lista_productos,
        'categorias': lista_categorias,
    }
    return render(request, 'Reposteria_app/productos.html', contexto)

@login_required
def procesar_compra(request):
    if request.method == 'POST':
        return JsonResponse({'status': 'ok', 'message': 'Pedido guardado'})

@csrf_exempt
def guardar_pedido(request):
    if request.method == 'POST':
        try:
            datos = json.loads(request.body)

            if not isinstance(datos, dict):
                return JsonResponse({'ok': False, 'error': 'Formato de datos inválido.'})

            if not datos.get('productos'):
                return JsonResponse({'ok': False, 'error': 'El carrito está vacío.'})

            detalle_productos = ""

            for item in datos['productos']:
                detalle_productos += f"- {item['nombre']} x{item['cantidad']} \n"

                try:
                    producto_db = Producto.objects.get(nombre=item['nombre'])
                    producto_db.stock = max(0, producto_db.stock - int(item['cantidad']))

                    if producto_db.stock == 0:
                        producto_db.disponible = False

                    producto_db.save()
                except Producto.DoesNotExist:
                    pass

            pedido = Pedido.objects.create(
                nombre=datos['nombre'],
                telefono=datos['telefono'],
                direccion=datos['direccion'],
                notas=datos.get('notas', ''),
                productos=detalle_productos,
                total=int(datos['total']),
                pago=datos['pago'],
                estado='pendiente'
            )

            return JsonResponse({'ok': True, 'pedido_id': pedido.id})

        except Exception as e:
            return JsonResponse({'ok': False, 'error': str(e)})

    return JsonResponse({'ok': False, 'error': 'Método no permitido'})

def registro_usuario(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"¡Bienvenido/a, {user.username}! Cuenta creada con éxito.")
            return redirect('inicio')
        else:
            messages.error(request, "Hubo un error en el registro. Por favor, verifica los datos.")
    else:
        form = UserCreationForm()
    return render(request, 'Reposteria_app/registro.html', {'form': form})

def login_usuario(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                if user.is_staff or user.is_superuser:
                    return redirect('panel_empleados')
                return redirect('inicio')

        messages.error(request, 'Usuario o contraseña incorrectos.')
    else:
        form = AuthenticationForm()

    return render(request, 'Reposteria_app/login.html', {'form': form})

def logout_usuario(request):
    logout(request)
    return redirect('inicio')

def carrito(request):
    return render(request, 'Reposteria_app/carrito.html')


# === VISTAS DEL PANEL CON PROTECCIÓN MANUAL PARA STAFF Y ADMINS ===

@login_required
def panel_empleados(request):
    if not (request.user.is_staff or request.user.is_superuser):
        messages.error(request, "No tienes permisos para acceder a esta sección.")
        return redirect('inicio')

    if request.method == 'POST':
        accion = request.POST.get('accion')
        
        # 1. GESTIÓN DE PRODUCTOS
        if accion == 'actualizar_producto':
            prod_id = request.POST.get('producto_id')
            producto = Producto.objects.get(id=prod_id)
            producto.precio = request.POST.get('precio')
            producto.stock = request.POST.get('stock')
            
            desc_valor = request.POST.get('descuento')
            producto.descuento = int(desc_valor) if desc_valor and desc_valor.strip() else 0
            
            # Recibe el checkbox correctamente del nuevo formulario
            producto.destacado = request.POST.get('destacado') == 'on'
            
            cat_id = request.POST.get('categoria_id')
            producto.categoria = Categoria.objects.get(id=cat_id)
            producto.save()
            messages.success(request, f"Producto '{producto.nombre}' actualizado.")
            
        elif accion == 'eliminar_producto':
            prod_id = request.POST.get('producto_id')
            Producto.objects.get(id=prod_id).delete()
            messages.success(request, "Producto eliminado correctamente.")

        # 2. GESTIÓN DE PEDIDOS
        elif accion == 'cambiar_estado_pedido':
            pedido_id = request.POST.get('pedido_id')
            pedido = Pedido.objects.get(id=pedido_id)
            
            if pedido.estado == 'pendiente' or pedido.estado == 'en proceso':
                pedido.estado = 'en envio'
            elif pedido.estado == 'en envio':
                pedido.estado = 'entregado'
            else:
                pedido.estado = 'en proceso'
                
            pedido.save()
            messages.success(request, f"Estado del pedido #{pedido.id} modificado.")

        # 3. CRUD DE USUARIOS CLIENTES
        elif accion == 'crear_usuario':
            User.objects.create_user(
                username=request.POST.get('username'),
                email=request.POST.get('email'),
                password=request.POST.get('password')
            )
            messages.success(request, "Usuario creado exitosamente.")
            
        elif accion == 'editar_usuario':
            user_id = request.POST.get('usuario_id')
            u = User.objects.get(id=user_id)
            u.username = request.POST.get('nuevo_username')
            u.email = request.POST.get('nuevo_email')
            u.save()
            messages.success(request, "Usuario actualizado.")
            
        elif accion == 'eliminar_usuario':
            user_id = request.POST.get('usuario_id')
            u = User.objects.get(id=user_id)
            
            if u.is_superuser:
                messages.error(request, "No tienes permisos para eliminar a un Administrador del sistema.")
            else:
                u.delete()
                messages.success(request, "Usuario eliminado con éxito.")

        return redirect('panel_empleados')

    context = {
        'productos': Producto.objects.all(),
        'categorias': Categoria.objects.all(),
        'pedidos': Pedido.objects.all().distinct().order_by('-id'),
        'clientes': User.objects.all().order_by('-is_superuser', '-is_staff', 'username')
    }
    return render(request, 'Reposteria_app/panel_empleados.html', context)


@login_required
def crear_producto_empleado(request):
    if not (request.user.is_staff or request.user.is_superuser):
        return redirect('inicio')

    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        precio = request.POST.get('precio')
        descripcion = request.POST.get('descripcion')
        imagen = request.FILES.get('imagen')
        stock = request.POST.get('stock', 0)
        cat_id = request.POST.get('categoria_id')
        categoria = Categoria.objects.get(id=cat_id) if cat_id else None
        
        Producto.objects.create(
            nombre=nombre,
            precio=precio,
            descripcion=descripcion,
            imagen=imagen,
            stock=stock,
            categoria=categoria
        )
        messages.success(request, "¡Producto creado con éxito!")
        
    return redirect('panel_empleados')


@login_required
def eliminar_pedido(request, pedido_id):
    if not (request.user.is_staff or request.user.is_superuser):
        return redirect('inicio')

    if request.method == 'POST':
        pedido = get_object_or_404(Pedido, id=pedido_id)
        pedido.delete()
        messages.success(request, "Pedido eliminado.")
    return redirect('panel_empleados')


def eliminar_usuario_panel(request, usuario_id):
    if not (request.user.is_staff or request.user.is_superuser):
        return redirect('inicio')
        
    usuario_a_borrar = get_object_or_404(User, id=usuario_id)
    
    if usuario_a_borrar.is_superuser:
        messages.error(request, "No tienes permisos para eliminar a un Administrador del sistema.")
        return redirect('panel_empleados')
        
    usuario_a_borrar.delete()
    messages.success(request, f"Usuario {usuario_a_borrar.username} eliminado correctamente.")
    return redirect('panel_empleados')