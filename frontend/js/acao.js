const API_URL = '/api';

// Verificar autenticação
const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) {
  window.location.href = 'login.html';
  throw new Error('Não autenticado');
}

const usuario = JSON.parse(usuarioStr);

// Exibir nome do usuário
document.getElementById('userName').textContent = usuario.nome || 'Usuário';

// Obter ID da família da URL
const urlParams = new URLSearchParams(window.location.search);
const familiaId = urlParams.get('id');
const membroIdBuscado = urlParams.get('membro_id');
const membroNomeBuscado = urlParams.get('membro_nome') ? decodeURIComponent(urlParams.get('membro_nome')) : null;

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

  // Verificar se a família está inabilitada por renda
  const rendaAcima = familia.renda_media && parseFloat(familia.renda_media) > 218;

  // Card com informações da família
  let html = `
    <div class="familia-card">
      <h2>Família ${familia.cod_familiar}</h2>
      ${rendaAcima ? `
      <div class="alert alert-error">
        <strong>⚠️ Família Inabilitada para Receber Voucher</strong><br>
        <p>Esta família possui renda média acima do limite estabelecido (R$ 218,00) e não pode receber novos vouchers.</p>
      </div>` : ''}
      <div class="info-grid">
        <div class="info-item">
          <label>Código Familiar</label>
          <span>${familia.cod_familiar}</span>
        </div>
        <div class="info-item">
          <label>Telefone</label>
          <span>${familia.telefone || 'Não informado'}</span>
        </div>
        ${familia.renda_media ? `
        <div class="info-item">
          <label>Renda Média</label>
          <span class="${rendaAcima ? 'text-error' : ''}">R$ ${parseFloat(familia.renda_media).toFixed(2)}</span>
        </div>` : ''}
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

  // Cenário A: Vincular Voucher (sem voucher ainda) - BLOQUEAR se renda acima
  if (!familia.numero_voucher) {
    if (rendaAcima) {
      html += `
        <div class="voucher-input">
          <h3>📋 Vincular Voucher</h3>
          <p class="mb-20 text-error">Não é possível vincular voucher para esta família devido à renda acima do limite.</p>
          <input 
            type="number" 
            id="numeroVoucher" 
            placeholder="0000"
            maxlength="6"
            disabled
          >
          <button class="btn btn-disabled mt-20" disabled>
            Voucher Bloqueado
          </button>
        </div>
      `;
    } else {
      html += `
        <div class="voucher-input">
          <h3>📋 Vincular Voucher</h3>
          ${membroNomeBuscado ? `
            <div class="alert alert-info mb-20">
              <strong>👤 Quem está retirando:</strong> ${membroNomeBuscado}
            </div>
          ` : `
            <p class="mb-20">Digite o número do voucher físico</p>
          `}
          
          <label for="numeroVoucher"><strong>Número do Voucher</strong></label>
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
  }
  // Cenário B: Entregar Kit (voucher já vinculado, mas kit não)
  else if (familia.numero_voucher && !familia.data_entrega_kit) {
    html += `
      <div class="info-card">
        <h3>📋 Informações da Entrega</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>Voucher Nº</label>
            <span class="highlight">${familia.numero_voucher}</span>
          </div>
          <div class="info-item">
            <label>CRAS</label>
            <span>${familia.operador_unidade || 'Não informado'}</span>
          </div>
          <div class="info-item">
            <label>Operador</label>
            <span>${familia.operador_nome || 'Não informado'}</span>
          </div>
          <div class="info-item">
            <label>Data de Entrega</label>
            <span>${formatarData(familia.data_entrega_voucher)}</span>
          </div>
        </div>
      </div>
      <div class="voucher-input mt-20">
        <h3>🎁 Entregar Kit de Alimentação</h3>
        ${verificarDataEntregaKit()}
      </div>
    `;
  }
  // Cenário C: Tudo concluído
  else {
    html += `
      <div class="alert alert-success">
        <h3>✅ Processo Completo</h3>
      </div>
      <div class="info-card mt-20">
        <h3>📋 Informações da Entrega</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>Voucher Nº</label>
            <span class="highlight">${familia.numero_voucher}</span>
          </div>
          <div class="info-item">
            <label>CRAS</label>
            <span>${familia.operador_unidade || 'Não informado'}</span>
          </div>
          <div class="info-item">
            <label>Operador</label>
            <span>${familia.operador_nome || 'Não informado'}</span>
          </div>
          <div class="info-item">
            <label>Voucher Entregue em</label>
            <span>${formatarData(familia.data_entrega_voucher)}</span>
          </div>
          <div class="info-item">
            <label>Kit Entregue em</label>
            <span>${formatarData(familia.data_entrega_kit)}</span>
          </div>
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
}

async function vincularVoucher() {
  const numero_voucher = document.getElementById('numeroVoucher').value;
  const membro_retirou_id = membroIdBuscado; // Usar o ID capturado da URL

  if (!numero_voucher) {
    mostrarAlerta('Digite o número do voucher', 'error');
    return;
  }

  if (!membro_retirou_id) {
    mostrarAlerta('Não foi possível identificar quem está retirando. Volte e busque novamente pelo CPF/NIS do membro.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/familias/${familiaId}/vincular-voucher`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        numero_voucher: parseInt(numero_voucher),
        membro_retirou_id: parseInt(membro_retirou_id)
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Mostrar modal de sucesso que redireciona para busca
      mostrarModalSucesso(
        'Voucher Vinculado à Família com Sucesso!', 
        `<strong>Voucher Nº ${numero_voucher}</strong><br><br>Atenção: O Registro da entrega do Kit Natalino no sistema, só será efetivado com apresentação do Voucher Físico no ato da entrega dia 19/12/2025 nos pontos de entrega.`
      );
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

function verificarDataEntregaKit() {
  const hoje = new Date();
  const dataLiberacao = new Date('2025-12-19T00:00:00');
  
  if (hoje < dataLiberacao) {
    const diasRestantes = Math.ceil((dataLiberacao - hoje) / (1000 * 60 * 60 * 24));
    return `
      <div class="alert alert-warning mb-20">
        <strong>⏳ Entrega bloqueada até 19/12/2025</strong><br>
        <p>A entrega dos kits de alimentação estará disponível a partir do dia 19/12/2025.</p>
        <p>Faltam <strong>${diasRestantes} dia(s)</strong> para liberação.</p>
      </div>
      <input 
        type="number" 
        id="validarVoucher" 
        placeholder="0000"
        maxlength="6"
        disabled
        style="opacity: 0.5;"
      >
      <button class="btn btn-disabled mt-20" disabled>
        🔒 Entrega Bloqueada até 19/12
      </button>
    `;
  }
  
  return `
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
  `;
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

function mostrarModalSucesso(titulo, mensagem) {
  // Criar overlay escuro
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  `;
  
  // Criar modal
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 10px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  
  modal.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
    <h2 style="color: #2ecc71; margin-bottom: 15px;">${titulo}</h2>
    <p style="color: #555; margin-bottom: 25px;">${mensagem}</p>
    <button 
      onclick="window.location.href='busca.html'" 
      style="
        background: #2ecc71;
        color: white;
        border: none;
        padding: 12px 40px;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        font-weight: bold;
      "
    >OK</button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
