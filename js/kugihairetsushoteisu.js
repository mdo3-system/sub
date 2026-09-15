/**
 * 釘配列諸定数計算ツール ロジック
 */

let global_Ixy = 0, global_Zxy = 0, global_Cxy = 1.0, global_beta = 0;
let calcResults = { Ixy: 0, Zxy: 0, Cxy: 0, beta: 0 };

function round(val, dec = 3) { return Number(Math.round(val + 'e' + dec) + 'e-' + dec); }
function format(val, dec = 3) { return round(val, dec).toFixed(dec).replace(/\.?0+$/, ''); }

function setCheckboxes(t, b, l, r, mv, mh) {
    document.getElementById('chk_top').checked = t;
    document.getElementById('chk_bottom').checked = b;
    document.getElementById('chk_left').checked = l;
    document.getElementById('chk_right').checked = r;
    document.getElementById('chk_mid_v').checked = mv;
    document.getElementById('chk_mid_h').checked = mh;
}

function onPresetChange() {
    const p = document.getElementById('inp_preset').value;
    const w = document.getElementById('inp_w');
    const h = document.getElementById('inp_h');
    const edge = document.getElementById('inp_edge');
    const vp = document.getElementById('inp_v_pitch');
    const hp = document.getElementById('inp_h_pitch');
    
    if (p === 'example') {
        w.value = 61; h.value = 91; edge.value = 1.0;
        document.getElementById('inp_nail_edge').value = "15";
        document.getElementById('inp_nail_inner').value = "15";
        setCheckboxes(true, true, true, true, true, true);
    } else {
        edge.value = 1.5;
        document.getElementById('inp_nail_edge').value = "15";
        document.getElementById('inp_nail_inner').value = "15";
        
        if (p === 'v_kuchi') {
            w.value = 91; h.value = 273; vp.value = 0; hp.value = 0;
            setCheckboxes(true, true, true, true, false, false);
        } else if (p === 'v_hi') {
            w.value = 91; h.value = 273; vp.value = 0; hp.value = 136.5;
            setCheckboxes(true, true, true, true, false, true);
        } else if (p === 'v_kawa' || p === 'v_yama') {
            w.value = 91; h.value = 273; vp.value = 45.5; hp.value = 0;
            setCheckboxes(false, false, true, true, true, false);
        } else if (p === 'h_kuchi') {
            w.value = 182; h.value = 91; vp.value = 0; hp.value = 0;
            setCheckboxes(true, true, true, true, false, false);
        } else if (p === 'h_hi') {
            w.value = 182; h.value = 91; vp.value = 91; hp.value = 0;
            setCheckboxes(true, true, true, true, true, false);
        } else if (p === 'h_kawa' || p === 'h_yama') {
            w.value = 182; h.value = 91; vp.value = 0; hp.value = 45.5;
            setCheckboxes(true, true, false, false, false, true);
        }
    }
    calculateAndRender();
}

function forceCustom() {
    if(document.getElementById('inp_preset').value !== 'custom') {
        document.getElementById('inp_preset').value = 'custom';
    }
    calculateAndRender();
}

function buildSumStr(keys, map, center) {
    if (keys.length === 0) return "0";
    let formatFn = k => format(parseFloat(k));
    if (keys.length <= 3) {
        return keys.map(k => `(${formatFn(k)} - ${format(center)})^2 \\times ${map[k]}`).join(' + ');
    }
    let first = `(${formatFn(keys[0])} - ${format(center)})^2 \\times ${map[keys[0]]}`;
    let last = `(${formatFn(keys[keys.length-1])} - ${format(center)})^2 \\times ${map[keys[keys.length-1]]}`;
    return `${first} + \\dots + ${last}`;
}

