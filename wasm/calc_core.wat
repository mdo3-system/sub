(module
 (type $0 (func (param f64 f64 f64) (result f64)))
 (type $1 (func (result i32)))
 (type $2 (func (param f64 f64 f64 f64) (result f64)))
 (type $3 (func (param f64 f64 f64 f64 f64 f64 f64 f64 f64) (result f64)))
 (type $4 (func (param f64 f64) (result f64)))
 (memory $0 0)
 (export "calcColumnCheckRatio" (func $assembly/index/calcColumnCheckRatio))
 (export "calcColumnFk" (func $assembly/index/calcColumnFk))
 (export "calcMerikomiRatio" (func $assembly/index/calcMerikomiRatio))
 (export "calcBalancedRebarRatio" (func $assembly/index/calcBalancedRebarRatio))
 (export "calcCantileverMoment" (func $assembly/index/calcCantileverMoment))
 (export "getWasmEngineVersion" (func $assembly/index/getWasmEngineVersion))
 (export "memory" (memory $0))
 (func $assembly/index/getWasmEngineVersion (result i32)
  i32.const 100
 )
 (func $assembly/index/calcMerikomiRatio (param $0 f64) (param $1 f64) (param $2 f64) (param $3 f64) (result f64)
  local.get $0
  local.get $1
  local.get $2
  f64.mul
  local.get $3
  f64.const 0.6666666666666666
  f64.mul
  f64.mul
  f64.div
 )
 (func $assembly/index/calcColumnFk (param $0 f64) (param $1 f64) (param $2 f64) (result f64)
  local.get $1
  local.get $0
  f64.const 3.4641016151377544
  f64.div
  f64.div
  local.tee $0
  f64.const 30
  f64.le
  if (result f64)
   local.get $2
  else
   local.get $0
   f64.const 100
   f64.le
   if (result f64)
    f64.const 1.3
    local.get $0
    f64.const 0.01
    f64.mul
    f64.sub
    local.get $2
    f64.mul
   else
    f64.const 3e3
    local.get $0
    local.get $0
    f64.mul
    f64.div
    local.get $2
    f64.mul
   end
  end
 )
 (func $assembly/index/calcColumnCheckRatio (param $0 f64) (param $1 f64) (param $2 f64) (param $3 f64) (param $4 f64) (param $5 f64) (param $6 f64) (param $7 f64) (param $8 f64) (result f64)
  (local $9 f64)
  local.get $0
  local.get $1
  f64.mul
  local.tee $0
  local.get $1
  f64.mul
  f64.const 6
  f64.div
  local.set $9
  local.get $3
  local.get $0
  local.get $2
  local.get $1
  f64.const 3.4641016151377544
  f64.div
  f64.div
  local.tee $0
  f64.const 30
  f64.le
  if (result f64)
   local.get $7
  else
   local.get $0
   f64.const 100
   f64.le
   if (result f64)
    f64.const 1.3
    local.get $0
    f64.const 0.01
    f64.mul
    f64.sub
    local.get $7
    f64.mul
   else
    f64.const 3e3
    local.get $0
    local.get $0
    f64.mul
    f64.div
    local.get $7
    f64.mul
   end
  end
  f64.const 0.6666666666666666
  f64.mul
  f64.mul
  f64.div
  local.get $4
  local.get $5
  f64.const 1e3
  f64.div
  f64.mul
  local.get $6
  f64.mul
  f64.const 1e3
  f64.div
  local.get $2
  f64.mul
  local.get $2
  f64.mul
  f64.const 0.125
  f64.mul
  local.get $9
  local.get $8
  f64.const 0.6666666666666666
  f64.mul
  f64.mul
  f64.div
  f64.add
 )
 (func $assembly/index/calcCantileverMoment (param $0 f64) (param $1 f64) (param $2 f64) (result f64)
  local.get $0
  local.get $2
  f64.mul
  local.get $2
  f64.mul
  f64.const 0.5
  f64.mul
  local.get $1
  local.get $2
  f64.mul
  f64.add
 )
 (func $assembly/index/calcBalancedRebarRatio (param $0 f64) (param $1 f64) (result f64)
  local.get $0
  f64.const 0.7224999999999999
  f64.mul
  local.get $1
  f64.div
  f64.const 0.0035
  local.get $1
  f64.const 205e3
  f64.div
  f64.const 0.0035
  f64.add
  f64.div
  f64.mul
 )
)
