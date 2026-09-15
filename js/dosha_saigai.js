function rad(deg) { return deg * Math.PI / 180; }

const barNames = { "71.3": "D10", "126.7": "D13", "198.6": "D16", "286.5": "D19", "162.6": "D13D16" };

function calc() {
    const rho_m = parseFloat(document.getElementById('inp_rho_m').value);
    const g = parseFloat(document.getElementById('inp_g').value);
    const h_sm = parseFloat(document.getElementById('inp_h_sm').value);
    const H = parseFloat(document.getElementById('inp_H').value);
    const X = parseFloat(document.getElementById('inp_X').value);
    const theta_u = parseFloat(document.getElementById('inp_theta_u').value);
    const theta_d = parseFloat(document.getElementById('inp_theta_d').value);
    const sigma = parseFloat(document.getElementById('inp_sigma').value);
    const c = parseFloat(document.getElementById('inp_c').value);
    const fb = parseFloat(document.getElementById('inp_fb').value);
    const phi = parseFloat(document.getElementById('inp_phi').value);
    const gamma = parseFloat(document.getElementById('inp_gamma').value);
    const delta = parseFloat(document.getElementById('inp_delta').value);
    const d_butt = parseFloat(document.getElementById('inp_d_buttress').value);

    const V = parseFloat(document.getElementById('inp_V').value);
    const W = parseFloat(document.getElementById('inp_W').value);
    const X1 = parseFloat(document.getElementById('inp_X1').value);
    const S = V / W;
    const tan_term = Math.tan(rad(90 - theta_u));
    let h_calc = 0;
    if (tan_term !== 0) {
        h_calc = (-X1 + Math.sqrt(Math.pow(X1, 2) + 2 * S * tan_term)) / tan_term;
    }
    const h = h_calc;

    document.getElementById('c_rho').innerText = rho_m;
    document.getElementById('c_g').innerText = g;
    document.getElementById('c_hsm').innerText = h_sm.toFixed(2);
    document.getElementById('c_H').innerText = H.toFixed(1);
    document.getElementById('c_X').innerText = X.toFixed(1);
    document.getElementById('c_thetau').innerText = theta_u;
    document.getElementById('c_thetad').innerText = theta_d;
    document.getElementById('c_sigma').innerText = sigma.toFixed(1);
    document.getElementById('c_c').innerText = c.toFixed(2);
    document.getElementById('c_fb').innerText = fb.toFixed(3);
    document.getElementById('c_phi').innerText = phi;
    document.getElementById('c_gamma').innerText = gamma.toFixed(2);
    document.getElementById('c_h').innerText = h.toFixed(3) + " (算出値)";
    document.getElementById('c_delta').innerText = delta.toFixed(2);
    document.getElementById('c_d').innerText = d_butt.toFixed(2);

    document.getElementById('out_V').innerText = V.toFixed(2);
    document.getElementById('out_W').innerText = W.toFixed(2);
    document.getElementById('out_X1').innerText = X1.toFixed(2);
    document.getElementById('out_S').innerText = S.toFixed(3);
    document.getElementById('out_h_calc').innerText = h.toFixed(3);
    document.getElementById('out_thetau_calc').innerText = theta_u;

    const tan_phi = Math.tan(rad(phi));
    const factor = ((sigma - 1) * c) / ((sigma - 1) * c + 1);
    
    const a = (2 / ((sigma - 1) * c + 1)) * fb;
    const b_u = Math.cos(rad(theta_u)) * (Math.tan(rad(theta_u)) - factor * tan_phi);
    const b_d = Math.cos(rad(theta_d)) * (Math.tan(rad(theta_d)) - factor * tan_phi); 

    document.getElementById('out_a').innerText = a.toFixed(4);
    document.getElementById('out_bu').innerText = b_u.toFixed(4);
    document.getElementById('out_bd').innerText = b_d.toFixed(4);

    const exp_H = Math.exp(-2 * a * H / (h_sm * Math.sin(rad(theta_u))));
    const exp_X = Math.exp(-2 * a * X / h_sm);
    
    const term1 = (b_u / a) * (1 - exp_H) * Math.pow(Math.cos(rad(theta_u - theta_d)), 2) * exp_X;
    const term2 = (b_d / a) * (1 - exp_X);
    const Fsm = rho_m * g * h_sm * (term1 + term2);

    const num_Fsa = gamma * h * Math.pow(Math.cos(rad(phi)), 2);
    const sqrt_term = Math.sqrt( (Math.sin(rad(phi + delta)) * Math.sin(rad(phi))) / Math.cos(rad(delta)) );
    const den_Fsa = Math.cos(rad(delta)) * Math.pow(1 + sqrt_term, 2);
    const Fsa = num_Fsa / den_Fsa;

    const Fsm_clamped = Math.max(0, Fsm);
    
    document.getElementById('out_Fsm_raw').innerText = Fsm.toFixed(2);
    if (Fsm < 0) {
        document.getElementById('out_Fsm_note').innerText = " (※建築物到達前に土石流が停止するため、設計用力は 0.00 kN/m² とします)";
    } else {
        document.getElementById('out_Fsm_note').innerText = "";
    }
    
    document.getElementById('out_Fsa').innerText = Fsa.toFixed(2);
    document.getElementById('out_p').innerText = Fsm_clamped.toFixed(2);
    document.getElementById('out_w').innerText = Fsa.toFixed(2);

    const p_val = Fsm_clamped;
    const w_val = Fsa;
    
    const isRoute2 = (p_val > 100) || (p_val > 50 && h_sm > 1.0) || (h_sm > 2.0) || (h > 5.0);
    const route2Warning = document.getElementById('route2_warning');
    const specTable = document.getElementById('spec_table');
    
    if (isRoute2) {
        route2Warning.style.display = "block";
        specTable.style.opacity = "0.4";
    } else {
        route2Warning.style.display = "none";
        specTable.style.opacity = "1";
    }

    function getCoeffs(isMovementGreater1, depHeight) {
        if (!isMovementGreater1) {
            if (depHeight <= 1.0) return { W: [18.3, 7.9], B: [3.4, 1.0], F: [5.2, 1.3] };
            if (depHeight <= 2.0) return { W: [11.2, 11.9], B: [3.4, 7.1], F: [5.2, 8.4] };
            if (depHeight <= 3.0) return { W: [8.3, 15.1], B: [3.4, 18.9], F: [5.2, 22.6] };
            if (depHeight <= 4.0) return { W: [7.1, 17.1], B: [3.4, 36.0], F: [5.2, 43.5] };
            return { W: [6.0, 18.5], B: [3.4, 60.1], F: [5.2, 70.1] };
        } else {
            if (depHeight <= 1.0) return { W: [26.8, 11.9], B: [25.2, 7.1], F: [31.5, 8.4] };
            if (depHeight <= 2.0) return { W: [20.4, 15.1], B: [25.2, 18.9], F: [31.5, 22.6] };
            if (depHeight <= 3.0) return { W: [16.3, 17.1], B: [25.2, 36.0], F: [31.5, 43.5] };
            if (depHeight <= 4.0) return { W: [13.7, 18.5], B: [25.2, 60.1], F: [31.5, 70.1] };
            return { W: [0, 0], B: [0, 0], F: [0, 0] }; 
        }
    }

    const isMovGt1 = h_sm > 1.0;
    const coeffs = getCoeffs(isMovGt1, h);
    
    const movStr = isMovGt1 ? "1.0m超" : "1.0m以下";
    let depStr = "";
    if(h <= 1.0) depStr = "1.0m以下";
    else if(h <= 2.0) depStr = "1.0m超2.0m以下";
    else if(h <= 3.0) depStr = "2.0m超3.0m以下";
    else if(h <= 4.0) depStr = "3.0m超4.0m以下";
    else depStr = "4.0m超5.0m以下";
    
    const kubun = `移動: ${movStr}<br>堆積: ${depStr}`;

    const req_W_p = coeffs.W[0] * p_val;
    const req_W_w = coeffs.W[1] * w_val;
    const req_W = Math.max(req_W_p, req_W_w);
    const exp_W = `Max( ${coeffs.W[0]}p, ${coeffs.W[1]}w )<br>= Max(${req_W_p.toFixed(2)}, ${req_W_w.toFixed(2)})`;
    
    const req_B_p = (coeffs.B[0] * p_val) / d_butt;
    const req_B_w = (coeffs.B[1] * w_val) / d_butt;
    const req_B = Math.max(req_B_p, req_B_w);
    const coeffB1_str = coeffs.B[1] === 1.0 ? "" : coeffs.B[1];
    const exp_B = `Max( ${coeffs.B[0]}p/d, ${coeffB1_str}w/d )<br>= Max(${req_B_p.toFixed(2)}, ${req_B_w.toFixed(2)})`;

    const req_F_p = coeffs.F[0] * p_val;
    const req_F_w = coeffs.F[1] * w_val;
    const req_F = Math.max(req_F_p, req_F_w);
    const exp_F = `Max( ${coeffs.F[0]}p, ${coeffs.F[1]}w )<br>= Max(${req_F_p.toFixed(2)}, ${req_F_w.toFixed(2)})`;

    function getDesignAreaAndJudge(barVal, pitchVal, reqVal) {
        const area = parseFloat(barVal) * (1000 / parseFloat(pitchVal));
        const isOk = area >= reqVal;
        const barName = barNames[barVal];
        return { area, isOk, name: `${barName} @${pitchVal}` };
    }

    const bar_w = document.getElementById('sel_bar_w').value;
    const pitch_w = document.getElementById('sel_pitch_w').value;
    const res_w = getDesignAreaAndJudge(bar_w, pitch_w, req_W);

    const bar_b = document.getElementById('sel_bar_b').value;
    const pitch_b = document.getElementById('sel_pitch_b').value;
    const res_b = getDesignAreaAndJudge(bar_b, pitch_b, req_B);

    const bar_f = document.getElementById('sel_bar_f').value;
    const pitch_f = document.getElementById('sel_pitch_f').value;
    const res_f = getDesignAreaAndJudge(bar_f, pitch_f, req_F);

    function renderRow(partName, kubunText, expText, req, res) {
        const judgeStr = res.isOk ? '<span class="ok-text">OK</span>' : '<span class="ng-text">NG</span>';
        return `<tr>
            <td style="font-weight:bold;">${partName}</td>
            <td>${kubunText}</td>
            <td class="text-left">${expText}</td>
            <td style="font-weight:bold; background:#fffbe6;">${req.toFixed(2)}</td>
            <td>${res.name}</td>
            <td>${res.area.toFixed(2)}</td>
            <td>${isRoute2 ? '<span style="color:#777;">適用外</span>' : judgeStr}</td>
        </tr>`;
    }

    const tbody = document.getElementById('result_tbody');
    tbody.innerHTML = renderRow("外壁 (表一)", kubun, exp_W, req_W, res_w)
                    + renderRow("控壁 (表二)", kubun, exp_B, req_B, res_b)
                    + renderRow("基礎 (表三)", kubun, exp_F, req_F, res_f);
}

