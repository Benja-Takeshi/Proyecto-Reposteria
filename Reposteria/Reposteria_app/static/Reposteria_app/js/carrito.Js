// ── ESTADO GLOBAL ───────────────────────────────────────────────────────────
const esAutenticado = () => window.usuarioAutenticado === true || window.usuarioAutenticado === 'true';

let carrito = esAutenticado() ? JSON.parse(localStorage.getItem('carrito') || '[]') : [];
let pagoSeleccionado = 'transferencia';

// ── PERSISTENCIA ────────────────────────────────────────────────────────────
function guardarCarrito() {
  if (esAutenticado()) localStorage.setItem('carrito', JSON.stringify(carrito));
  else { localStorage.removeItem('carrito'); carrito = []; }
}

// ── NAVBAR ──────────────────────────────────────────────────────────────────
function actualizarContadorNavbar() {
  const el = document.getElementById('carrito-count-nav');
  if (el) el.textContent = carrito.reduce((s, p) => s + p.cantidad, 0);
}

// ── PANEL FLOTANTE ──────────────────────────────────────────────────────────
function abrirCarrito() {
  document.getElementById('carrito-panel')?.classList.add('abierto');
  document.getElementById('overlay')?.classList.add('visible');
}

function cerrarCarrito() {
  document.getElementById('carrito-panel')?.classList.remove('abierto');
  document.getElementById('overlay')?.classList.remove('visible');
}

function manejarClickCarrito(urlCarrito) {
  location.href = urlCarrito;
}

// ── AGREGAR CON CONTROL DE STOCK REAL EN TIENDA ─────────────────────────────
function agregarConStock(idProducto, nombre, precio, btn, imagen = '') {
  if (!esAutenticado()) {
    if (confirm('Para agregar productos necesitas iniciar sesión. ¿Quieres ir al login?'))
      window.location.href = '/login/';
    return;
  }

  const stockEl = document.getElementById(`stock-val-${idProducto}`);
  const existe = carrito.find(p => p.nombre === nombre);

  // Si la etiqueta existe en pantalla, calculamos basándonos en el DOM
  if (stockEl) {
    let stockActualHTML = parseInt(stockEl.textContent) || 0;

    if (stockActualHTML <= 0) {
      alert(`⚠️ Lo sentimos, "${nombre}" se encuentra temporalmente agotado.`);
      return;
    }

    const stockOriginalTotal = stockActualHTML + (existe ? existe.cantidad : 0);

    if (existe) {
      existe.cantidad++;
    } else {
      carrito.push({ nombre, precio, cantidad: 1, imagen, stockMaximo: stockOriginalTotal });
    }

    // Restamos 1 al stock visual en la tarjeta
    stockEl.textContent = stockActualHTML - 1;
  } else {
    // Caída segura si se ejecuta desde una vista sin el tag de stock
    agregar(nombre, precio, btn, imagen);
    return;
  }

  guardarCarrito();
  actualizarContadorNavbar();
  actualizarCarrito();

  if (btn) {
    btn.textContent = 'Agregado';
    btn.style.background = '#4caf50';
    setTimeout(() => { btn.textContent = 'Agregar'; btn.style.background = ''; }, 1000);
  }
}

// Método fallback clásico
function agregar(nombre, precio, btn, imagen = '', stockMaximo = 999) {
  if (!esAutenticado()) {
    if (confirm('Para agregar productos necesitas iniciar sesión. ¿Quieres ir al login?'))
      window.location.href = '/login/';
    return;
  }

  const existe = carrito.find(p => p.nombre === nombre);
  if (existe) {
    if (existe.cantidad >= stockMaximo) {
      alert(`⚠️ Lo sentimos, no queda más stock disponible de "${nombre}".`);
      return;
    }
    existe.cantidad++;
  } else {
    if (stockMaximo <= 0) {
      alert(`⚠️ Lo sentimos, "${nombre}" se encuentra agotado.`);
      return;
    }
    carrito.push({ nombre, precio, cantidad: 1, imagen, stockMaximo });
  }

  guardarCarrito();
  actualizarCarrito();
}

function cambiarCantidad(nombre, delta) {
  const item = carrito.find(p => p.nombre === nombre);
  if (!item) return;

  // Validación de stock máximo al sumar desde el panel lateral
  if (delta > 0 && item.stockMaximo !== undefined && item.cantidad >= item.stockMaximo) {
    alert(`⚠️ Límite alcanzado. No hay más stock disponible de este producto (${item.stockMaximo} u.).`);
    return;
  }

  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter(p => p.nombre !== nombre);
  guardarCarrito();
  actualizarCarrito();
}

function eliminarItem(nombre) {
  carrito = carrito.filter(p => p.nombre !== nombre);
  guardarCarrito();
  actualizarCarrito();
  renderizarListaCarrito();
}

