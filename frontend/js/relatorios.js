const API_URL = '/api';

// Verificar autenticação e permissão
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

if (!token || usuario.tipo !== 'fiscal') {
  alert('Acesso negado. Apenas fiscais podem acessar relatórios.');
  window.location.href = 'busca.html';
}

// Exibir nome do usuário
document.getElementById('userName').textContent = `${usuario.nome} (${usuario.unidade})`;

// Carregar dados inicial
carregarEstatisticas();
carregarUsuarios();
buscarRelatorio();

async function carregarEstatisticas() {
  try {
    const response = await fetch(`${API_URL}/relatorios/estatisticas`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const stats = await response.json();

    if (response.ok) {
      document.getElementById('totalFamilias').textContent = stats.total_familias_atendidas || 0;
      document.getElementById('totalVouchers').textContent = stats.vouchers_entregues || 0;
      document.getElementById('totalKits').textContent = stats.kits_entregues || 0;
      document.getElementById('totalPessoas').textContent = stats.total_pessoas_atendidas || 0;

      // Renderizar por atendente
      if (stats.por_atendente && stats.por_atendente.length > 0) {
        exibirPorAtendente(stats.por_atendente);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
  }
}

async function carregarUsuarios() {
  try {
    const response = await fetch(`${API_URL}/relatorios/usuarios`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const usuarios = await response.json();

    const select = document.getElementById('usuarioFiltro');
    select.innerHTML = '<option value="">Todos</option>';

    usuarios.forEach(u => {
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = `${u.nome} (${u.tipo})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  }
}

async function buscarRelatorio() {
  const loading = document.getElementById('loading');
  const container = document.getElementById('entregasContainer');

  loading.classList.remove('hidden');
  container.innerHTML = '';

  const dataInicio = document.getElementById('dataInicio').value;
  const dataFim = document.getElementById('dataFim').value;
  const usuarioId = document.getElementById('usuarioFiltro').value;

  const params = new URLSearchParams();
  if (dataInicio) params.append('data_inicio', dataInicio);
  if (dataFim) params.append('data_fim', dataFim);
  if (usuarioId) params.append('usuario_id', usuarioId);

  try {
    const response = await fetch(`${API_URL}/relatorios/entregas?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const entregas = await response.json();

    loading.classList.add('hidden');

    if (response.ok) {
      exibirEntregas(entregas);
    } else {
      mostrarAlerta(entregas.error || 'Erro ao buscar relatório', 'error');
    }
  } catch (error) {
    loading.classList.add('hidden');
    mostrarAlerta('Erro ao conectar com o servidor', 'error');
    console.error(error);
  }
}

function exibirPorAtendente(dados) {
  const container = document.getElementById('atendentesContainer');

  if (dados.length === 0) {
    container.innerHTML = '<p>Nenhum dado disponível</p>';
    return;
  }

  container.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Atendente</th>
          <th>Famílias</th>
          <th>Vouchers</th>
          <th>Kits</th>
        </tr>
      </thead>
      <tbody>
        ${dados.map(d => `
          <tr>
            <td>${d.nome}</td>
            <td>${d.familias_atendidas || 0}</td>
            <td>${d.vouchers || 0}</td>
            <td>${d.kits || 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function exibirEntregas(entregas) {
  const container = document.getElementById('entregasContainer');

  if (entregas.length === 0) {
    container.innerHTML = '<p>Nenhuma entrega encontrada com os filtros selecionados.</p>';
    return;
  }

  container.innerHTML = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Código Familiar</th>
          <th>Membros</th>
          <th>Endereço</th>
          <th>Voucher</th>
          <th>Data Voucher</th>
          <th>Data Kit</th>
          <th>Atendente</th>
        </tr>
      </thead>
      <tbody>
        ${entregas.map(e => `
          <tr>
            <td>${e.cod_familiar}</td>
            <td>${e.total_membros || 0}</td>
            <td>${e.endereco}${e.bairro ? ' - ' + e.bairro : ''}</td>
            <td>${e.numero_voucher || '-'}</td>
            <td>${e.data_entrega_voucher ? formatarDataHora(e.data_entrega_voucher) : '-'}</td>
            <td>${e.data_entrega_kit ? formatarDataHora(e.data_entrega_kit) : '-'}</td>
            <td>${e.usuario_nome || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p class="mt-20"><strong>Total de registros:</strong> ${entregas.length}</p>
  `;
}

function formatarDataHora(dataStr) {
  const data = new Date(dataStr);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function exportarExcel() {
  mostrarAlerta('Funcionalidade de exportação Excel será implementada em breve!', 'info');
}

function exportarPDF() {
  mostrarAlerta('Funcionalidade de exportação PDF será implementada em breve!', 'info');
}

function voltarBusca() {
  window.location.href = 'busca.html';
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

function mostrarAlerta(mensagem, tipo = 'info') {
  const alertContainer = document.getElementById('alert-container');
  const alertClass = tipo === 'error' ? 'alert-error' : tipo === 'success' ? 'alert-success' : 'alert-info';
  
  alertContainer.innerHTML = `
    <div class="${alertClass}">
      ${mensagem}
    </div>
  `;

  setTimeout(() => {
    alertContainer.innerHTML = '';
  }, 5000);
}