// JSON保存機能
function saveJSON() {
    const inputIds = [
        'inp_rho_m', 'inp_g', 'inp_h_sm', 'inp_H', 'inp_X', 'inp_theta_u', 'inp_theta_d',
        'inp_sigma', 'inp_c', 'inp_fb', 'inp_phi', 'inp_gamma', 'inp_delta', 'inp_d_buttress',
        'inp_V', 'inp_W', 'inp_X1',
        'sel_bar_w', 'sel_pitch_w', 'sel_bar_b', 'sel_pitch_b', 'sel_bar_f', 'sel_pitch_f'
    ];
    
    const data = { conditions: {}, results: {} };
    
    // 入力値の取得
    inputIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) data.conditions[id] = el.value;
    });

    // 結果の取得（参考用）
    data.results.Fsm = document.getElementById('out_Fsm_raw').innerText;
    data.results.Fsa = document.getElementById('out_Fsa').innerText;
    data.results.h = document.getElementById('out_h_calc').innerText;

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "structural_calc_conditions.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// JSON復元機能
function loadJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.conditions) {
                for (const key in data.conditions) {
                    const el = document.getElementById(key);
                    if (el) {
                        el.value = data.conditions[key];
                    }
                }
                calc(); // 読み込み後、自動で再計算
                alert("条件データを復元しました。");
            } else {
                alert("有効な形式のJSONファイルではありません。");
            }
        } catch (err) {
            alert("ファイルの読み込みに失敗しました。");
        }
        event.target.value = ""; // 次回も同じファイルを選べるようにリセット
    };
    reader.readAsText(file);
}

window.addEventListener('DOMContentLoaded', () => {
    calc();
});