// ── ACTUALIZAR UI GENERAL ───────────────────────────────────────────────────
function actualizarCarrito() {
  guardarCarrito();
  actualizarContadorNavbar();

  const count = carrito.reduce((s, p) => s + p.cantidad, 0);
  const total = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);

  const el = (id) => document.getElementById(id);

  if (el('carrito-count')) el('carrito-count').textContent = count;
  if (el('carrito-total')) el('carrito-total').textContent = '$' + total.toLocaleString('es-CL');

  const container = el('carrito-items');
  if (container) {
    container.innerHTML = carrito.length === 0
      ? '<div class="carrito-vacio">No hay productos todavía.<br>Agrega algo rico!</div>'
      : carrito.map(p => `
          <div class="item-carrito">
            <div class="item-info">
              <strong>${p.nombre}</strong>
              <span>$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
            </div>
            <div class="item-controles">
              <button onclick="cambiarCantidad('${p.nombre}', -1)">−</button>
              <span class="item-cantidad">${p.cantidad}</span>
              <button onclick="cambiarCantidad('${p.nombre}', 1)">+</button>
            </div>
          </div>`).join('');
  }

  if (el('carrito-lista-items')) renderizarListaCarrito();
}

// ── FILTROS ─────────────────────────────────────────────────────────────────
function filtrar(cat, btn) {
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
  if (btn) btn.classList.add('activo');

  let visibles = 0;
  document.querySelectorAll('.product-item').forEach(item => {
    const mostrar = cat === 'todos' || item.dataset.cat === cat;
    item.style.display = mostrar ? '' : 'none';
    if (mostrar) visibles++;
  });

  const sinRes = document.getElementById('sin-resultados');
  if (sinRes) sinRes.style.display = visibles === 0 ? 'block' : 'none';
}

// ── FORMULARIO PANEL (productos.html) ──────────────────────────────────────
function abrirFormulario() {
  if (carrito.length === 0) { alert('Agrega al menos un producto.'); return; }
  cerrarCarrito();
  const total = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const resumenEl = document.getElementById('resumen-items');
  if (resumenEl) resumenEl.innerHTML = carrito.map(p =>
    `<div class="resumen-item">
      <span>${p.nombre} x${p.cantidad}</span>
      <span>$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
    </div>`).join('');
  const totalModal = document.getElementById('resumen-total-modal');
  if (totalModal) totalModal.textContent = '$' + total.toLocaleString('es-CL');
  document.getElementById('modal')?.classList.add('visible');
}

function cerrarFormulario() {
  document.getElementById('modal')?.classList.remove('visible');
}

function seleccionarPago(tipo) {
  pagoSeleccionado = tipo;
  document.getElementById('pago-transferencia')?.classList.toggle('seleccionado', tipo === 'transferencia');
  document.getElementById('pago-efectivo')?.classList.toggle('seleccionado', tipo === 'efectivo');
}

// ── CONFIRMAR PEDIDO ────────────────────────────────────────────────────────
async function confirmarPedido() {
  if (!esAutenticado()) {
    alert('Necesitas iniciar sesión para confirmar tu pedido.');
    window.location.href = '/login/';
    return;
  }

  const val = (id) => document.getElementById(id)?.value.trim() || '';
  const nombre    = val('nombre');
  const telefono  = val('telefono');
  const direccion = val('direccion');
  const notas     = val('notes') || val('notas');

  if (!nombre || !telefono || !direccion) {
    alert('Por favor completa nombre, teléfono y dirección.');
    return;
  }

  const total = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const btn = document.getElementById('btn-confirmar-pedido') || document.getElementById('btn-confirmar');
  if (btn) { btn.textContent = '⏳ Procesando compra... No cierre la página'; btn.disabled = true; }

  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';

  try {
    const res = await fetch('/guardar-pedido/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRFToken': csrfToken
      },
      body: JSON.stringify({ nombre, telefono, direccion, notas, productos: carrito, total, pago: pagoSeleccionado })
    });
    const data = await res.json();

    if (data.ok) {
      const contenedor = document.getElementById('confirmacion-box') || document.getElementById('modal-contenido');
      if (contenedor) {
        contenedor.style.display = 'block';
        contenedor.innerHTML = `
          <div class="confirmacion text-center p-3">
            <h2>Pedido confirmado 🎉</h2>
            <p>Gracias <strong>${nombre}</strong>, tu pedido fue registrado correctamente.</p>
            <div class="detalle-confirmacion my-3 p-3 bg-light rounded text-start" style="font-size:0.95rem; color:#555;">
              <p class="m-1"><strong>Código de pedido:</strong> #${data.pedido_id}</p>
              <p class="m-1"><strong>Teléfono:</strong> ${telefono}</p>
              <p class="m-1"><strong>Dirección:</strong> ${direccion}</p>
              <p class="m-1"><strong>Pago:</strong> ${pagoSeleccionado === 'transferencia' ? 'Transferencia bancaria' : 'Efectivo'}</p>
            </div>
            <p class="small text-muted">Te contactaremos pronto para coordinar la entrega.</p>
            <button class="btn btn-sm text-white mt-2 px-4" style="background-color: #b85a1c; border-radius:50px;" onclick="location.reload()">Volver a la tienda</button>
          </div>`;
      }
      
      const form = document.getElementById('formulario-pedido');
      if (form) form.style.display = 'none';

      carrito = [];
      localStorage.removeItem('carrito');
      actualizarCarrito();
    } else {
      alert('Hubo un error al enviar el pedido: ' + (data.error || 'Intenta de nuevo.'));
      if (btn) { btn.textContent = 'Confirmar Compra'; btn.disabled = false; }
    }
  } catch (error) {
    console.error(error);
    alert('Error de conexión. Intenta de nuevo.');
    if (btn) { btn.textContent = 'Confirmar Compra'; btn.disabled = false; }
  }
}

