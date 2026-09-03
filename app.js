/* =====================================================
   CONTROLE FINANCEIRO FAMILIAR — V1
   (FORMULÁRIOS COMPLETOS VIA MODAL + LIMITE + VENCIMENTO + 🗑)
===================================================== */

"use strict";

/* =====================================================
   1. CONSTANTES & CONFIGURAÇÕES
===================================================== */
const STORAGE_KEY = "controle_financeiro_familiar_v1";

const CONFIG = {
    categorias: [
        "Espetaria",
        "Contas da família",
        "Cartões",
        "Pessoal",
        "Carro",
        "Outros"
    ],
    pessoas: [
        "Pai",
        "Mãe",
        "Você",
        "Irmã",
        "Funcionária"
    ],
    formasPagamento: [
        "Pix",
        "Dinheiro",
        "Débito",
        "Crédito",
        "Transferência",
        "Outro"
    ],
    origens: [
        "Espetaria",
        "Outros"
    ]
};

const DADOS_INICIAIS = {
    entradas: [],
    gastos: [],
    contas: [],
    cartoes: []
};

/* =====================================================
   2. ESTADO DA APLICAÇÃO (STATE)
===================================================== */
const dataAtual = new Date();

let state = {
    dados: carregarDados(),
    anoReferencia: dataAtual.getFullYear(),
    mesReferencia: dataAtual.getMonth() // 0 = Jan ... 11 = Dez
};

function carregarDados() {
    try {
        const salvos = localStorage.getItem(STORAGE_KEY);
        return salvos ? JSON.parse(salvos) : structuredClone(DADOS_INICIAIS);
    } catch {
        return structuredClone(DADOS_INICIAIS);
    }
}

function salvarEstado() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dados));
}

/* =====================================================
   3. UTILITÁRIOS DE FORMATAÇÃO E DATA/HORA
===================================================== */
const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

function dinheiro(valor) {
    return formatadorMoeda.format(Number(valor) || 0);
}

function gerarId() {
    return Date.now() + Math.random();
}

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obterChaveMesAtual() {
    const ano = state.anoReferencia;
    const mes = String(state.mesReferencia + 1).padStart(2, "0");
    return `${ano}-${mes}`;
}

function formatarDataBR(dataStr) {
    if (!dataStr) return "";
    const [ano, mes, dia] = dataStr.split("-");
    return dia && mes && ano ? `${dia}/${mes}/${ano}` : dataStr;
}

function dataHojeInput() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function horaAtualInput() {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, "0");
    const minutos = String(agora.getMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
}

function parseMoedaBR(valorStr) {
    if (!valorStr) return 0;
    const limpo = String(valorStr).trim().replace("R$", "").trim().replace(",", ".");
    return parseFloat(limpo) || 0;
}

function formatarBlurInput(inputEl) {
    const num = parseMoedaBR(inputEl.value);
    if (inputEl.value.trim() !== "") {
        inputEl.value = num.toFixed(2).replace(".", ",");
    }
}

/* =====================================================
   4. RELÓGIO EM TEMPO REAL NO TOPO
===================================================== */
function iniciarRelogio() {
    const subtitulo = document.querySelector(".subtitle");
    if (!subtitulo) return;

    function atualizar() {
        const agora = new Date();
        const dataStr = agora.toLocaleDateString("pt-BR");
        const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        subtitulo.textContent = `CONTROLE DA FAMÍLIA • ${dataStr} às ${horaStr}`;
    }

    atualizar();
    setInterval(atualizar, 1000);
}

