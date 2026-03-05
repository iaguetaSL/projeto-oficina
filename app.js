// ===== Helpers =====
function $(sel) { return document.querySelector(sel); }

function normalizarPlaca(v) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

function parseValor(v) {
  // aceita 12,50 ou 12.50 ou vazio
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function money(n) {
  const val = Number.isFinite(n) ? n : 0;
  return val.toFixed(2).replace(".", ",");
}

// ===== DB =====
const STORAGE_KEY = "oficina_db_v2";

function lerDB() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function salvarDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// ===== Views =====
function mostrar(id) {
  ["#home", "#novo", "#buscar"].forEach(v => $(v).classList.add("hidden"));
  $(id).classList.remove("hidden");
  limparMensagens();
}

function limparMensagens() {
  $("#msgNovo").textContent = "";
  $("#msgNovo").className = "msg";
  $("#msgBusca").textContent = "";
  $("#msgBusca").className = "msg";
  $("#acoesNaoAchou").classList.add("hidden");
}

// ===== Peças dinâmicas =====
function criarLinhaPeca(nome = "", valor = "") {
  const linha = document.createElement("div");
  linha.className = "linha-peca";

  const inputNome = document.createElement("input");
  inputNome.type = "text";
  inputNome.placeholder = "Descrição da peça";
  inputNome.className = "peca-nome";
  inputNome.value = nome;

  const inputValor = document.createElement("input");
  inputValor.type = "text";
  inputValor.placeholder = "Valor R$";
  inputValor.className = "peca-valor";
  inputValor.value = valor;

  const btnRemover = document.createElement("button");
  btnRemover.type = "button";
  btnRemover.className = "btn-icon";
  btnRemover.title = "Remover peça";
  btnRemover.textContent = "×";

  btnRemover.addEventListener("click", () => {
    linha.remove();
    atualizarTotal();
  });

  inputValor.addEventListener("input", atualizarTotal);

  linha.append(inputNome, inputValor, btnRemover);
  return linha;
}

function pegarPecasDoFormulario() {
  const linhas = [...document.querySelectorAll("#listaPecas .linha-peca")];
  const pecas = [];

  for (const linha of linhas) {
    const nome = linha.querySelector(".peca-nome")?.value.trim() || "";
    const valor = parseValor(linha.querySelector(".peca-valor")?.value);
    if (nome || valor > 0) pecas.push({ nome, valor });
  }
  return pecas;
}

function somaPecas(pecas) {
  return pecas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
}

function atualizarTotal() {
  const pecas = pegarPecasDoFormulario();
  const totalPecas = somaPecas(pecas);
  const mao = parseValor($("#maoDeObra").value);
  $("#total").value = money(totalPecas + mao);
}

// ===== Navegação =====
$("#irNovo").addEventListener("click", () => mostrar("#novo"));
$("#irBuscar").addEventListener("click", () => mostrar("#buscar"));
$("#voltarHome1").addEventListener("click", () => mostrar("#home"));
$("#voltarHome2").addEventListener("click", () => mostrar("#home"));

$("#btnIrNovoDireto").addEventListener("click", () => {
  const placa = normalizarPlaca($("#placaBusca").value);
  mostrar("#novo");
  if (placa) $("#placa").value = placa;
});

// ===== Eventos do formulário =====
$("#addPeca").addEventListener("click", () => {
  $("#listaPecas").appendChild(criarLinhaPeca());
  atualizarTotal();
});

$("#maoDeObra").addEventListener("input", atualizarTotal);

$("#limpar").addEventListener("click", () => {
  $("#formNovo").reset();
  $("#listaPecas").innerHTML = "";
  $("#listaPecas").appendChild(criarLinhaPeca());
  $("#maoDeObra").value = "0";
  $("#total").value = "0,00";
  limparMensagens();
});

// ===== Salvar =====
$("#formNovo").addEventListener("submit", (e) => {
  e.preventDefault();

  const nome = $("#nome").value.trim();
  const telefone = $("#telefone").value.trim();
  const modelo = $("#modelo").value.trim();
  const placa = normalizarPlaca($("#placa").value);
  const km = $("#km").value; // pode ficar vazio
  const dataOrcamento = $("#dataOrcamento").value; // pode ficar vazio
  const relato = $("#relato").value.trim();

  if (!nome || !telefone || !modelo || !placa) {
    $("#msgNovo").textContent = "Preenche nome, telefone, modelo e placa 😅";
    $("#msgNovo").className = "msg err";
    return;
  }

  const pecas = pegarPecasDoFormulario();
  const totalPecas = somaPecas(pecas);
  const mao = parseValor($("#maoDeObra").value);
  const total = totalPecas + mao;

  const db = lerDB();
  db[placa] = {
    nome,
    telefone,
    modelo,
    placa,
    km,
    dataOrcamento,
    relato,
    pecas,
    maoDeObra: mao,
    total,
    updatedAt: new Date().toISOString()
  };

  salvarDB(db);

  $("#msgNovo").textContent = "Salvo ✅ Agora dá pra buscar pela placa.";
  $("#msgNovo").className = "msg ok";
});

// ===== Buscar =====
function esconderResultado() {
  $("#resultado").classList.add("hidden");
  $("#rListaPecas").innerHTML = "";
}

function mostrarResultado(cad) {
  $("#rNome").textContent = cad.nome || "";
  $("#rTelefone").textContent = cad.telefone || "";
  $("#rModelo").textContent = cad.modelo || "";
  $("#rPlaca").textContent = cad.placa || "";
  $("#rKm").textContent = cad.km || "-";
  $("#rData").textContent = cad.dataOrcamento || "-";
  $("#rRelato").textContent = cad.relato || "(sem relato)";

  $("#rMao").textContent = money(cad.maoDeObra ?? 0);
  $("#rTotal").textContent = money(cad.total ?? 0);

  const ul = $("#rListaPecas");
  ul.innerHTML = "";
  const pecas = Array.isArray(cad.pecas) ? cad.pecas : [];

  if (pecas.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma peça cadastrada.";
    ul.appendChild(li);
  } else {
    for (const p of pecas) {
      const li = document.createElement("li");
      const nome = (p.nome || "Peça").trim();
      li.textContent = `${nome} — R$ ${money(Number(p.valor) || 0)}`;
      ul.appendChild(li);
    }
  }

  $("#resultado").classList.remove("hidden");
}

$("#btnBuscarAgora").addEventListener("click", () => {
  const placa = normalizarPlaca($("#placaBusca").value);

  esconderResultado();
  $("#acoesNaoAchou").classList.add("hidden");

  if (!placa) {
    $("#msgBusca").textContent = "Digita uma placa aí 👀";
    $("#msgBusca").className = "msg err";
    return;
  }

  const db = lerDB();
  const cad = db[placa];

  if (!cad) {
    $("#msgBusca").textContent = "Não achei essa placa. Quer cadastrar como cliente novo?";
    $("#msgBusca").className = "msg err";
    $("#acoesNaoAchou").classList.remove("hidden");
    return;
  }

  $("#msgBusca").textContent = "Achei ✅";
  $("#msgBusca").className = "msg ok";
  mostrarResultado(cad);
});

// ===== Inicialização =====
mostrar("#home");
$("#listaPecas").appendChild(criarLinhaPeca()); // 1 linha inicial
$("#maoDeObra").value = "0";
atualizarTotal();