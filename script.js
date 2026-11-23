(()=>{
    const POR_PAGINA = 5;
    const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const $ = id => document.getElementById(id);


    //dados iniciais
    const INICIAL = [
        {date: '2026-11-10', cestas:35, refeições:120},
        {date: '2026-11-09', cestas:25, refeições:130},
        {date: '2026-11-08', cestas:40, refeições:150}
    ];

    const limpar = lista => Array.isArray(lista)
        ? lista.filter(r => r && /^\d{4}-\d{2}-\d{2}$/.test(r.date))
               .map(r => ({date: r.date, cestas: Math.max(0, parseInt(r.cestas) || 0), refeicoes: Math.max(0, parseInt(r.refeicoes) || 0)}))
        : null;

    let records;
    try{
        records = limpar(JSON.parse(localStorage.getItem('as-records'))) || INICIAL; 
    }catch {
            records = INICIAL;
    }
    const persist = () => {try{
        localStorage.setItem('as-records', JSON.stringify(records));
    } catch{
    }};

    let editing = null; // data (ISO) em edição
    let page = 1;

    const iso = d =>d.toISOString().slice(0,10);
    const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return iso(d); };
    const br = s => s.split('-').reverse().join('/');
    const longDate = s => {
        const [y,m,d] = s.split('-'); return `${+d} de ${MESES[m-1]} de ${y}`;
    };

    function toast(t){
        const el = $('toast'); el.textContent = t;
        el.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 2200); }
        function mensagem(t, cls=''){
            const el = $('mensagem'); el.textContent= t; el.className = 'mensagem ' + cls;
    }

    //cabeçalho e filtros

    $('today').textContent = longDate(todayISO());
    $('date').value = todayISO();
    const now = new Date();
    $('fMes').innerHTML = MESES.map((m,i) => `<option value="${i+1}">${m}</option>`).join('');
    $('fMes').value = now.getMonth() + 1;
    function fillYears(){
        const yes = new Set([now.getFullYear(), ...records.map(r => +r.date.slice(0,4))]);
        const cur = $('fAno').value;
        $('fAno').innerHTML = [...yes].sort((a, b) => b-a).map(y => `<option>${y}</option>`).join('');
        $('fAno').value = cur && yes.has(+cur) ? cur : now.getFullYear();
    }
    fillYears();


    //contadores

    document.querySelectorAll('.botoes button').forEach(b => {
        b.addEventListener('click',()=>{
            const inp = $(b.dataset.t);
            inp.value = Math.max(0, (parseInt(inp.value) || 0) + +b.dataset.d);
        });
    });
    ['cestas','refeicoes'].forEach(id => {
        $(id).addEventListener('input', e => {
            if(e.target.value <0) e.target.value =0;
        });
    });

    //salvar

    function resetForm(){
        editing = null;
        $('date').value = todayISO();
        $('cestas').value = 0;
        $('refeicoes').value = 0;
        $('salvarLabel').textContent = 'Salvar Registro';
    }
    $('salvar').addEventListener('click', () =>{
        const date = $('date').value;
        const cestas = parseInt($('cestas').value) || 0;
        const refeicoes = parseInt($('refeicoes').value) || 0;
        if (!date) return mensagem('Informe a data do atendimento.', 'err');
        if (cestas === 0 && refeicoes === 0) return mensagem('Informe ao menos uma cesta ou uma refeição.', 'err');

        const dup = records.find(r => r.date === date && r.date !== editing);
        if (dup && !confirm(`Já existe um registro em ${br(date)}. Deseja substituí-lo?`)) return;

        records = records.filter(r => r.date !== date && r.date !== editing);
        records.push({date, cestas, refeicoes});
        records.sort((a,b) => b.date.localeCompare(a.date));
        persist();

        $('fMes').value = +date.slice(5,7); fillYears(); $('fAno').value=date.slice(0,4);
        page = 1; mensagem('');
        toast(editing ? 'Registro atualizado.' : 'Registro salvo.');
        resetForm(); render();
    });

    //tabela

    const filtered = () => records.filter(r => +r.date.slice(5, 7) === +$('fMes').value && r.date.slice(0, 4) === $('fAno').value)
    .sort((a,b) => b.date.localeCompare(a.date));

    function render(){
        const list= filtered();
        const paginas = Math.max(1, Math.ceil(list.length / POR_PAGINA));
        page = Math.min(page, paginas);
        const slice = list.slice((page-1)*POR_PAGINA, page*POR_PAGINA);

        $('linhas').innerHTML = slice.length ? slice.map(r => `
        <tr>
            <td>${br(r.date)}</td><td>${r.cestas}</td><td>${r.refeicoes}</td>
            <td><div class="acoes">
                <button class="btn edit" data-edit="${r.date}"><svg viewBox="0 0 24 24"><use href="#i-edit"/></svg><span>Editar</span></button>
                <button class="btn deletar" data-del="${r.date}"><svg viewBox="0 0 24 24"><use href="#i-trash"/></svg><span>Excluir</span></button></div></td>
        </tr>`).join('') : `<tr><td colspan="4" class="empty">Nenhum registro neste mês. Salve o primeiro atendimento acima.</td></tr>`;


        $('contador').textContent = `Mostrando ${list.length} registro${list.length === 1 ? '' : 's'}`;
        let p = `<button ${page===1?'disabled':''} data-p="${page-1}" aria-label="Página anterior">‹</button>`;
        for (let i = 1; i <= paginas; i++) p += `<button class="${i===page?'on':''}" data-p="${i}">${i}</button>`;
        p += `<button ${page===paginas?'disabled':''} data-p="${page+1}" aria-label="Próxima página">›</button>`;
        $('pagina').innerHTML = p;

        //relatório
        $('rCestas').textContent = list.reduce((s,r) => s + r.cestas, 0);
        $('rRefeicoes').textContent = list.reduce((s,r) => s + r.refeicoes, 0);
        $('rDias').textContent = list.length;
    }

    //gráficos

    


    document.querySelectorAll('.filtro-grafico').forEach(botao =>{
        botao.addEventListener('click', () =>{
            const tipo = botao.dataset.tipo;

            document.querySelectorAll('filtro-grafico').forEach(b => b.classList.remove('ativo'));

            botao.classList.add('ativo');
        })
    })

    $('linhas').addEventListener('click', e => {
        const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
        if (ed) {
            const r = records.find(x => x.date === ed.dataset.edit);
            editing = r.date; $('date').value = r.date; $('cestas').value = r.cestas; $('refeicoes').value = r.refeicoes;
            $('salvarLabel').textContent = 'Atualizar Registro';
            mensagem(`Editando o registro de ${br(r.date)}.`);
            show('dashboard'); window.scrollTo({top:0, behavior:'smooth'});
        }
        if (del && confirm(`Excluir o registro de ${br(del.dataset.del)}?`)) {
            records = records.filter(r => r.date !== del.dataset.del);
            persist(); if (editing === del.dataset.del) resetForm();
            render(); toast('Registro excluído.');
        }
    })

    $('pagina').addEventListener('click', e => {
         const b = e.target.closest('[data-p]'); if (b && !b.disabled) 
            { page = +b.dataset.p; render(); } 
        });
    ['fMes','fAno'].forEach(id => $(id).addEventListener('change', () => { page = 1; render();
    }));

    // Navegação

    function show(v){
        document.querySelectorAll('.tela').forEach(s => s.classList.toggle('ativa', s.id === 'v-' + v));
        document.querySelectorAll('.item-nav[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    }
    document.querySelectorAll('.item-nav[data-view]').forEach(b => b.addEventListener('click', () => show(b.dataset.view)));
    $('clearAll').addEventListener('click', () => {
        if (confirm('Apagar todos os registros? Esta ação não pode ser desfeita.')){ 
            records = []; persist(); fillYears(); render(); toast('Todos os registros foram apagados.'); 
        }
    });

    // Autenticação (simulada, apenas no navegador)

    const SESSION_KEY = 'as-session';
    const USERS = [
    {user:'recepcao', pass:'1234',     nome:'Recepção'},
    {user:'admin',    pass:'admin123', nome:'Administrador'}
    ];
    let fails = 0, lockUntil = 0;

    const getSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)); } catch { return null; } };
    const saveSession = (u, keep) => { try { (keep ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify({user:u.user, nome:u.nome})); } catch {} };
    const clearSession = () => { try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch {} };

    function applySession(s){
        document.body.classList.toggle('locked', !s);
        if (s) { $('userName').textContent = s.nome; }
        else { $('lPass').value = ''; $('lUser').focus(); }
    }

    $('togglePw').addEventListener('click', () => {
        const visivel = $('lPass').type === 'password';
        $('lPass').type = visivel ? 'text' : 'password';
        $('togglePw').textContent = visivel ? 'Ocultar' : 'Mostrar';
        $('togglePw').setAttribute('aria-label', visivel ? 'Ocultar senha' : 'Mostrar senha');
    });

    $('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        const err = t => { $('lMsg').textContent = t; };
        const wait = Math.ceil((lockUntil - Date.now()) / 1000);
        if (wait > 0) return err(`Muitas tentativas. Aguarde ${wait}s para tentar de novo.`);

        const user = $('lUser').value.trim().toLowerCase(), pass = $('lPass').value;
        if (!user || !pass) return err('Informe o usuário e a senha.');

        const found = USERS.find(u => u.user === user && u.pass === pass);
        if (!found) {
            fails++;
            if (fails >= 5) { fails = 0; lockUntil = Date.now() + 30000; return err('Muitas tentativas. Aguarde 30s para tentar de novo.'); }
            $('lPass').value = ''; $('lPass').focus();
            return err('Usuário ou senha incorretos. Confira os dados e tente de novo.');
        }
        fails = 0; err('');
        const session = {user:found.user, nome:found.nome};
        saveSession(found, $('lKeep').checked);
        $('lUser').value = '';
        applySession(session);
        toast(`Bem-vindo(a), ${found.nome}.`);
    });

    $('logout').addEventListener('click', () => {
        clearSession(); resetForm(); mensagem(''); show('dashboard'); applySession(null);
    });

    $('btnMenu').addEventListener('click', () => document.body.classList.toggle('menu-oculto'));

    applySession(getSession());
    render();

})();