function pauseAndThrow($msg="") {
    if ($msg -ne "") {
        Write-Host $msg
    }
    Write-Host "Press any key to continue ..."
    cmd /c pause | out-null
    throw $msg
}

function checkIfCurrent([string] $filePath, [int] $minutesOld) {
    $now = [datetime]::Now
    $lastWrite = $now.AddMinutes(-1*$minutesOld)
    $oldFiles = get-childItem $filePath | Where {$_.LastWriteTime -lt "$lastWrite"}
    if ($oldFiles -ne $null) {
        $oldFiles | foreach-object {
            $fileName = $_.fullName
            write-host "The $fileName file is too old" 
        }
        pauseAndThrow("")
    }        
}

function getBreezeVersion($srcDir ) {
    $versionFile = "$srcDir\Breeze.Client\Scripts\IBlade\root.js"
    $text = get-content $versionFile
    $versionNum = (Select-String '\s*version:\s*"(?<version>\d.\d\d)"' $versionFile).Matches[0].Groups[1].Value
    return $versionNum
}

function packageNuget($srcDir, $folderName, $versionNum) {
  
  $destDir = "$srcDir\Nuget.builds\$folderName"
  $nuspecFile = "$destDir\$folderName.nuspec"
  if (!(test-path $nuspecFile)) {
    pauseAndThrow "Unable to locate $nuspecFile"
  }
  
  copy-item $srcDir\Breeze.Client\Scripts\breeze*.js $destDir\content\Scripts 
  copy-item $srcDir\Breeze.Client\Scripts\ThirdParty\q.js $destDir\content\Scripts 
  copy-item $srcDir\Breeze.Client\Scripts\ThirdParty\q.min.js $destDir\content\Scripts 
  
  copy-item $srcDir\Breeze.WebApi\Breeze.WebApi.dll $destDir\lib\
  copy-item $srcDir\ThirdParty\Irony.dll $destDir\lib
  
  $input = get-content $nuspecFile  
  [regex]$regex = "<version>.+"
  $replace = '<version>' + $versionNum + '</version>'
  $output = $input | Foreach-Object {$_ -replace $regex, $replace }
  $output | Set-Content $nuspecFile
  cd "$destDir"
  $expr = "..\..\.nuget\nuget.exe pack $folderName.nuspec"
  invoke-expression $expr
}

#----------------------------------------------------------------------

# srcDir is the location of this script file
$srcDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent

# Check that all files have been updated within the last 5 minutes
$minutes = 5
checkIfCurrent $srcDir\Breeze.webApi\Breeze.webApi.dll $minutes
checkIfCurrent $srcDir\Breeze.Client\Scripts\breeze*.js $minutes

$versionNum = getBreezeVersion $srcDir

packageNuget $srcDir 'BreezeForMVC4' $versionNum

Write-Host "Press any key to continue ..."
cmd /c pause | out-null