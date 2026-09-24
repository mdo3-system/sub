/** Exported memory */
export declare const memory: WebAssembly.Memory;
/**
 * assembly/index/calcColumnCheckRatio
 * @param b `f64`
 * @param h `f64`
 * @param lk `f64`
 * @param N `f64`
 * @param q `f64`
 * @param B `f64`
 * @param Cf `f64`
 * @param Fc `f64`
 * @param Fb `f64`
 * @returns `f64`
 */
export declare function calcColumnCheckRatio(b: number, h: number, lk: number, N: number, q: number, B: number, Cf: number, Fc: number, Fb: number): number;
/**
 * assembly/index/calcColumnFk
 * @param h `f64`
 * @param lk `f64`
 * @param Fc `f64`
 * @returns `f64`
 */
export declare function calcColumnFk(h: number, lk: number, Fc: number): number;
/**
 * assembly/index/calcMerikomiRatio
 * @param P `f64`
 * @param b `f64`
 * @param l `f64`
 * @param Fs `f64`
 * @returns `f64`
 */
export declare function calcMerikomiRatio(P: number, b: number, l: number, Fs: number): number;
/**
 * assembly/index/calcBalancedRebarRatio
 * @param fc `f64`
 * @param fy `f64`
 * @returns `f64`
 */
export declare function calcBalancedRebarRatio(fc: number, fy: number): number;
/**
 * assembly/index/calcCantileverMoment
 * @param w `f64`
 * @param P `f64`
 * @param L `f64`
 * @returns `f64`
 */
export declare function calcCantileverMoment(w: number, P: number, L: number): number;
/**
 * assembly/index/getWasmEngineVersion
 * @returns `i32`
 */
export declare function getWasmEngineVersion(): number;
