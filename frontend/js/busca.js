const API_URL = '/api';

// Verificar autenticação
const token = localStorage.getItem('token');
const usuarioStr = localStorage.getItem('usuario');

if (!token || !usuarioStr) {
  window.location.href = 'login.html';
  throw new Error('Não autenticado'); // Parar execução do script
}

const usuario = JSON.parse(usuarioStr);

// Exibir nome do usuário
document.getElementById('userName').textContent = usuario.nome || 'Usuário';

// Mostrar botão de relatórios se for fiscal ou master
if (usuario.tipo === 'fiscal' || usuario.tipo === 'master') {
  const btnRelatorios = document.getElementById('btnRelatorios');
  if (btnRelatorios) {
    btnRelatorios.style.display = 'inline-block';
  }
}

// Permitir apenas números no campo de busca
const searchInput = document.getElementById('searchInput');

searchInput.addEventListener('input', (e) => {
  // Remove qualquer caractere que não seja número
  e.target.value = e.target.value.replace(/[^0-9]/g, '');
});

// Buscar ao pressionar Enter
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    buscarFamilia();
  }
});

async function buscarFamilia() {
  const termo = document.getElementById('searchInput').value.trim();
  const resultsDiv = document.getElementById('results');

  if (!termo) {
    mostrarAlerta('Digite CPF ou NIS para buscar', 'error');
    return;
  }

  // Validar se contém apenas números
  if (!/^[0-9]+$/.test(termo)) {
    mostrarAlerta('Digite apenas números (CPF ou NIS)', 'error');
    return;
  }

  // Se tiver 11 dígitos, validar como CPF
  if (termo.length === 11) {
    // É um CPF, continuar normalmente
  } else if (termo.length < 11) {
    // Pode ser NIS ou CPF incompleto
    mostrarAlerta('CPF deve ter 11 dígitos. Para NIS, digite o número completo.', 'error');
    return;
  }
  // Se tiver mais de 11 dígitos, pode ser NIS (que tem 11 dígitos também, mas permite outros formatos)

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
    // Verificar se renda média está acima do limite
    const rendaAcima = familia.renda_media && parseFloat(familia.renda_media) > 218;
    
    const statusVoucher = familia.numero_voucher ? 
      '<span class="status-badge status-concluido">Voucher Entregue</span>' : 
      rendaAcima ? '<span class="status-badge status-inabilitado">Renda Acima do Limite</span>' :
      '<span class="status-badge status-pendente">Perfil Aprovado</span>';
    
    const statusKit = familia.data_entrega_kit ? 
      '<span class="status-badge status-concluido">Kit Entregue</span>' : '';

    const totalMembros = familia.total_membros || 0;
    
    // Determinar o título a exibir
    let tituloFamilia;
    if (familia.nome_membro_buscado) {
      // Se encontrou o nome do membro buscado, usar ele
      tituloFamilia = familia.nome_membro_buscado;
    } else {
      // Caso contrário, usar código familiar
      tituloFamilia = `Família ${familia.cod_familiar}`;
    }

    // Adicionar classe de inabilitado se renda estiver acima
    const classeInabilitado = rendaAcima ? ' result-item-inabilitado' : '';

    // Passar o ID do membro buscado (se houver) e seu nome
    const membroId = familia.membro_buscado_id || '';
    const membroNome = familia.nome_membro_buscado ? encodeURIComponent(familia.nome_membro_buscado) : '';

    return `
      <div class="result-item${classeInabilitado}" onclick="abrirFamilia(${familia.id}, ${membroId ? membroId : 'null'}, '${membroNome}')">
        <h3>${tituloFamilia} ${statusVoucher} ${statusKit}</h3>
        <p><strong>👥 Membros:</strong> ${totalMembros} pessoa(s)</p>
        <p><strong>Código Familiar:</strong> ${familia.cod_familiar}</p>
        ${familia.renda_media ? `<p><strong>💰 Renda Média:</strong> R$ ${parseFloat(familia.renda_media).toFixed(2)}</p>` : ''}
        <p><strong>Endereço:</strong> ${familia.endereco}${familia.bairro ? ' - ' + familia.bairro : ''}</p>
        ${familia.telefone ? `<p><strong>Telefone:</strong> ${familia.telefone}</p>` : ''}
      </div>
    `;
  }).join('');
}

function abrirFamilia(id, membroId, membroNome) {
  let url = `acao.html?id=${id}`;
  if (membroId) {
    url += `&membro_id=${membroId}&membro_nome=${membroNome}`;
  }
  window.location.href = url;
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

function abrirRelatorios() {
  window.location.href = 'relatorios.html';
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