// ── PÁGINA CARRITO (carrito.html) ───────────────────────────────────────────
function renderizarListaCarrito() {
  const container  = document.getElementById('carrito-lista-items');
  const vacioMsg   = document.getElementById('carrito-vacio-msg');
  const formulario = document.getElementById('formulario-pedido');
  if (!container) return;

  if (carrito.length === 0) {
    if (vacioMsg)   vacioMsg.style.display = 'block';
    container.innerHTML = '';
    if (formulario) formulario.style.display = 'none';
    actualizarResumenPage();
    return;
  }

  if (vacioMsg)   vacioMsg.style.display = 'none';
  if (formulario) formulario.style.display = 'block';

  container.innerHTML = carrito.map(p => `
    <div class="item-carrito-page">
      <div class="item-img-wrap">
        ${p.imagen
          ? `<img src="${p.imagen}" alt="${p.nombre}" class="item-img">`
          : `<div class="item-img-placeholder"></div>`}
      </div>
      <div class="item-detalles">
        <strong>${p.nombre}</strong>
        <span class="item-precio-unit">$${p.precio.toLocaleString('es-CL')} c/u</span>
      </div>
      <div class="item-controles-page">
        <button onclick="cambiarCantidadPage('${p.nombre}', -1)">−</button>
        <span class="item-cantidad-page">${p.cantidad}</span>
        <button onclick="cambiarCantidadPage('${p.nombre}', 1)">+</button>
      </div>
      <span class="item-subtotal">$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
      <button class="btn-eliminar" onclick="eliminarItem('${p.nombre}')" title="Eliminar">✕</button>
    </div>`).join('');

  actualizarResumenPage();
}

function actualizarResumenPage() {
  const total     = carrito.reduce((s, p) => s + p.precio * p.cantidad, 0);
  const resumenEl = document.getElementById('resumen-items-page');
  const totalEl   = document.getElementById('resumen-total-page');

  if (resumenEl) resumenEl.innerHTML = carrito.length === 0
    ? '<p style="color:#7a5a3a;font-size:0.88rem;">No hay productos.</p>'
    : carrito.map(p => `
        <div class="resumen-item-page">
          <span>${p.nombre} x${p.cantidad}</span>
          <span>$${(p.precio * p.cantidad).toLocaleString('es-CL')}</span>
        </div>`).join('');

  if (totalEl) totalEl.textContent = '$' + total.toLocaleString('es-CL');
}

// Validación de stock máximo al sumar desde la vista final del carrito
function cambiarCantidadPage(nombre, delta) {
  const item = carrito.find(p => p.nombre === nombre);
  if (!item) return;

  if (delta > 0 && item.stockMaximo !== undefined && item.cantidad >= item.stockMaximo) {
    alert(`⚠️ Límite alcanzado. No puedes agregar más unidades, stock máximo: ${item.stockMaximo} u.`);
    return;
  }

  cambiarCantidad(nombre, delta);
  renderizarListaCarrito();
}

// ── INICIALIZAR ─────────────────────────────────────────────────────────────
actualizarCarrito();
if (document.getElementById('carrito-lista-items'))
  document.addEventListener('DOMContentLoaded', renderizarListaCarrito);

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-confirmar-pedido');
  if (btn) btn.addEventListener('click', confirmarPedido);
});

// ── SCOPE GLOBAL ────────────────────────────────────────────────────────────
Object.assign(window, {
  agregar, cambiarCantidad, eliminarItem,
  agregarConStock,
  abrirCarrito, cerrarCarrito, manejarClickCarrito,
  abrirFormulario, cerrarFormulario,
  seleccionarPago, confirmarPedido, filtrar,
  cambiarCantidadPage, renderizarListaCarrito,
});

function eliminarPedidoAjax(event, url, pedidoId) {
    event.preventDefault();

    if (!confirm('¿Seguro que deseas eliminar este pedido permanentemente?')) {
        return;
    }

    const csrfToken = event.target.querySelector('[name=csrfmiddlewaretoken]').value;

    fetch(url, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            const fila = document.getElementById(`fila-pedido-${pedidoId}`);
            if (fila) {
                fila.style.transition = 'all 0.4s ease';
                fila.style.opacity = '0';
                fila.style.backgroundColor = '#f8d7da';
                
                setTimeout(() => { fila.remove(); }, 400);
            }
        } else {
            alert('Hubo un error al intentar eliminar el pedido.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('No se pudo conectar con el servidor.');
    });
}