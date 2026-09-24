// ========================================================
// 構造計算コアエンジン (WebAssembly / AssemblyScript)
// ========================================================

/**
 * 1. 柱の面外風圧力と軸力に対する合成座屈検定 (2.5.3.4)
 * @param b 柱幅 (mm)
 * @param h 柱成 (mm)
 * @param lk 座屈長さ (mm)
 * @param N 軸力 (N)
 * @param q 基準風圧力 (N/m2)
 * @param B 受圧幅 (mm)
 * @param Cf 風力係数
 * @param Fc 圧縮基準強度 (N/mm2)
 * @param Fb 曲げ基準強度 (N/mm2)
 * @returns 検定比 (ratio_total)
 */
export function calcColumnCheckRatio(
  b: f64,
  h: f64,
  lk: f64,
  N: f64,
  q: f64,
  B: f64,
  Cf: f64,
  Fc: f64,
  Fb: f64
): f64 {
  const A = b * h;
  const Z = (b * h * h) / 6.0;
  const i = h / Math.sqrt(12.0);

  const w = q * (B / 1000.0) * Cf;
  const w_N_mm = w / 1000.0;
  const M = (w_N_mm * lk * lk) / 8.0;

  const lambda = lk / i;

  let Fk: f64 = 0.0;
  if (lambda <= 30.0) {
    Fk = Fc;
  } else if (lambda <= 100.0) {
    Fk = (1.3 - 0.01 * lambda) * Fc;
  } else {
    Fk = (3000.0 / (lambda * lambda)) * Fc;
  }

  const sfk = (2.0 / 3.0) * Fk;
  const sfb = (2.0 / 3.0) * Fb;

  const ratio_c = N / (A * sfk);
  const ratio_b = M / (Z * sfb);

  return ratio_c + ratio_b;
}

/**
 * 柱の座屈強度 Fk (N/mm2) の計算
 */
export function calcColumnFk(h: f64, lk: f64, Fc: f64): f64 {
  const i = h / Math.sqrt(12.0);
  const lambda = lk / i;
  if (lambda <= 30.0) {
    return Fc;
  } else if (lambda <= 100.0) {
    return (1.3 - 0.01 * lambda) * Fc;
  } else {
    return (3000.0 / (lambda * lambda)) * Fc;
  }
}

/**
 * 2. 木材のめり込み耐力検定
 * @param P 作用荷重 (N)
 * @param b 部材幅 (mm)
 * @param l めり込み長さ (mm)
 * @param Fs めり込み基準強度 (N/mm2)
 * @returns 検定比
 */
export function calcMerikomiRatio(
  P: f64,
  b: f64,
  l: f64,
  Fs: f64
): f64 {
  const A = b * l;
  const sfs = (2.0 / 3.0) * Fs; // 短期
  return P / (A * sfs);
}

/**
 * 3. 基礎スラブ・梁の釣り合い鉄筋比 (pb) の計算
 * @param fc コンクリート設計基準強度 (N/mm2)
 * @param fy 鉄筋降伏点強度 (N/mm2)
 * @returns 釣り合い鉄筋比 (無次元)
 */
export function calcBalancedRebarRatio(fc: f64, fy: f64): f64 {
  const epsilon_cu: f64 = 0.0035; // コンクリート極限ひずみ
  const Es: f64 = 205000.0;       // 鉄筋ヤング係数 (N/mm2)
  const epsilon_y: f64 = fy / Es; // 鉄筋降伏ひずみ
  const beta1: f64 = 0.85;

  const cb_d = epsilon_cu / (epsilon_cu + epsilon_y);
  const pb = (0.85 * beta1 * fc / fy) * cb_d;
  return pb;
}

/**
 * 4. 片持ち基礎梁の曲げモーメント算定 (M = w * L^2 / 2 + P * L)
 * @param w 分布荷重 (N/mm)
 * @param P 先端集中荷重 (N)
 * @param L スパン (mm)
 * @returns モーメント (N*mm)
 */
export function calcCantileverMoment(w: f64, P: f64, L: f64): f64 {
  return (w * L * L) / 2.0 + P * L;
}

/**
 * 5. Wasmエンジンのヘルスチェック・バージョン返却
 */
export function getWasmEngineVersion(): i32 {
  return 100; // 1.0.0
}
