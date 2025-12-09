const API_URL = '/api';

// Verificar autenticação
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

if (!token) {
  window.location.href = 'login.html';
}

// Exibir nome do usuário
document.getElementById('userName').textContent = usuario.nome || 'Usuário';

// Buscar ao pressionar Enter
document.getElementById('searchInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    buscarFamilia();
  }
});

async function buscarFamilia() {
  const termo = document.getElementById('searchInput').value.trim();
  const resultsDiv = document.getElementById('results');

  if (!termo) {
    mostrarAlerta('Digite algo para buscar', 'error');
    return;
  }

  resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  try {
    const response = await fetch(`${API_URL}/familias/buscar?termo=${encodeURIComponent(termo)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      if (data.length === 0) {
        resultsDiv.innerHTML = '<p class="text-center">Nenhuma família encontrada</p>';
      } else {
        exibirResultados(data);
      }
    } else {
      mostrarAlerta(data.error || 'Erro ao buscar', 'error');
      resultsDiv.innerHTML = '';
    }
  } catch (error) {
    mostrarAlerta('Erro ao conectar com o servidor', 'error');
    resultsDiv.innerHTML = '';
    console.error(error);
  }
}

function exibirResultados(familias) {
  const resultsDiv = document.getElementById('results');
  
  resultsDiv.innerHTML = familias.map(familia => {
    const statusVoucher = familia.numero_voucher ? 
      '<span class="status-badge status-concluido">Voucher Entregue</span>' : 
      '<span class="status-badge status-pendente">Pendente</span>';
    
    const statusKit = familia.data_entrega_kit ? 
      '<span class="status-badge status-concluido">Kit Entregue</span>' : '';

    return `
      <div class="result-item" onclick="abrirFamilia(${familia.id})">
        <h3>${familia.nome_responsavel} ${statusVoucher} ${statusKit}</h3>
        <p><strong>CPF:</strong> ${formatarCPF(familia.cpf)}</p>
        <p><strong>NIS:</strong> ${familia.nis}</p>
        <p><strong>Código Familiar:</strong> ${familia.cod_familiar}</p>
        <p><strong>Endereço:</strong> ${familia.endereco}${familia.bairro ? ' - ' + familia.bairro : ''}</p>
      </div>
    `;
  }).join('');
}

function abrirFamilia(id) {
  window.location.href = `acao.html?id=${id}`;
}

function formatarCPF(cpf) {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
    <div class="alert ${alertClass}">
      ${mensagem}
    </div>
  `;

  setTimeout(() => {
    alertContainer.innerHTML = '';
  }, 5000);
}
