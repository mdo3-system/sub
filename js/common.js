// =========================================
// 共通ヘッダー・印刷管理 (common.js)
// =========================================

const GlobalInfo = {
    // ツールごとのHTMLに置く空のコンテナID
    containerId: 'global-header-container',
    
    // 保存・管理するフィールド群
    fields: ['g_project', 'g_date', 'g_engineer'],

    init: function() {
        this.renderScreenHeader();
        this.renderPrintHeader();
        this.loadFromStorage();
        this.bindEvents();
    },

    renderScreenHeader: function() {
        const container = document.getElementById(this.containerId);
        if(!container) return; // コンテナが無ければ何もしない

        // パスの調整 (tools/ フォルダ内かどうかで戻り先を調整)
        const isSubDir = window.location.pathname.includes('/tools/');
        const portalPath = isSubDir ? '../index.html' : './index.html';
        const hubPath = isSubDir ? '../shosai-hub.html' : './shosai-hub.html';
        const isHubTool = window.location.pathname.includes('shosai-') || window.location.pathname.includes('neta') || window.location.pathname.includes('kugihairetsu');

        let navHtml = `
            <div class="global-header-nav no-print">
                <a href="${portalPath}" class="nav-link">
                    <span class="material-symbols-outlined">home</span>
                    メインポータルへ
                </a>
        `;
        
        // 詳細計算系ツールの場合はハブへの戻りも追加
        if (isHubTool && !window.location.pathname.includes('shosai-hub.html')) {
            navHtml += `
                <a href="${hubPath}" class="nav-link">
                    <span class="material-symbols-outlined">grid_view</span>
                    詳細計算パッケージへ
                </a>
            `;
        }
        
        navHtml += `</div>`;

        container.innerHTML = `
            ${navHtml}
            <div class="global-header-inputs no-print">
                <div class="header-field-project"><label>工事名称</label><input type="text" id="g_project" placeholder="○○邸 新築工事"></div>
                <div class="header-field-date"><label>計算日</label><input type="date" id="g_date"></div>
                <div class="header-field-engineer"><label>設計者</label><input type="text" id="g_engineer" placeholder="一級建築士 第123456号 氏名"></div>
            </div>
        `;
    },

    // 2. 印刷時のみ表示される共通ヘッダー要素をBodyの先頭に挿入
    renderPrintHeader: function() {
        let printHeader = document.getElementById('global-print-header');
        if(!printHeader) {
            printHeader = document.createElement('div');
            printHeader.id = 'global-print-header';
            printHeader.className = 'print-only'; // CSSで印刷時のみ表示
            document.body.insertBefore(printHeader, document.body.firstChild);
        }
    },

    // 3. 入力内容を印刷用ヘッダーに反映
    updatePrintHeader: function() {
        const data = this.getData();
        const printHeader = document.getElementById('global-print-header');
        const docTitle = document.title; // ツールごとのタイトルタグを取得

        if(printHeader) {
            printHeader.innerHTML = `
                <div class="print-header-title">${docTitle}</div>
                <div class="print-header-info">
                    <div class="phi-row">
                        <div><span class="phi-lbl">工事名称:</span> <span class="phi-val">${data.g_project || "—"}</span></div>
                        <div><span class="phi-lbl">計算日:</span> <span class="phi-val">${data.g_date || "—"}</span></div>
                    </div>
                    <div class="phi-row">
                        <div><span class="phi-lbl">設計者:</span> <span class="phi-val">${data.g_engineer || "—"}</span></div>
                    </div>
                </div>
            `;
        }
    },

    // 4. ブラウザ(LocalStorage)から前回の入力を復元
    loadFromStorage: function() {
        this.fields.forEach(id => {
            const el = document.getElementById(id);
            const savedVal = localStorage.getItem('struct_tools_' + id);
            if(el && savedVal) {
                el.value = savedVal;
            }
        });
        
        // 過去の別々保存データ（g_arch_type, g_arch_no）が存在しg_engineerが空の場合は統合移行する
        const engEl = document.getElementById('g_engineer');
        if (engEl && !engEl.value) {
            const oldType = localStorage.getItem('struct_tools_g_arch_type');
            const oldNo = localStorage.getItem('struct_tools_g_arch_no');
            const oldEng = localStorage.getItem('struct_tools_g_engineer');
            let merged = [];
            if (oldType && oldType !== "無資格・その他") merged.push(oldType);
            if (oldNo) merged.push(oldNo);
            if (oldEng) merged.push(oldEng);
            if (merged.length > 0) {
                engEl.value = merged.join(" ");
                localStorage.setItem('struct_tools_g_engineer', engEl.value);
            }
        }
        
        this.updatePrintHeader();
    },

    // 5. 入力されるたびに保存＆印刷用ヘッダーを更新
    bindEvents: function() {
        this.fields.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('input', (e) => {
                    localStorage.setItem('struct_tools_' + id, e.target.value);
                    this.updatePrintHeader();
                });
            }
        });
        // 印刷プレビュー実行直前にも念のため更新
        window.addEventListener('beforeprint', () => this.updatePrintHeader());
    },

    // ★カスタム印刷ロジック（jintsuko.html等）でデータを取得するためのメソッド
    getData: function() {
        return {
            g_project: document.getElementById('g_project') ? document.getElementById('g_project').value : "",
            g_date: document.getElementById('g_date') ? document.getElementById('g_date').value : "",
            g_engineer: document.getElementById('g_engineer') ? document.getElementById('g_engineer').value : "",
            g_arch_type: "",
            g_arch_no: ""
        };
    }
};

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
    GlobalInfo.init();
});

async function checkAuth() {
    if (window.location.protocol === 'file:') return true;
    try {
        const response = await fetch('/api/check_auth.php');
        if (!response.ok) return true; // サーバーエラー時は処理を継続
        const data = await response.json();
        if (data && data.authenticated === false) {
            alert("セッションが切れたか、別の端末でログインされました。再度ログインしてください。");
            window.location.href = '/login.html';
            return false;
        }
        return true;
    } catch (err) {
        console.warn("Auth check error, skipping redirect:", err);
        return true;
    }
}

// 認証チェック処理を追加
document.addEventListener('DOMContentLoaded', async () => {
    // ログイン画面自体ではチェックしない
    if (window.location.pathname.includes('login.html')) return;

    // 初回読み込み時のチェック
    await checkAuth();
});