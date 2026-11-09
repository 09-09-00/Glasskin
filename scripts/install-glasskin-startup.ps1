param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][int]$Port
)

$ErrorActionPreference = 'Stop'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Glasskin Local Server.lnk'
$serverScript = Join-Path $ProjectRoot 'scripts\persistent-glasskin-server.mjs'

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $NodePath
$shortcut.Arguments = '"' + $serverScript + '" --port ' + $Port
$shortcut.WorkingDirectory = $ProjectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Servidor local persistente de Glasskin'
$shortcut.Save()

# Shell.Application delega la apertura al shell de Windows. El proceso no
# depende de la consola que ejecutó este instalador.
$shell = New-Object -ComObject Shell.Application
$shell.ShellExecute($shortcutPath, '', $ProjectRoot, 'open', 0)
