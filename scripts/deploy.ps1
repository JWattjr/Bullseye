param([ValidateSet('deploy','spec','predict','adjudicate','resume-adjudicate','proof','pool-deploy','pool-start','pool-resolve','pool-proof','round-pool-deploy','round-pool-stake','round-pool-settle')][string]$Step='proof')
$ErrorActionPreference='Stop'
$bullseyeRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $bullseyeRoot
# The CLI discovers generated JS as another deploy script and caches the module.
# Remove exactly this generated file before each run, preserving source and proofs.
$generated=Join-Path $bullseyeRoot 'deploy\deployScript.compiled.js'
if(Test-Path -LiteralPath $generated){Remove-Item -LiteralPath $generated}
$env:BULLSEYE_STEP=$Step
genlayer deploy
if(Test-Path -LiteralPath $generated){Remove-Item -LiteralPath $generated}