function calculateAndRender() {
    const W = parseFloat(document.getElementById('inp_w').value) || 0; 
    const H = parseFloat(document.getElementById('inp_h').value) || 0; 
    const edge = parseFloat(document.getElementById('inp_edge').value) || 0;
    
    const nail_edge = parseFloat(document.getElementById('inp_nail_edge').value) || 15;
    const nail_inner = parseFloat(document.getElementById('inp_nail_inner').value) || 15;
    const preset = document.getElementById('inp_preset').value;

    const W_net = W - 2 * edge;
    const H_net = H - 2 * edge;

    const vp_input = document.getElementById('inp_v_pitch');
    const hp_input = document.getElementById('inp_h_pitch');

    let v_studs = []; // 物理的なタテ桟
    let h_studs = []; // 物理的なヨコ桟

    if (preset === 'example') {
        vp_input.readOnly = true; hp_input.readOnly = true;
        document.getElementById('inp_nail_edge').disabled = true;
        document.getElementById('inp_nail_inner').disabled = true;
        ['chk_top', 'chk_bottom', 'chk_left', 'chk_right', 'chk_mid_v', 'chk_mid_h'].forEach(id => {
            document.getElementById(id).disabled = true;
            document.getElementById(id).checked = true;
        });
        v_studs = [0, 14.5, 29.5, 44.5, 59];
        h_studs = [0, 44.5, 89];
    } else {
        vp_input.readOnly = false; hp_input.readOnly = false;
        document.getElementById('inp_nail_edge').disabled = false;
        document.getElementById('inp_nail_inner').disabled = false;
        ['chk_top', 'chk_bottom', 'chk_left', 'chk_right', 'chk_mid_v', 'chk_mid_h'].forEach(id => {
            document.getElementById(id).disabled = false;
        });

        let vp = parseFloat(vp_input.value) || 0;
        let hp = parseFloat(hp_input.value) || 0;
        v_studs = [0, W_net];
        if (vp > 0) { let cur = vp; while (cur <= W_net - 0.5) { v_studs.push(cur); cur += vp; } }
        h_studs = [0, H_net];
        if (hp > 0) { let cur = hp; while (cur <= H_net - 0.5) { h_studs.push(cur); cur += hp; } }
        v_studs.sort((a,b)=>a-b);
        h_studs.sort((a,b)=>a-b);
    }

    let visual_nails = [];
    let add_v_line = (x) => {
        let p = (x === 0 || Math.abs(x - W_net) < 0.1) ? nail_edge : nail_inner;
        let cur_y = 0;
        while (cur_y <= H_net - 0.1) { visual_nails.push({x: round(x, 3), y: round(cur_y, 3)}); cur_y += p; }
        visual_nails.push({x: round(x, 3), y: round(H_net, 3)});
    };
    
    let add_h_line = (y) => {
        let p = (y === 0 || Math.abs(y - H_net) < 0.1) ? nail_edge : nail_inner;
        let cur_x = 0;
        while (cur_x <= W_net - 0.1) { visual_nails.push({x: round(cur_x, 3), y: round(y, 3)}); cur_x += p; }
        visual_nails.push({x: round(W_net, 3), y: round(y, 3)});
    };

    if (preset === 'example') {
        v_studs.forEach(x => h_studs.forEach(y => visual_nails.push({x: round(x, 3), y: round(y, 3)})));
    } else {
        if (document.getElementById('chk_left').checked) add_v_line(0);
        if (document.getElementById('chk_right').checked) add_v_line(W_net);
        if (document.getElementById('chk_top').checked) add_h_line(0);
        if (document.getElementById('chk_bottom').checked) add_h_line(H_net);
        
        if (document.getElementById('chk_mid_v').checked) {
            v_studs.forEach(x => { if (x > 0.1 && Math.abs(x - W_net) > 0.1) add_v_line(x); });
        }
        if (document.getElementById('chk_mid_h').checked) {
            h_studs.forEach(y => { if (y > 0.1 && Math.abs(y - H_net) > 0.1) add_h_line(y); });
        }
    }

    let unique_nails = [];
    let seen = new Set();
    visual_nails.forEach(n => {
        let key = `${n.x.toFixed(3)}_${n.y.toFixed(3)}`;
        if (!seen.has(key)) { seen.add(key); unique_nails.push(n); }
    });
    visual_nails = unique_nails;

    let is_square = Math.abs(W - H) < 0.001;
    let swap_axes = false;
    let axis_message = `入力サイズ W=${W} × H=${H}：<b>幅(W)が短辺</b>のため、幅方向を構造上の「X方向」として計算します。`;

    if (is_square) {
        let nails_x = visual_nails.filter(n => Math.abs(n.y) < 0.001 || Math.abs(n.y - H_net) < 0.001).length; 
        let nails_y = visual_nails.filter(n => Math.abs(n.x) < 0.001 || Math.abs(n.x - W_net) < 0.001).length;
        if (nails_y > nails_x) {
            swap_axes = true;
            axis_message = `正方形配置：縦方向の外周釘本数が多いため、<b>高さ(H)方向</b>を構造上の「X方向」として計算します。`;
        } else {
            axis_message = `正方形配置：横方向の外周釘本数が多いため（または同数）、<b>幅(W)方向</b>を構造上の「X方向」として計算します。`;
        }
    } else if (W > H) {
        swap_axes = true;
        axis_message = `横置き配置(W=${W} × H=${H})：<b>高さ(H)が短辺</b>となるため、内部で軸を90度回転し、高さ方向を構造上の「X方向」として計算します。`;
    }

    let struct_nails = visual_nails.map(n => swap_axes ? { x: n.y, y: n.x } : { x: n.x, y: n.y });
    let struct_W = swap_axes ? H : W;
    let struct_H = swap_axes ? W : H;
    let struct_Aw = struct_W * struct_H;
    const numNails = struct_nails.length;

    let sum_x = 0, sum_y = 0;
    let nx_map = {}, ny_map = {};
    struct_nails.forEach(n => {
        sum_x += n.x; sum_y += n.y;
        nx_map[n.x] = (nx_map[n.x] || 0) + 1;
        ny_map[n.y] = (ny_map[n.y] || 0) + 1;
    });

    const x0 = numNails > 0 ? sum_x / numNails : 0;
    const y0 = numNails > 0 ? sum_y / numNails : 0;

    let Ix = 0, Iy = 0;
    Object.keys(ny_map).forEach(yStr => Ix += Math.pow(parseFloat(yStr) - y0, 2) * ny_map[yStr]);
    Object.keys(nx_map).forEach(xStr => Iy += Math.pow(parseFloat(xStr) - x0, 2) * nx_map[xStr]);

    const Ixy = struct_Aw > 0 && (Ix+Iy)>0 ? (Ix * Iy / (Ix + Iy)) / struct_Aw : 0;

    let y_max_dist = 0, x_max_dist = 0;
    struct_nails.forEach(n => {
        if(Math.abs(n.y - y0) > y_max_dist) y_max_dist = Math.abs(n.y - y0);
        if(Math.abs(n.x - x0) > x_max_dist) x_max_dist = Math.abs(n.x - x0);
    });
    const Zx = y_max_dist > 0 ? Ix / y_max_dist : 0;
    const Zy = x_max_dist > 0 ? Iy / x_max_dist : 0;
    const Zxy = (struct_Aw > 0 && Zx > 0 && Zy > 0) ? 1 / (struct_Aw * Math.sqrt(1/Math.pow(Zx, 2) + 1/Math.pow(Zy, 2))) : 0;

    let symX = Math.abs(struct_nails.reduce((acc, n) => acc + Math.pow(n.x - x0, 3), 0)) < struct_W;
    let symY = Math.abs(struct_nails.reduce((acc, n) => acc + Math.pow(n.y - y0, 3), 0)) < struct_H;
    let L_dist = struct_nails.length > 0 ? Math.max(...struct_nails.map(n=>n.x)) - Math.min(...struct_nails.map(n=>n.x)) : 0;
    let H_dist = struct_nails.length > 0 ? Math.max(...struct_nails.map(n=>n.y)) - Math.min(...struct_nails.map(n=>n.y)) : 0;

    const xP0 = symX ? x0 : (-0.106 * L_dist + 1.212 * x0);
    const yP0 = symY ? y0 : (-0.106 * H_dist + 1.212 * y0);

    let theta_ratio = (Iy >= Ix && Ix > 0) ? (1.285 * Iy / Ix) : (Ix > 0 ? Iy / (1.285 * Ix) : 1);
    let theta_ratio_inv = theta_ratio > 0 ? 1 / theta_ratio : 1;

    let ZPx = 0, ZPy = 0;
    struct_nails.forEach(n => {
        let dx = Math.abs(n.x - xP0);
        let dy = Math.abs(n.y - yP0);
        let denom_x = Math.sqrt(Math.pow(dx * theta_ratio_inv, 2) + Math.pow(dy, 2));
        if(denom_x !== 0) ZPx += (Math.pow(dy, 2) / denom_x);
        let denom_y = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy * theta_ratio, 2));
        if(denom_y !== 0) ZPy += (Math.pow(dx, 2) / denom_y);
    });

    const Xerr = (ZPx + ZPy) > 0 ? 2 * Math.abs(ZPx - ZPy) / (ZPx + ZPy) : 0;
    const Yerr = 0.998 + 0.068 * Xerr + 0.906 * Math.pow(Xerr, 2);
    const ZPxy = (Yerr > 0 && struct_Aw > 0) ? (0.941 * (ZPx + ZPy)) / (2 * Yerr * struct_Aw) : 0;
    let Cxy = Zxy > 0 ? Math.max(1.0, ZPxy / Zxy) : 1.0;
    const beta = Ix > 0 ? Iy / Ix : 0;

    global_Ixy = Ixy;
    global_Zxy = Zxy;
    global_Cxy = Cxy;
    global_beta = beta;
    calcResults = { Ixy, Zxy, Cxy, beta };

    let svgLines = '';
    let svgNails = '';
    v_studs.forEach(x => {
        if (preset === 'example' || (x > 0.1 && Math.abs(x - W_net) > 0.1)) {
            svgLines += `<line x1="${x+edge}" y1="${edge}" x2="${x+edge}" y2="${H-edge}" stroke="#3498db" stroke-width="2" stroke-dasharray="6,4"/>`;
        }
    });
    h_studs.forEach(y => {
        if (preset === 'example' || (y > 0.1 && Math.abs(y - H_net) > 0.1)) {
            svgLines += `<line x1="${edge}" y1="${y+edge}" x2="${W-edge}" y2="${y+edge}" stroke="#2ecc71" stroke-width="2" stroke-dasharray="6,4"/>`;
        }
    });
    visual_nails.forEach(n => {
        svgNails += `<circle cx="${n.x+edge}" cy="${n.y+edge}" r="2.5" fill="#e74c3c"/>`;
    });

    let axisLabelX = swap_axes ? "Y軸 (長辺)" : "X軸 (短辺)";
    let axisLabelY = swap_axes ? "X軸 (短辺)" : "Y軸 (長辺)";
    let viewBoxW = Math.max(W + 30, 100);
    let viewBoxH = Math.max(H + 30, 100);
    let displayMode = document.getElementById('inp_preset').options[document.getElementById('inp_preset').selectedIndex].text;

    const svgHtml = `
        <svg id="svg_preview" viewBox="-20 -20 ${viewBoxW} ${viewBoxH}" preserveAspectRatio="xMidYMid meet">
            <rect x="0" y="0" width="${W}" height="${H}" fill="#fdfdfd" stroke="#2c3e50" stroke-width="1.5"/>
            ${svgLines}
            ${svgNails}
            <g stroke="#e67e22" stroke-width="1.5" fill="none">
                <line x1="0" y1="-10" x2="${Math.min(W, 30)}" y2="-10" marker-end="url(#arrow)"/>
                <line x1="-10" y1="0" x2="-10" y2="${Math.min(H, 30)}" marker-end="url(#arrow)"/>
            </g>
            <text x="${Math.min(W, 30) + 5}" y="-7" font-size="6" fill="#e67e22" font-weight="bold">${axisLabelX}</text>
            <text x="-12" y="${Math.min(H, 30) + 15}" font-size="6" fill="#e67e22" font-weight="bold" writing-mode="vertical-rl">${axisLabelY}</text>
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#e67e22" />
                </marker>
            </defs>
        </svg>
    `;

    const projectName = document.getElementById('inp_project').value || "未設定";
    const report = document.getElementById('report');
    report.innerHTML = `
        <div class="report-header">
            <h1>釘配列諸定数 計算書</h1>
            <div style="font-size: 0.9em; font-weight: bold; color: #555;">物件名：${projectName}</div>
        </div>
        
        <div class="alert-note">${axis_message}</div>

        <div class="diagram-container">
            <h3>0) 面材 凡例図【現在選択中：${displayMode}】</h3>
            ${svgHtml}
            <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
                入力サイズ: W=${W} × H=${H} / ヘリアキ: ${edge} / 総釘本数 $N = ${numNails}$ 本
            </div>
        </div>

        <table class="summary-table">
            <tr>
                <th>$I_{xy}$ [cm²/cm²]</th>
                <th>$Z_{xy}$ [cm/cm²]</th>
                <th>$C_{xy}$</th>
                <th>$\\beta$</th>
            </tr>
            <tr>
                <td><b>${format(Ixy)}</b></td>
                <td><b>${format(Zxy)}</b></td>
                <td><b>${format(Cxy)}</b></td>
                <td><b>${format(beta)}</b></td>
            </tr>
        </table>

        <div class="step">
            <div class="step-title">1) 釘座標を記し、面材の面積 $A_w$ を用意する</div>
            <div class="math-block">$A_w = \\text{X方向(短辺: } ${struct_W} \\text{)} \\times \\text{Y方向(長辺: } ${struct_H} \\text{)} = ${format(struct_Aw)} \\text{ [cm}^2]$</div>
        </div>

        <div class="step">
            <div class="step-title">2) 各方向の弾性中立軸位置 $x_0, y_0$ を求める</div>
            <div class="math-block" id="math_step2_y"></div>
            <div class="math-block" id="math_step2_x"></div>
        </div>

        <div class="step">
            <div class="step-title">3) 各方向の弾性中立軸に対する釘配列二次モーメント $I_x, I_y$ を求める</div>
            <div class="math-block" id="math_step3_x"></div>
            <div class="math-block" id="math_step3_y"></div>
        </div>

        <div class="step">
            <div class="step-title">4) 単位面積あたりの釘配列二次モーメント $I_{xy}$ を求める</div>
            <div class="note">(3.2.1)式より、</div>
            <div class="math-block" id="math_step4"></div>
        </div>

        <div class="step">
            <div class="step-title">5) 各方向の弾性中立軸に対する釘配列係数 $Z_x, Z_y$ を求める</div>
            <div class="math-block" id="math_step5_x"></div>
            <div class="math-block" id="math_step5_y"></div>
        </div>

        <div class="step">
            <div class="step-title">6) 単位面積あたりの釘配列係数 $Z_{xy}$ を求める</div>
            <div class="note">(3.2.3)式より、</div>
            <div class="math-block" id="math_step6"></div>
        </div>

        <div class="step">
            <div class="step-title">7) 塑性中立軸 $x_{P0}, y_{P0}$ を求める</div>
            <div class="math-block">
                $y_{P0} = ${format(yP0)} \\text{ [cm]}$<br>
                $x_{P0} = ${format(xP0)} \\text{ [cm]}$
            </div>
        </div>

        <div class="step">
            <div class="step-title">8) $\\theta_{Px} / \\theta_{Py}$ を求める</div>
            <div class="note">ここでは、$I_y ${Iy >= Ix ? '\\ge' : '<'} I_x$ であるため、</div>
            <div class="math-block">
                $\\theta_{Px}/\\theta_{Py} = ${Iy >= Ix ? `1.285 I_y / I_x` : `I_y / 1.285 I_x`} = ${format(theta_ratio)}$
            </div>
        </div>

        <div class="step">
            <div class="step-title">9) $Z_{Px}, Z_{Py}$ を求める</div>
            <div class="math-block">
                $Z_{Px} = \\sum \\frac{(y_j - y_{P0})^2}{\\sqrt{(x_i - x_{P0})^2 (\\theta_{Py}/\\theta_{Px})^2 + (y_j - y_{P0})^2}} = ${format(ZPx)}$
            </div>
            <div class="math-block">
                $Z_{Py} = \\sum \\frac{(x_i - x_{P0})^2}{\\sqrt{(x_i - x_{P0})^2 + (y_j - y_{P0})^2 (\\theta_{Px}/\\theta_{Py})^2}} = ${format(ZPy)}$
            </div>
        </div>

        <div class="step">
            <div class="step-title">10) $X_{err}$ を求める</div>
            <div class="math-block" id="math_step10"></div>
        </div>

        <div class="step">
            <div class="step-title">11) $Y_{err}$ を求める</div>
            <div class="math-block" id="math_step11"></div>
        </div>

        <div class="step">
            <div class="step-title">12) 単位面積あたりの塑性釘配列係数 $Z_{Pxy}$ を求める</div>
            <div class="note">(3.2.7)式より、</div>
            <div class="math-block" id="math_step12"></div>
        </div>

        <div class="step">
            <div class="step-title">13) $C_{xy}$ を求める</div>
            <div class="note">(3.2.6)式より、</div>
            <div class="math-block" id="math_step13"></div>
        </div>

        <div class="step">
            <div class="step-title">14) 面材の縦横比による剛性調整係数 $\\beta$ を求める</div>
            <div class="note">(3.2.14)式より、</div>
            <div class="math-block" id="math_step14"></div>
        </div>
    `;

    let keys_y = Object.keys(ny_map).sort((a,b)=>parseFloat(a)-parseFloat(b));
    let keys_x = Object.keys(nx_map).sort((a,b)=>parseFloat(a)-parseFloat(b));

    let tex_y0 = `\\begin{aligned} y_0 &= \\frac{\\Sigma y_j \\cdot n_j}{\\Sigma n_j} = \\frac{${format(sum_y)}}{${numNails}} = ${format(y0)} \\text{ [cm]} \\end{aligned}`;
    let tex_x0 = `\\begin{aligned} x_0 &= \\frac{\\Sigma x_i \\cdot n_i}{\\Sigma n_i} = \\frac{${format(sum_x)}}{${numNails}} = ${format(x0)} \\text{ [cm]} \\end{aligned}`;
    let tex_Ix = `\\begin{aligned} I_x &= \\Sigma (y_j - y_0)^2 \\cdot n_j \\\\ &= ${buildSumStr(keys_y, ny_map, y0)} \\\\ &= ${format(Ix)} \\text{ [cm}^2\\text{]} \\end{aligned}`;
    let tex_Iy = `\\begin{aligned} I_y &= \\Sigma (x_i - x_0)^2 \\cdot n_i \\\\ &= ${buildSumStr(keys_x, nx_map, x0)} \\\\ &= ${format(Iy)} \\text{ [cm}^2\\text{]} \\end{aligned}`;
    let tex_Ixy = `I_{xy} = \\frac{1}{A_w} \\left( \\frac{I_x \\cdot I_y}{I_x + I_y} \\right) = \\frac{1}{${format(struct_Aw)}} \\left( \\frac{${format(Ix)} \\times ${format(Iy)}}{${format(Ix)} + ${format(Iy)}} \\right) = ${format(Ixy)} \\text{ [cm}^2\\text{/cm}^2\\text{]}`;
    let tex_Zx = `Z_x = \\frac{I_x}{(y_j - y_0)_{max}} = \\frac{${format(Ix)}}{${format(y_max_dist)}} = ${format(Zx)} \\text{ [cm]}`;
    let tex_Zy = `Z_y = \\frac{I_y}{(x_i - x_0)_{max}} = \\frac{${format(Iy)}}{${format(x_max_dist)}} = ${format(Zy)} \\text{ [cm]}`;
    let tex_Zxy = `Z_{xy} = \\frac{1}{A_w \\sqrt{\\frac{1}{Z_x^2} + \\frac{1}{Z_y^2}}} = \\frac{1}{${format(struct_Aw)} \\sqrt{\\frac{1}{${format(Zx)}^2} + \\frac{1}{${format(Zy)}^2}}} = ${format(Zxy)} \\text{ [cm/cm}^2\\text{]}`;
    let tex_Xerr = `X_{err} = \\frac{2|Z_{Px} - Z_{Py}|}{Z_{Px} + Z_{Py}} = \\frac{2|${format(ZPx)} - ${format(ZPy)}|}{${format(ZPx)} + ${format(ZPy)}} = ${format(Xerr)}`;
    let tex_Yerr = `Y_{err} = 0.998 + 0.068X_{err} + 0.906X_{err}^2 = 0.998 + 0.068 \\times ${format(Xerr)} + 0.906 \\times ${format(Xerr)}^2 = ${format(Yerr)}`;
    let tex_ZPxy = `Z_{Pxy} = \\frac{0.941(Z_{Px} + Z_{Py})}{2 \\cdot Y_{err} \\cdot A_w} = \\frac{0.941 \\times (${format(ZPx)} + ${format(ZPy)})}{2 \\times ${format(Yerr)} \\times ${format(struct_Aw)}} = ${format(ZPxy)}`;
    let tex_Cxy = `C_{xy} = \\frac{Z_{Pxy}}{Z_{xy}} = \\frac{${format(ZPxy)}}{${format(Zxy)}} = ${format(Cxy)}`;
    let tex_beta = `\\beta = \\frac{I_y}{I_x} = \\frac{${format(Iy)}}{${format(Ix)}} = ${format(beta)}`;

    katex.render(tex_y0, document.getElementById('math_step2_y'), {displayMode: true});
    katex.render(tex_x0, document.getElementById('math_step2_x'), {displayMode: true});
    katex.render(tex_Ix, document.getElementById('math_step3_x'), {displayMode: true});
    katex.render(tex_Iy, document.getElementById('math_step3_y'), {displayMode: true});
    katex.render(tex_Ixy, document.getElementById('math_step4'), {displayMode: true});
    katex.render(tex_Zx, document.getElementById('math_step5_x'), {displayMode: true});
    katex.render(tex_Zy, document.getElementById('math_step5_y'), {displayMode: true});
    katex.render(tex_Zxy, document.getElementById('math_step6'), {displayMode: true});
    katex.render(tex_Xerr, document.getElementById('math_step10'), {displayMode: true});
    katex.render(tex_Yerr, document.getElementById('math_step11'), {displayMode: true});
    katex.render(tex_ZPxy, document.getElementById('math_step12'), {displayMode: true});
    katex.render(tex_Cxy, document.getElementById('math_step13'), {displayMode: true});
    katex.render(tex_beta, document.getElementById('math_step14'), {displayMode: true});
    
    renderMathInElement(document.getElementById('report'), { delimiters: [{left: "$", right: "$", display: false}] });
}