/* =====================================================
   5. MOTOR DE CÁLCULO
===================================================== */
function calcularResumoMensal() {
    const chaveMes = obterChaveMesAtual();

    let totalEntradas = 0;
    const entradasMes = [];
    for (const ent of state.dados.entradas) {
        if (ent.data && ent.data.startsWith(chaveMes)) {
            totalEntradas += Number(ent.valor) || 0;
            entradasMes.push(ent);
        }
    }

    let gastosEspetaria = 0;
    let outrosGastos = 0;
    const gastosMes = [];
    for (const g of state.dados.gastos) {
        if (g.data && g.data.startsWith(chaveMes)) {
            const valor = Number(g.valor) || 0;
            if (g.categoria === "Espetaria") {
                gastosEspetaria += valor;
            } else {
                outrosGastos += valor;
            }
            gastosMes.push(g);
        }
    }

    let contasFixas = 0;
    for (const c of state.dados.contas) {
        if (c.ativa) {
            contasFixas += Number(c.mes) || 0;
        }
    }

    let totalCartoes = 0;
    for (const c of state.dados.cartoes) {
        const valor = (c.real === "" || c.real === null || c.real === undefined) ? c.previsao : c.real;
        totalCartoes += Number(valor) || 0;
    }

    const totalSaidas = gastosEspetaria + outrosGastos + contasFixas + totalCartoes;
    const sobra = totalEntradas - totalSaidas;

    return {
        totalEntradas,
        gastosEspetaria,
        outrosGastos,
        contasFixas,
        totalCartoes,
        totalSaidas,
        sobra,
        entradasMes,
        gastosMes
    };
}

/* =====================================================
   6. RENDERIZAÇÃO DA INTERFACE
===================================================== */
function renderMesTopo() {
    const d = new Date(state.anoReferencia, state.mesReferencia, 1);
    const texto = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const formatado = texto.charAt(0).toUpperCase() + texto.slice(1);
    document.getElementById("monthLabel").textContent = formatado.replace(" de ", " / ");
}

function renderDashboard(resumo) {
    document.getElementById("totalEntradas").textContent = dinheiro(resumo.totalEntradas);
    document.getElementById("totalSaidas").textContent = dinheiro(resumo.totalSaidas);

    const elSobra = document.getElementById("sobraLiquida");
    elSobra.textContent = dinheiro(resumo.sobra);
    elSobra.style.color = resumo.sobra >= 0 ? "var(--color-success)" : "var(--color-danger)";

    const itens = [
        { icon: "🍢", label: "Espetaria", valor: resumo.gastosEspetaria },
        { icon: "🏠", label: "Contas fixas", valor: resumo.contasFixas },
        { icon: "💳", label: "Cartões", valor: resumo.totalCartoes },
        { icon: "👤", label: "Outros", valor: resumo.outrosGastos }
    ];

    document.getElementById("resumoDespesas").innerHTML = itens.map(item => `
        <div class="summary-row">
            <span>${item.icon}</span>
            <span class="name">${item.label}</span>
            <strong>${dinheiro(item.valor)}</strong>
        </div>
    `).join("");
}

function obterLancamentosUnificados(entradasMes, gastosMes) {
    const lista = [
        ...gastosMes.map(g => ({ ...g, tipo: "Gasto" })),
        ...entradasMes.map(e => ({ ...e, tipo: "Entrada" }))
    ];
    return lista.sort((a, b) => {
        const dataA = `${a.data}T${a.hora || "00:00"}`;
        const dataB = `${b.data}T${b.hora || "00:00"}`;
        return dataB.localeCompare(dataA);
    });
}

function renderUltimosLancamentos(lancamentos) {
    const container = document.getElementById("ultimosLancamentos");

    if (lancamentos.length === 0) {
        container.innerHTML = `<div class="empty">Nenhum lançamento neste mês.</div>`;
        return;
    }

    container.innerHTML = lancamentos.slice(0, 6).map(item => {
        const isEntrada = item.tipo === "Entrada";
        return `
            <div class="launch-row">
                <span>
                    ${formatarDataBR(item.data)}
                    ${item.hora ? `<br><small style="color:var(--color-text-light); font-size:11px;">${item.hora}</small>` : ""}
                </span>
                <span>${escaparHTML(item.descricao)}</span>
                <strong class="${isEntrada ? "income" : "expense"}">
                    ${isEntrada ? "+" : "−"} ${dinheiro(item.valor)}
                </strong>
            </div>
        `;
    }).join("");
}

