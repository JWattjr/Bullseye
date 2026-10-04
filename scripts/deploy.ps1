param([ValidateSet('deploy','spec','predict','adjudicate','resume-adjudicate','proof','pool-deploy','pool-start','pool-resolve','pool-proof','round-pool-deploy','round-pool-stake','round-pool-settle','film-deploy','film-spec','film-adjudicate','film-stake','film-claim','upcoming-deploy','upcoming-spec','upcoming-pool','upcoming-proof')][string]$Step='proof')
$ErrorActionPreference='Stop'
$bullseyeRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $bullseyeRoot
# The CLI discovers generated JS as another deploy script and caches the module.
# Remove exactly this generated file before each run, preserving source and proofs.
$generated=Join-Path $bullseyeRoot 'deploy\deployScript.compiled.js'
if(Test-Path -LiteralPath $generated){Remove-Item -LiteralPath $generated}
$env:BULLSEYE_STEP=$Step
# The CLI transpiles its entrypoint only. The tsx loader resolves shared local
# TypeScript imports for upcoming specifications without copying their logic.
$previousNodeOptions=$env:NODE_OPTIONS
try {
  if($Step.StartsWith('upcoming-')){$env:NODE_OPTIONS=($previousNodeOptions+' --import=tsx').Trim()}
  genlayer deploy
} finally {
  $env:NODE_OPTIONS=$previousNodeOptions
  if(Test-Path -LiteralPath $generated){Remove-Item -LiteralPath $generated}
}