function saveJSON() {
    const data = {
        preset: document.getElementById('inp_preset').value,
        project: document.getElementById('inp_project').value,
        w: document.getElementById('inp_w').value, h: document.getElementById('inp_h').value,
        edge: document.getElementById('inp_edge').value,
        v_pitch: document.getElementById('inp_v_pitch').value, h_pitch: document.getElementById('inp_h_pitch').value,
        n_edge: document.getElementById('inp_nail_edge').value, n_inner: document.getElementById('inp_nail_inner').value,
        chk_top: document.getElementById('chk_top').checked, chk_bottom: document.getElementById('chk_bottom').checked,
        chk_left: document.getElementById('chk_left').checked, chk_right: document.getElementById('chk_right').checked,
        chk_mid_v: document.getElementById('chk_mid_v').checked, chk_mid_h: document.getElementById('chk_mid_h').checked,
        Ixy: global_Ixy, Zxy: global_Zxy, Cxy: global_Cxy, beta: global_beta
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nail_calc.json';
    a.click(); URL.revokeObjectURL(url);
}

async function loadJSON(e) {
    if (!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        const d = JSON.parse(evt.target.result);
        if(d.preset) document.getElementById('inp_preset').value = d.preset;
        if(d.w) document.getElementById('inp_w').value = d.w;
        if(d.h) document.getElementById('inp_h').value = d.h;
        if(d.edge) document.getElementById('inp_edge').value = d.edge;
        if(d.v_pitch !== undefined) document.getElementById('inp_v_pitch').value = d.v_pitch;
        if(d.h_pitch !== undefined) document.getElementById('inp_h_pitch').value = d.h_pitch;
        if(d.n_edge) document.getElementById('inp_nail_edge').value = d.n_edge;
        if(d.n_inner) document.getElementById('inp_nail_inner').value = d.n_inner;
        if(d.chk_top !== undefined) document.getElementById('chk_top').checked = d.chk_top;
        if(d.chk_bottom !== undefined) document.getElementById('chk_bottom').checked = d.chk_bottom;
        if(d.chk_left !== undefined) document.getElementById('chk_left').checked = d.chk_left;
        if(d.chk_right !== undefined) document.getElementById('chk_right').checked = d.chk_right;
        if(d.chk_mid_v !== undefined) document.getElementById('chk_mid_v').checked = d.chk_mid_v;
        if(d.chk_mid_h !== undefined) document.getElementById('chk_mid_h').checked = d.chk_mid_h;
        calculateAndRender();
    };
    reader.readAsText(e.target.files[0]);
}

function initApp() { calculateAndRender(); }