function renderTodosLancamentos(lancamentos) {
    const container = document.getElementById("listaLancamentos");

    if (lancamentos.length === 0) {
        container.innerHTML = `<div class="empty">Nenhum lançamento cadastrado neste mês.</div>`;
        return;
    }

    const headerHTML = `
        <div class="launch-row table-header">
            <span>Data / Hora</span>
            <span>Descrição</span>
            <span>Valor</span>
            <span>Categoria / Origem</span>
            <span>Ações</span>
        </div>
    `;

    const rowsHTML = lancamentos.map(item => {
        const isEntrada = item.tipo === "Entrada";
        const categoriaOuOrigem = isEntrada ? item.origem : item.categoria;

        return `
            <div class="launch-row">
                <span>
                    ${formatarDataBR(item.data)}
                    ${item.hora ? `<br><small style="color:var(--color-text-light); font-size:11px;">${item.hora}</small>` : ""}
                </span>
                <span>${escaparHTML(item.descricao)}</span>
                <strong class="${isEntrada ? "income" : "expense"}">
                    ${isEntrada ? "+" : "−"} ${dinheiro(item.valor)}
                </strong>
                <span>
                    <span class="badge">${escaparHTML(categoriaOuOrigem)}</span>
                </span>
                <div class="action-buttons">
                    <button class="edit-button" 
                            data-action="editar-lancamento" 
                            data-tipo="${item.tipo}" 
                            data-id="${item.id}">
                        Editar
                    </button>
                    <button class="delete-button" 
                            data-action="excluir-lancamento" 
                            data-tipo="${item.tipo}" 
                            data-id="${item.id}"
                            title="Excluir">
                        🗑
                    </button>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = headerHTML + rowsHTML;
}

function renderCartoes() {
    const container = document.getElementById("listaCartoes");

    if (state.dados.cartoes.length === 0) {
        container.innerHTML = `<div class="empty">Nenhum cartão cadastrado. Clique no botão <strong>＋ Cartão</strong> acima para adicionar.</div>`;
        return;
    }

    const headerHTML = `
        <div class="table-row-cartao table-header">
            <span>Cartão</span>
            <span>Limite</span>
            <span>Venc.</span>
            <span>Previsão</span>
            <span>Valor real</span>
            <span>Efetivo</span>
            <span>Ações</span>
        </div>
    `;

    const rowsHTML = state.dados.cartoes.map(cartao => {
        const efetivo = (cartao.real === "" || cartao.real === null || cartao.real === undefined) ? cartao.previsao : cartao.real;
        const vencimentoTexto = cartao.vencimento ? `Dia ${cartao.vencimento}` : "—";
        const limiteTexto = cartao.limite ? dinheiro(cartao.limite) : "—";

        return `
            <div class="table-row-cartao">
                <strong>${escaparHTML(cartao.nome)}</strong>
                <span>${limiteTexto}</span>
                <span><span class="badge">${vencimentoTexto}</span></span>
                <span>${dinheiro(cartao.previsao)}</span>
                <input class="money-input input-cartao-real" 
                       type="text" 
                       inputmode="decimal"
                       value="${cartao.real !== "" && cartao.real !== null && cartao.real !== undefined ? Number(cartao.real).toFixed(2).replace(".", ",") : ""}" 
                       placeholder="0,00"
                       data-id="${cartao.id}">
                <strong>${dinheiro(efetivo)}</strong>
                <div class="action-buttons">
                    <button class="edit-button" 
                            data-action="editar-cartao" 
                            data-id="${cartao.id}">
                        Editar
                    </button>
                    <button class="delete-button" 
                            data-action="excluir-cartao" 
                            data-id="${cartao.id}"
                            title="Excluir">
                        🗑
                    </button>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = headerHTML + rowsHTML;
}

function renderContas() {
    const container = document.getElementById("listaContas");

    if (state.dados.contas.length === 0) {
        container.innerHTML = `<div class="empty">Nenhuma conta fixa cadastrada. Clique no botão <strong>＋ Conta</strong> acima para adicionar.</div>`;
        return;
    }

    const headerHTML = `
        <div class="table-row-conta table-header">
            <span>Conta</span>
            <span>Venc.</span>
            <span>Valor padrão</span>
            <span>Este mês</span>
            <span>Ativa</span>
            <span>Ações</span>
        </div>
    `;

    const rowsHTML = state.dados.contas.map(conta => {
        const vencimentoTexto = conta.vencimento ? `Dia ${conta.vencimento}` : "—";

        return `
            <div class="table-row-conta">
                <strong>${escaparHTML(conta.nome)}</strong>
                <span><span class="badge">${vencimentoTexto}</span></span>
                <span>${dinheiro(conta.padrao)}</span>
                <input class="money-input input-conta-mes" 
                       type="text" 
                       inputmode="decimal"
                       value="${Number(conta.mes || 0).toFixed(2).replace(".", ",")}" 
                       placeholder="0,00"
                       data-id="${conta.id}">
                <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
                    <input type="checkbox" 
                           class="check-conta-ativa" 
                           data-id="${conta.id}" 
                           ${conta.ativa ? "checked" : ""}>
                    Sim
                </label>
                <div class="action-buttons">
                    <button class="edit-button" 
                            data-action="editar-conta" 
                            data-id="${conta.id}">
                        Editar
                    </button>
                    <button class="delete-button" 
                            data-action="excluir-conta" 
                            data-id="${conta.id}"
                            title="Excluir">
                        🗑
                    </button>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = headerHTML + rowsHTML;
}

function renderizarTudo() {
    renderMesTopo();
    const resumo = calcularResumoMensal();
    renderDashboard(resumo);

    const lancamentos = obterLancamentosUnificados(resumo.entradasMes, resumo.gastosMes);
    renderUltimosLancamentos(lancamentos);
    renderTodosLancamentos(lancamentos);
    renderCartoes();
    renderContas();
}

/* =====================================================
   7. MODAL UNIFICADO PARA TODAS AS INSERÇÕES/EDIÇÕES
===================================================== */
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalForm = document.getElementById("modalForm");

function abrirModal(tipo, idEdicao = null) {
    modal.classList.remove("hidden");
    const isEdicao = idEdicao !== null;

    let itemExistente = null;
    if (isEdicao) {
        if (tipo === "gasto") itemExistente = state.dados.gastos.find(g => String(g.id) === String(idEdicao));
        if (tipo === "entrada") itemExistente = state.dados.entradas.find(e => String(e.id) === String(idEdicao));
        if (tipo === "cartao") itemExistente = state.dados.cartoes.find(c => String(c.id) === String(idEdicao));
        if (tipo === "conta") itemExistente = state.dados.contas.find(c => String(c.id) === String(idEdicao));
    }

    // ================= CARTÃO =================
    if (tipo === "cartao") {
        modalTitle.textContent = isEdicao ? "Editar cartão" : "Novo cartão";
        const limitePadrao = itemExistente?.limite ? Number(itemExistente.limite).toFixed(2).replace(".", ",") : "";
        const previsaoPadrao = itemExistente?.previsao ? Number(itemExistente.previsao).toFixed(2).replace(".", ",") : "";

        modalForm.innerHTML = `
            <input type="hidden" name="tipo" value="cartao">
            <input type="hidden" name="id" value="${idEdicao ?? ""}">

            <div class="form-group">
                <label>Nome do Cartão</label>
                <input name="nome" value="${escaparHTML(itemExistente?.nome ?? "")}" placeholder="Ex.: Nubank, Assaí" required>
            </div>

            <div class="form-group" style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label>Limite Total (R$)</label>
                    <input name="limite" class="moeda-input" type="text" inputmode="decimal" value="${limitePadrao}" placeholder="0,00">
                </div>
                <div style="flex: 1;">
                    <label>Dia do Vencimento</label>
                    <input name="vencimento" type="number" min="1" max="31" value="${itemExistente?.vencimento ?? ""}" placeholder="Ex.: 10" required>
                </div>
            </div>

            <div class="form-group">
                <label>Previsão da Fatura (R$)</label>
                <input name="previsao" class="moeda-input" type="text" inputmode="decimal" value="${previsaoPadrao}" placeholder="0,00" required>
            </div>

            <button type="submit" class="button primary submit-button">
                ${isEdicao ? "Salvar alterações" : "Salvar cartão"}
            </button>
        `;
    }

    // ================= CONTA FIXA =================
    else if (tipo === "conta") {
        modalTitle.textContent = isEdicao ? "Editar conta fixa" : "Nova conta fixa";
        const padraoVal = itemExistente?.padrao ? Number(itemExistente.padrao).toFixed(2).replace(".", ",") : "";
        const mesVal = itemExistente?.mes ? Number(itemExistente.mes).toFixed(2).replace(".", ",") : "";

        modalForm.innerHTML = `
            <input type="hidden" name="tipo" value="conta">
            <input type="hidden" name="id" value="${idEdicao ?? ""}">

            <div class="form-group">
                <label>Nome da Conta</label>
                <input name="nome" value="${escaparHTML(itemExistente?.nome ?? "")}" placeholder="Ex.: Energisa, Internet" required>
            </div>

            <div class="form-group">
                <label>Dia do Vencimento</label>
                <input name="vencimento" type="number" min="1" max="31" value="${itemExistente?.vencimento ?? ""}" placeholder="Ex.: 15" required>
            </div>

            <div class="form-group" style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label>Valor Padrão (R$)</label>
                    <input name="padrao" class="moeda-input" type="text" inputmode="decimal" value="${padraoVal}" placeholder="0,00" required>
                </div>
                <div style="flex: 1;">
                    <label>Valor Deste Mês (R$)</label>
                    <input name="mes" class="moeda-input" type="text" inputmode="decimal" value="${mesVal || padraoVal}" placeholder="0,00" required>
                </div>
            </div>

            <div class="form-group">
                <label>Conta Ativa?</label>
                <select name="ativa">
                    <option value="true" ${itemExistente?.ativa !== false ? "selected" : ""}>Sim</option>
                    <option value="false" ${itemExistente?.ativa === false ? "selected" : ""}>Não</option>
                </select>
            </div>

            <button type="submit" class="button primary submit-button">
                ${isEdicao ? "Salvar alterações" : "Salvar conta"}
            </button>
        `;
    }

    // ================= GASTO / ENTRADA =================
    else {
        const isGasto = tipo === "gasto";
        modalTitle.textContent = isEdicao
            ? (isGasto ? "Editar gasto" : "Editar entrada")
            : (isGasto ? "Novo gasto" : "Nova entrada");

        const dataPadrao = itemExistente ? itemExistente.data : dataHojeInput();
        const horaPadrao = itemExistente?.hora ? itemExistente.hora : horaAtualInput();
        const descPadrao = itemExistente ? itemExistente.descricao : "";
        const valorPadrao = itemExistente ? Number(itemExistente.valor).toFixed(2).replace(".", ",") : "";

        const optionsCategoria = CONFIG.categorias.map(c => `
            <option value="${c}" ${itemExistente?.categoria === c ? "selected" : ""}>${c}</option>
        `).join("");

        const optionsPessoas = CONFIG.pessoas.map(p => `
            <option value="${p}" ${itemExistente?.pessoa === p ? "selected" : ""}>${p}</option>
        `).join("");

        const optionsFormas = CONFIG.formasPagamento.map(f => `
            <option value="${f}" ${itemExistente?.forma === f ? "selected" : ""}>${f}</option>
        `).join("");

        const optionsOrigem = CONFIG.origens.map(o => `
            <option value="${o}" ${itemExistente?.origem === o ? "selected" : ""}>${o}</option>
        `).join("");

        modalForm.innerHTML = `
            <input type="hidden" name="tipo" value="${tipo}">
            <input type="hidden" name="id" value="${idEdicao ?? ""}">
            
            <div class="form-group" style="display: flex; gap: 10px;">
                <div style="flex: 2;">
                    <label>Data</label>
                    <input name="data" type="date" value="${dataPadrao}" required>
                </div>
                <div style="flex: 1;">
                    <label>Hora</label>
                    <input name="hora" type="time" value="${horaPadrao}" required>
                </div>
            </div>

            <div class="form-group">
                <label>Descrição</label>
                <input name="descricao" value="${escaparHTML(descPadrao)}" placeholder="${isGasto ? "Ex.: Carvão" : "Ex.: Venda da espetaria"}" required>
            </div>

            <div class="form-group">
                <label>Valor (R$)</label>
                <input name="valor" 
                       class="moeda-input" 
                       type="text" 
                       inputmode="decimal" 
                       value="${valorPadrao}" 
                       placeholder="0,00" 
                       required>
            </div>

            ${isGasto ? `
                <div class="form-group">
                    <label>Categoria</label>
                    <select name="categoria">${optionsCategoria}</select>
                </div>
                <div class="form-group">
                    <label>Pessoa</label>
                    <select name="pessoa">${optionsPessoas}</select>
                </div>
                <div class="form-group">
                    <label>Forma de pagamento</label>
                    <select name="forma">${optionsFormas}</select>
                </div>
            ` : `
                <div class="form-group">
                    <label>Origem</label>
                    <select name="origem">${optionsOrigem}</select>
                </div>
            `}

            <button type="submit" class="button primary submit-button">
                ${isEdicao ? "Salvar alterações" : (isGasto ? "Salvar gasto" : "Salvar entrada")}
            </button>
        `;
    }

    // Aplica formatação automática em todos os campos de valor do formulário
    modalForm.querySelectorAll(".moeda-input").forEach(inputEl => {
        inputEl.addEventListener("blur", () => formatarBlurInput(inputEl));
    });

    modalForm.onsubmit = submeterModal;
}

function fecharModal() {
    modal.classList.add("hidden");
    modalForm.innerHTML = "";
}

function submeterModal(event) {
    event.preventDefault();
    const formData = new FormData(modalForm);
    const tipo = formData.get("tipo");
    const idExistente = formData.get("id");

    // ================= SALVAR CARTÃO =================
    if (tipo === "cartao") {
        const dadosCartao = {
            nome: formData.get("nome"),
            limite: parseMoedaBR(formData.get("limite")),
            vencimento: Number(formData.get("vencimento")) || null,
            previsao: parseMoedaBR(formData.get("previsao"))
        };

        if (idExistente) {
            const index = state.dados.cartoes.findIndex(c => String(c.id) === String(idExistente));
            if (index !== -1) {
                state.dados.cartoes[index] = {
                    ...state.dados.cartoes[index],
                    ...dadosCartao
                };
            }
        } else {
            state.dados.cartoes.push({
                id: gerarId(),
                ...dadosCartao,
                real: dadosCartao.previsao,
                observacao: ""
            });
        }
    }

    // ================= SALVAR CONTA FIXA =================
    else if (tipo === "conta") {
        const dadosConta = {
            nome: formData.get("nome"),
            vencimento: Number(formData.get("vencimento")) || null,
            padrao: parseMoedaBR(formData.get("padrao")),
            mes: parseMoedaBR(formData.get("mes")),
            ativa: formData.get("ativa") === "true"
        };

        if (idExistente) {
            const index = state.dados.contas.findIndex(c => String(c.id) === String(idExistente));
            if (index !== -1) {
                state.dados.contas[index] = {
                    ...state.dados.contas[index],
                    ...dadosConta
                };
            }
        } else {
            state.dados.contas.push({
                id: gerarId(),
                ...dadosConta
            });
        }
    }

    // ================= SALVAR GASTO / ENTRADA =================
    else {
        const valorNumerico = parseMoedaBR(formData.get("valor"));

        if (idExistente) {
            if (tipo === "gasto") {
                const index = state.dados.gastos.findIndex(g => String(g.id) === String(idExistente));
                if (index !== -1) {
                    state.dados.gastos[index] = {
                        ...state.dados.gastos[index],
                        data: formData.get("data"),
                        hora: formData.get("hora"),
                        descricao: formData.get("descricao"),
                        valor: valorNumerico,
                        categoria: formData.get("categoria"),
                        pessoa: formData.get("pessoa"),
                        forma: formData.get("forma")
                    };
                }
            } else {
                const index = state.dados.entradas.findIndex(e => String(e.id) === String(idExistente));
                if (index !== -1) {
                    state.dados.entradas[index] = {
                        ...state.dados.entradas[index],
                        data: formData.get("data"),
                        hora: formData.get("hora"),
                        descricao: formData.get("descricao"),
                        valor: valorNumerico,
                        origem: formData.get("origem")
                    };
                }
            }
        } else {
            const itemBase = {
                id: gerarId(),
                data: formData.get("data"),
                hora: formData.get("hora") || horaAtualInput(),
                descricao: formData.get("descricao"),
                valor: valorNumerico
            };

            if (tipo === "gasto") {
                state.dados.gastos.push({
                    ...itemBase,
                    categoria: formData.get("categoria"),
                    pessoa: formData.get("pessoa"),
                    forma: formData.get("forma")
                });
            } else {
                state.dados.entradas.push({
                    ...itemBase,
                    origem: formData.get("origem")
                });
            }
        }
    }

    salvarEstado();
    fecharModal();
    renderizarTudo();
}

/* =====================================================
   8. DELEGAÇÃO DE EVENTOS & INTERAÇÕES
===================================================== */
function navegarPagina(nomePagina) {
    document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
    document.getElementById(nomePagina)?.classList.add("active");

    document.querySelectorAll(".nav-button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === nomePagina);
    });

    const titulos = {
        inicio: "Visão geral",
        lancamentos: "Lançamentos",
        cartoes: "Cartões",
        contas: "Contas fixas"
    };
    document.getElementById("pageTitle").textContent = titulos[nomePagina] || "Visão geral";
}

document.addEventListener("click", event => {
    const navBtn = event.target.closest("[data-page]");
    if (navBtn) {
        navegarPagina(navBtn.dataset.page);
        return;
    }

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) {
        const action = actionBtn.dataset.action;

        // Modais de Criação
        if (action === "novo-gasto") return abrirModal("gasto");
        if (action === "nova-entrada") return abrirModal("entrada");

        // Ações de Edição
        if (action === "editar-lancamento") {
            const { tipo, id } = actionBtn.dataset;
            return abrirModal(tipo.toLowerCase(), id);
        }
        if (action === "editar-cartao") {
            return abrirModal("cartao", actionBtn.dataset.id);
        }
        if (action === "editar-conta") {
            return abrirModal("conta", actionBtn.dataset.id);
        }

        // Ações de Exclusão (com 🗑)
        if (action === "excluir-lancamento") {
            const { tipo, id } = actionBtn.dataset;
            if (confirm(`Excluir este(a) ${tipo.toLowerCase()}?`)) {
                if (tipo === "Gasto") {
                    state.dados.gastos = state.dados.gastos.filter(g => String(g.id) !== String(id));
                } else {
                    state.dados.entradas = state.dados.entradas.filter(e => String(e.id) !== String(id));
                }
                salvarEstado();
                renderizarTudo();
            }
            return;
        }

        if (action === "excluir-cartao") {
            const { id } = actionBtn.dataset;
            if (confirm("Excluir este cartão?")) {
                state.dados.cartoes = state.dados.cartoes.filter(c => String(c.id) !== String(id));
                salvarEstado();
                renderizarTudo();
            }
            return;
        }

        if (action === "excluir-conta") {
            const { id } = actionBtn.dataset;
            if (confirm("Excluir esta conta fixa?")) {
                state.dados.contas = state.dados.contas.filter(c => String(c.id) !== String(id));
                salvarEstado();
                renderizarTudo();
            }
            return;
        }
    }
});

// Edição rápida direta nos inputs das tabelas
document.addEventListener("change", event => {
    if (event.target.classList.contains("input-cartao-real")) {
        const id = event.target.dataset.id;
        const val = event.target.value.trim();
        const cartao = state.dados.cartoes.find(c => String(c.id) === String(id));
        if (cartao) {
            cartao.real = val === "" ? "" : parseMoedaBR(val);
            salvarEstado();
            renderizarTudo();
        }
    }

    if (event.target.classList.contains("input-conta-mes")) {
        const id = event.target.dataset.id;
        const val = parseMoedaBR(event.target.value);
        const conta = state.dados.contas.find(c => String(c.id) === String(id));
        if (conta) {
            conta.mes = val;
            salvarEstado();
            renderizarTudo();
        }
    }

    if (event.target.classList.contains("check-conta-ativa")) {
        const id = event.target.dataset.id;
        const conta = state.dados.contas.find(c => String(c.id) === String(id));
        if (conta) {
            conta.ativa = event.target.checked;
            salvarEstado();
            renderizarTudo();
        }
    }
});

// Navegação de Mês
document.getElementById("previousMonth").addEventListener("click", () => {
    if (state.mesReferencia === 0) {
        state.mesReferencia = 11;
        state.anoReferencia -= 1;
    } else {
        state.mesReferencia -= 1;
    }
    renderizarTudo();
});

document.getElementById("nextMonth").addEventListener("click", () => {
    if (state.mesReferencia === 11) {
        state.mesReferencia = 0;
        state.anoReferencia += 1;
    } else {
        state.mesReferencia += 1;
    }
    renderizarTudo();
});

// Fechar Modal
document.getElementById("fecharModal").addEventListener("click", fecharModal);
modal.addEventListener("click", event => {
    if (event.target.id === "modal") fecharModal();
});

// Disparadores dos botões de adicionar do topo
document.getElementById("adicionarCartao").addEventListener("click", () => {
    abrirModal("cartao");
});

document.getElementById("adicionarConta").addEventListener("click", () => {
    abrirModal("conta");
});

/* =====================================================
   9. INICIALIZAÇÃO
===================================================== */
renderizarTudo();
iniciarRelogio();