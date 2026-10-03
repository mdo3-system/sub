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

    // 画面の全入力値および各ツール固有データ（人通口openings、Z係数tableHtml等）を収集して保存
    saveData: function() {
        const toolName = window.location.pathname.split('/').pop().replace('.html', '') || 'structural_tool';
        const docTitle = document.title || toolName;
        const headerData = GlobalInfo.getData();

        // 1. 各ツール固有の事前同期を実行
        if (typeof window.syncDomToOpenings === 'function') {
            window.syncDomToOpenings();
        }

        // 2. フォーム内の全input, select, textareaの値を収集
        const formValues = {};
        const elements = document.querySelectorAll('input, select, textarea');

        elements.forEach(el => {
            const key = el.id || el.name || el.dataset.field;
            if (!key) return;
            if (key.startsWith('g_')) return; // ヘッダー情報は別枠管理

            if (el.type === 'checkbox' || el.type === 'radio') {
                if (el.checked) formValues[key] = el.value || true;
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

        // 3. 人通口ツール等の開口データ (openings) を完全格納
        if (Array.isArray(window.openings) && window.openings.length > 0) {
            exportPayload.openings = window.openings;
            exportPayload.project = {
                project: headerData.g_project,
                date: headerData.g_date,
                engineer: headerData.g_engineer,
                fc: document.getElementById('p_fc')?.value || "21",
                note: document.getElementById('p_note')?.value || ""
            };
        }

        // 4. Z係数ツール等の履歴テーブル (tableHtml) を完全格納
        const ziTable = document.querySelector('#resultTable tbody');
        if (ziTable && ziTable.innerHTML.trim() !== '') {
            exportPayload.tableHtml = ziTable.innerHTML;
            exportPayload.inputs = formValues;
        }

        // 5. 垂木・直貼り屋根ツール等のparams
        if (document.getElementById('panel_spec')) {
            exportPayload.params = formValues;
        }

        // 6. めり込み補強ツール等の行データ (merikomi_rows) を完全格納
        if (typeof window.collectMerikomiRows === 'function') {
            const mRows = window.collectMerikomiRows();
            if (mRows.length > 0) {
                exportPayload.merikomi_rows = mRows;
                exportPayload.rows = mRows;
            }
        }

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
        const file = event.target.files && event.target.files[0];
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
            } finally {
                event.target.value = ''; // 同一ファイルの再選択を許可
            }
        };
        reader.readAsText(file);
    },

    restoreData: function(payload) {
        if (!payload || typeof payload !== 'object') {
            alert('無効なJSONデータです。');
            return;
        }

        let restoredItems = [];

        // 1. ヘッダー情報の復元
        const header = payload.header || payload.project;
        if (header) {
            const projName = header.g_project || header.project;
            if (projName && document.getElementById('g_project')) {
                document.getElementById('g_project').value = projName;
                sessionStorage.setItem('struct_tools_g_project', projName);
            }
            if (projName && document.getElementById('p_project')) {
                document.getElementById('p_project').value = projName;
            }
            const dateVal = header.g_date || header.date;
            if (dateVal && document.getElementById('g_date')) {
                document.getElementById('g_date').value = dateVal;
                sessionStorage.setItem('struct_tools_g_date', dateVal);
            }
            if (dateVal && document.getElementById('p_date')) {
                document.getElementById('p_date').value = dateVal;
            }
            const engVal = header.g_engineer || header.engineer;
            if (engVal && document.getElementById('g_engineer')) {
                document.getElementById('g_engineer').value = engVal;
                sessionStorage.setItem('struct_tools_g_engineer', engVal);
            }
            if (engVal && document.getElementById('p_engineer')) {
                document.getElementById('p_engineer').value = engVal;
            }
            if (header.fc && document.getElementById('p_fc')) {
                document.getElementById('p_fc').value = header.fc;
            }
            if (header.note && document.getElementById('p_note')) {
                document.getElementById('p_note').value = header.note;
            }
            if (typeof GlobalInfo !== 'undefined' && GlobalInfo.updatePrintHeader) {
                GlobalInfo.updatePrintHeader();
            }
            restoredItems.push('ヘッダー情報');
        }

        // 2. ツール固有の復元ハンドラ（window.restoreToolData）があれば最優先実行
        if (typeof window.restoreToolData === 'function') {
            const ok = window.restoreToolData(payload);
            if (ok) {
                restoredItems.push('計算ツール固有データ（開口・算定設定）');
            }
        } else {
            // 人通口ツール（openings / cards）等の汎用復元フォールバック
            const rawOpenings = payload.openings || payload.cards || payload.data?.openings || (Array.isArray(payload) ? payload : null);
            if (Array.isArray(rawOpenings) && (typeof window.openings !== 'undefined' || document.getElementById('cards'))) {
                const mapped = rawOpenings.map(raw => {
                    const base = (typeof window.newOpening === 'function') ? window.newOpening() : (typeof newOpening === 'function' ? newOpening() : {});
                    const o = { ...base, ...raw };
                    if (!o.id && typeof crypto !== 'undefined' && crypto.randomUUID) o.id = crypto.randomUUID();
                    return o;
                });
                window.openings = mapped;
                if (typeof window.recalculateAll === 'function') window.recalculateAll();
                if (typeof window.mountCards === 'function') window.mountCards();
                else if (typeof mountCards === 'function') mountCards();
                if (typeof window.updateGlobalControls === 'function') window.updateGlobalControls();
                if (typeof window.updatePrintPreview === 'function') window.updatePrintPreview();
                restoredItems.push(`人通口開口データ (${mapped.length}箇所)`);
            }
        }

        // 3. Z係数ツール（tableHtml）の完全復元
        const tableHtml = payload.tableHtml || payload.data?.tableHtml;
        const tableBody = document.querySelector('#resultTable tbody');
        if (tableHtml && tableBody) {
            tableBody.innerHTML = tableHtml;
            const rowCount = tableBody.querySelectorAll('tr').length;
            restoredItems.push(`Z・I 算定履歴 (${rowCount}件)`);
        }

        // 4. めり込み補強ツール（merikomi_rows / rows）の完全復元
        const mRows = payload.merikomi_rows || (payload.tool_id === 'merikomi' && payload.rows) || (Array.isArray(payload) && payload[0]?.pt ? payload : null);
        if (Array.isArray(mRows) && document.getElementById('table_body') && typeof addRow === 'function') {
            const tbody = document.getElementById('table_body');
            tbody.innerHTML = '';
            mRows.forEach(d => addRow(d));
            if (typeof checkOverallStatus === 'function') checkOverallStatus();
            restoredItems.push(`めり込み検討柱 (${mRows.length}箇所)`);
        }

        // 4. フォーム各要素（静的フォーム・入力値）への設定とイベント発火
        const formData = payload.data || payload.params || payload.inputs;
        if (formData && typeof formData === 'object') {
            Object.keys(formData).forEach(key => {
                if (key === 'openings' || key === 'tableHtml') return;
                const val = formData[key];
                const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`) || document.querySelector(`[data-field="${key}"]`);
                if (!el) return;

                if (el.type === 'checkbox' || el.type === 'radio') {
                    const group = document.querySelectorAll(`[name="${key}"], #${key}`);
                    if (group.length > 1) {
                        group.forEach(target => {
                            target.checked = (target.value === String(val));
                            target.dispatchEvent(new Event('change', { bubbles: true }));
                        });
                    } else {
                        el.checked = (val === true || val === "true" || val === el.value);
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                } else {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            if (typeof updateOptions === 'function') updateOptions();
            if (typeof toggleMode === 'function') toggleMode();
            restoredItems.push('入力パラメータ');
        }

        // 5. 条件チェックボックス（conditions）等の復元
        if (payload.params && Array.isArray(payload.params.conditions)) {
            const cbs = document.querySelectorAll('.condition-cb');
            cbs.forEach((cb, i) => {
                if (i < payload.params.conditions.length) {
                    cb.checked = !!payload.params.conditions[i];
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        }

        // 6. グローバル計算関数がある場合再実行（calc, calculate, calculateAll等）
        if (typeof window.onInputChanged === 'function') window.onInputChanged();
        else if (typeof window.calc === 'function') window.calc();
        else if (typeof window.calculate === 'function') window.calculate();
        else if (typeof window.calculateAll === 'function') window.calculateAll();

        if (restoredItems.length > 0) {
            alert(`✓ 保存データを画面に復元し、計算を再実行しました。\n（復元内容: ${restoredItems.join('、')}）`);
        } else {
            alert(`⚠️ 指定されたJSONファイル内に有効な復元データ（開口データ・入力パラメータ・計算履歴等）が見つかりませんでした。\n画面上で数値を入力後に新しく保存したJSONファイルをご指定ください。`);
        }
    },

    print: function() {
        if (typeof window.executeToolPrint === 'function') {
            window.executeToolPrint();
            return;
        }
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
window.checkAuth = checkAuth;

// 認証チェック処理を追加
document.addEventListener('DOMContentLoaded', async () => {
    // ログイン画面自体ではチェックしない
    if (window.location.pathname.includes('login.html')) return;

    // 初回読み込み時のチェック
    await checkAuth();
});