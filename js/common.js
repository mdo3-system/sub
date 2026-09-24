// =========================================
// 共通ヘッダー・印刷管理・保存復元 (common.js)
// =========================================

const GlobalInfo = {
    // ツールごとのHTMLに置く空のコンテナID
    containerId: 'global-header-container',
    
    // 保存・管理するフィールド群
    fields: ['g_project', 'g_date', 'g_engineer'],

    init: function() {
        this.checkSessionStatus();
        this.renderScreenHeader();
        this.renderPrintHeader();
        this.loadFromStorage();
        this.bindEvents();
        ToolStorage.init();
    },

    // ログイン時・新規セッション（ブラウザ再起動・日々の初回アクセス）のデータ引き継ぎ防止クリア処理
    checkSessionStatus: function() {
        // セッションストレージで作業セッションがアクティブか判定
        const sessionActive = sessionStorage.getItem('struct_tools_session_active');
        if (!sessionActive) {
            // 新規アクセス / 日々の初回ログイン時は過去の共通ヘッダー入力（物件名・計算日・設計者）を全クリア
            this.fields.forEach(id => {
                localStorage.removeItem('struct_tools_' + id);
                sessionStorage.removeItem('struct_tools_' + id);
            });
            // セッションアクティブフラグをセット
            sessionStorage.setItem('struct_tools_session_active', '1');
        }
    },

    clearHeaderData: function() {
        this.fields.forEach(id => {
            localStorage.removeItem('struct_tools_' + id);
            sessionStorage.removeItem('struct_tools_' + id);
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        this.updatePrintHeader();
    },

    renderScreenHeader: function() {
        const container = document.getElementById(this.containerId);
        if(!container) return; // コンテナが無ければ何もしない

        // パスの調整 (tools/ フォルダ内かどうかで戻り先を調整)
        const isSubDir = window.location.pathname.includes('/tools/');
        const portalPath = isSubDir ? '../index.html' : './index.html';
        const hubPath = isSubDir ? '../shosai-hub.html' : './shosai-hub.html';
        const wrcHubPath = isSubDir ? '../wrc-hub.html' : './wrc-hub.html';
        const isHubTool = window.location.pathname.includes('shosai-') || window.location.pathname.includes('neta') || window.location.pathname.includes('kugihairetsu');
        const isWrcTool = window.location.pathname.includes('wrc_') || window.location.pathname.includes('wrc-');

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

        // WRC造ツールの場合はWRCハブへの戻りも追加
        if (isWrcTool && !window.location.pathname.includes('wrc-hub.html')) {
            navHtml += `
                <a href="${wrcHubPath}" class="nav-link">
                    <span class="material-symbols-outlined">domain</span>
                    WRC造パッケージへ
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
            <div id="global-tool-action-bar-container" class="no-print"></div>
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

    // 4. ブラウザ(SessionStorage)から同セッション内の入力を復元
    loadFromStorage: function() {
        this.fields.forEach(id => {
            const el = document.getElementById(id);
            // 同一セッション内（sessionStorage）優先で復元
            const savedVal = sessionStorage.getItem('struct_tools_' + id);
            if(el && savedVal) {
                el.value = savedVal;
            }
        });

        // 計算日が空の場合は本日の日付をデフォルト設定
        const dateEl = document.getElementById('g_date');
        if (dateEl && !dateEl.value) {
            const today = new Date().toISOString().split('T')[0];
            dateEl.value = today;
            sessionStorage.setItem('struct_tools_g_date', today);
        }
        
        this.updatePrintHeader();
    },

    // 5. 入力されるたびに保存＆印刷用ヘッダーを更新
    bindEvents: function() {
        this.fields.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.addEventListener('input', (e) => {
                    // 入力内容は同作業セッション内（sessionStorage）でのみ保持し、過去永続保存はしない
                    sessionStorage.setItem('struct_tools_' + id, e.target.value);
                    localStorage.removeItem('struct_tools_' + id); // 旧データの完全クリア
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

// =========================================
// 統一保存・復元・印刷管理モジュール (ToolStorage)
// =========================================
const ToolStorage = {
    init: function() {
        this.renderActionBar();
    },

    renderActionBar: function() {
        // すでに描画済み、あるいはメインポータルなど非適用画面ではスキップ
        if (document.getElementById('tool-storage-action-bar')) return;

        const container = document.getElementById('global-tool-action-bar-container') || document.querySelector('.tool-container');
        if (!container) return;

        // ポータル画面やハブ画面など計算ツール以外ではボタンバーを表示しない判定
        const path = window.location.pathname;
        if (path.endsWith('/') || path.endsWith('index.html') || path.endsWith('shosai-hub.html') || path.endsWith('wrc-hub.html') || path.endsWith('login.html')) {
            return;
        }

        const bar = document.createElement('div');
        bar.id = 'tool-storage-action-bar';
        bar.className = 'tool-action-bar no-print';
        bar.innerHTML = `
            <div class="action-bar-title">
                <span class="material-symbols-outlined" style="font-size:18px;">build_circle</span>
                データ管理・帳票出力
            </div>
            <button type="button" class="btn btn-outline" onclick="ToolStorage.saveData()">
                <span class="material-symbols-outlined" style="font-size:16px;">download</span>
                💾 データ保存 (JSON)
            </button>
            <button type="button" class="btn btn-outline" onclick="ToolStorage.triggerImport()">
                <span class="material-symbols-outlined" style="font-size:16px;">upload</span>
                📂 データ復元 (JSON)
            </button>
            <button type="button" class="btn btn-primary" onclick="ToolStorage.print()">
                <span class="material-symbols-outlined" style="font-size:16px;">print</span>
                🖨️ A4 印刷
            </button>
            <input type="file" id="tool-storage-file-input" accept=".json" style="display:none;" onchange="ToolStorage.handleFileSelect(event)">
        `;

        if (document.getElementById('global-tool-action-bar-container')) {
            document.getElementById('global-tool-action-bar-container').appendChild(bar);
        } else {
            container.insertBefore(bar, container.firstChild);
        }
    },

    // 画面の全入力値を収集してJSONファイルをダウンロード保存
    saveData: function() {
        const toolName = window.location.pathname.split('/').pop().replace('.html', '') || 'structural_tool';
        const docTitle = document.title || toolName;
        const headerData = GlobalInfo.getData();

        // フォーム内の全input, select, textareaの値を収集
        const formValues = {};
        const elements = document.querySelectorAll('input, select, textarea');

        elements.forEach(el => {
            if (!el.id && !el.name) return;
            const key = el.id || el.name;
            if (key.startsWith('g_')) return; // ヘッダー情報は別枠管理

            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.checked) formValues[key] = el.value;
            } else {
                formValues[key] = el.value;
            }
        });

        const exportPayload = {
            app_version: window.APP_VERSION || "1.4.0",
            tool_id: toolName,
            title: docTitle,
            timestamp: new Date().toISOString(),
            header: headerData,
            data: formValues
        };

        const jsonStr = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        const projName = headerData.g_project ? headerData.g_project.replace(/[\\/:*?"<>|]/g, '_') : '物件未設定';
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `${toolName}_${projName}_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`✓ 入力データをJSONファイルとして保存（ダウンロード）しました。\nファイル名: ${a.download}`);
    },

    triggerImport: function() {
        const fileInput = document.getElementById('tool-storage-file-input');
        if (fileInput) {
            fileInput.value = '';
            fileInput.click();
        }
    },

    handleFileSelect: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const payload = JSON.parse(e.target.result);
                if (!payload || typeof payload !== 'object') {
                    throw new Error("無効なJSONフォーマットです。");
                }
                this.restoreData(payload);
            } catch (err) {
                alert("ファイルの読み込みに失敗しました: " + err.message);
            }
        };
        reader.readAsText(file);
    },

    restoreData: function(payload) {
        // 1. ヘッダー情報の復元
        if (payload.header) {
            if (payload.header.g_project && document.getElementById('g_project')) {
                document.getElementById('g_project').value = payload.header.g_project;
                sessionStorage.setItem('struct_tools_g_project', payload.header.g_project);
            }
            if (payload.header.g_date && document.getElementById('g_date')) {
                document.getElementById('g_date').value = payload.header.g_date;
                sessionStorage.setItem('struct_tools_g_date', payload.header.g_date);
            }
            if (payload.header.g_engineer && document.getElementById('g_engineer')) {
                document.getElementById('g_engineer').value = payload.header.g_engineer;
                sessionStorage.setItem('struct_tools_g_engineer', payload.header.g_engineer);
            }
            GlobalInfo.updatePrintHeader();
        }

        // 2. フォーム各要素への設定とイベント発火
        if (payload.data) {
            Object.keys(payload.data).forEach(key => {
                const val = payload.data[key];
                const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                if (!el) return;

                if (el.type === 'checkbox' || el.type === 'radio') {
                    const group = document.querySelectorAll(`[name="${key}"], #${key}`);
                    group.forEach(target => {
                        target.checked = (target.value === val);
                        target.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                } else {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

        // グローバル計算関数がある場合呼び出し（calc, calculate, calculateAll等）
        if (typeof window.calc === 'function') window.calc();
        if (typeof window.calculate === 'function') window.calculate();
        if (typeof window.calculateAll === 'function') window.calculateAll();

        alert("✓ 保存データを画面に復元し、計算を再実行しました。");
    },

    print: function() {
        GlobalInfo.updatePrintHeader();
        window.print();
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