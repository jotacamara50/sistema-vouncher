const API_URL = '/api';

// Verificar autenticação
const token = localStorage.getItem('token');
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

if (!token) {
  window.location.href = 'login.html';
}

// Exibir nome do usuário
document.getElementById('userName').textContent = usuario.nome || 'Usuário';

// Obter ID da família da URL
const urlParams = new URLSearchParams(window.location.search);
const familiaId = urlParams.get('id');

if (!familiaId) {
  window.location.href = 'busca.html';
}

// Carregar dados da família
carregarFamilia();

async function carregarFamilia() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('familiaContent');

  loading.classList.remove('hidden');

  try {
    const response = await fetch(`${API_URL}/familias/${familiaId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const familia = await response.json();

    if (response.ok) {
      loading.classList.add('hidden');
      exibirFamilia(familia);
    } else {
      mostrarAlerta(familia.error || 'Erro ao carregar família', 'error');
      setTimeout(() => voltarBusca(), 2000);
    }
  } catch (error) {
    mostrarAlerta('Erro ao conectar com o servidor', 'error');
    console.error(error);
    setTimeout(() => voltarBusca(), 2000);
  }
}

function exibirFamilia(familia) {
  const content = document.getElementById('familiaContent');

  // Card com informações da família
  let html = `
    <div class="familia-card">
      <h2>Família ${familia.cod_familiar}</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>Código Familiar</label>
          <span>${familia.cod_familiar}</span>
        </div>
        <div class="info-item">
          <label>Telefone</label>
          <span>${familia.telefone || 'Não informado'}</span>
        </div>
        <div class="info-item">
          <label>Endereço</label>
          <span>${familia.endereco}</span>
        </div>
        <div class="info-item">
          <label>Bairro</label>
          <span>${familia.bairro || 'Não informado'}</span>
        </div>
      </div>

      <h3 class="mt-20">👥 Membros da Família</h3>
      <div class="membros-list">
        ${familia.membros && familia.membros.length > 0 ? 
          familia.membros.map(membro => `
            <div class="membro-item">
              <strong>${membro.nome}</strong><br>
              <small>CPF: ${formatarCPF(membro.cpf)} | NIS: ${membro.nis}</small>
            </div>
          `).join('') 
          : '<p>Nenhum membro cadastrado</p>'
        }
      </div>
    </div>
  `;

  // Cenário A: Vincular Voucher (sem voucher ainda)
  if (!familia.numero_voucher) {
    html += `
      <div class="voucher-input">
        <h3>📋 Vincular Voucher</h3>
        <p class="mb-20">Digite o número do voucher físico</p>
        <input 
          type="number" 
          id="numeroVoucher" 
          placeholder="0000"
          maxlength="6"
          autofocus
        >
        <button class="btn btn-success mt-20" onclick="vincularVoucher()">
          Vincular Voucher
        </button>
      </div>
    `;
  }
  // Cenário B: Entregar Kit (voucher já vinculado, mas kit não)
  else if (familia.numero_voucher && !familia.data_entrega_kit) {
    html += `
      <div class="alert alert-info">
        <strong>Voucher Nº ${familia.numero_voucher}</strong> já vinculado em ${formatarData(familia.data_entrega_voucher)}
      </div>
      <div class="voucher-input">
        <h3>🎁 Entregar Kit de Alimentação</h3>
        <p class="mb-20">Digite o número do voucher que o beneficiário apresentou</p>
        <input 
          type="number" 
          id="validarVoucher" 
          placeholder="0000"
          maxlength="6"
          autofocus
        >
        <button class="btn btn-success mt-20" onclick="entregarKit()">
          Confirmar Entrega do Kit
        </button>
      </div>
    `;
  }
  // Cenário C: Tudo concluído
  else {
    html += `
      <div class="alert alert-success">
        <h3>✅ Processo Completo</h3>
        <p><strong>Voucher:</strong> Nº ${familia.numero_voucher} - Entregue em ${formatarData(familia.data_entrega_voucher)}</p>
        <p><strong>Kit:</strong> Entregue em ${formatarData(familia.data_entrega_kit)}</p>
      </div>
    `;
  }

  content.innerHTML = html;
}

async function vincularVoucher() {
  const numero_voucher = document.getElementById('numeroVoucher').value;

  if (!numero_voucher) {
    mostrarAlerta('Digite o número do voucher', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/familias/${familiaId}/vincular-voucher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numero_voucher: parseInt(numero_voucher) })
    });

    const data = await response.json();

    if (response.ok) {
      mostrarAlerta('Voucher vinculado com sucesso!', 'success');
      setTimeout(() => carregarFamilia(), 1500);
    } else {
      mostrarAlerta(data.error || 'Erro ao vincular voucher', 'error');
    }
  } catch (error) {
    mostrarAlerta('Erro ao conectar com o servidor', 'error');
    console.error(error);
  }
}

async function entregarKit() {
  const numero_voucher = document.getElementById('validarVoucher').value;

  if (!numero_voucher) {
    mostrarAlerta('Digite o número do voucher para validação', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/familias/${familiaId}/entregar-kit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ numero_voucher: parseInt(numero_voucher) })
    });

    const data = await response.json();

    if (response.ok) {
      mostrarAlerta('Kit entregue com sucesso! Gerando recibo...', 'success');
      
      // Abrir PDF do recibo em nova aba
      if (data.recibo_pdf) {
        setTimeout(() => {
          window.open(`http://localhost:3000${data.recibo_pdf}`, '_blank');
        }, 1000);
      }

      setTimeout(() => carregarFamilia(), 2000);
    } else {
      mostrarAlerta(data.error || 'Erro ao entregar kit', 'error');
    }
  } catch (error) {
    mostrarAlerta('Erro ao conectar com o servidor', 'error');
    console.error(error);
  }
}

function formatarCPF(cpf) {
  if (!cpf) return '';
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarData(dataISO) {
  if (!dataISO) return 'Não informado';
  const data = new Date(dataISO);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
    <div class="alert ${alertClass}">
      ${mensagem}
    </div>
  `;

  setTimeout(() => {
    alertContainer.innerHTML = '';
  }, 5000);
}
