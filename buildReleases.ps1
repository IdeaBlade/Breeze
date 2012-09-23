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
    $oldFiles | foreach-object {
        $fileName = $_.fullName
        write-host "The $fileName file is too old" 
    }
    if ($oldFiles -ne $null) {
       pauseAndThrow("")
    }        
}

# make sure 7-Zip is available
if (test-path "$env:ProgramFiles (x86)\7-Zip\7z.exe") {
    set-alias sz "$env:ProgramFiles (x86)\7-Zip\7z.exe" 
} elseif (test-path "$env:ProgramFiles\7-Zip\7z.exe") {
    set-alias sz "$env:ProgramFiles\7-Zip\7z.exe" 
} else {  
    pauseAndThrow("$env:ProgramFiles\7-Zip\7z.exe or $env:ProgramFiles (x86)\7-Zip\7z.exe needed")
} 

$versionFile = $srcDir+"\Breeze.Client\Scripts\IBlade\root.js"
$versionFileText = get-content $versionFile
$versionNum = (Select-String '\s*version:\s*"(?<version>\d.\d\d)"' $versionFile).Matches[0].Groups[1].Value

# srcDir is the location of this script file
$srcDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$destDir = $srcDir+"\_temp"
$versionFile = $srcDir+"\Breeze.Client\Scripts\IBlade\root.js"
$text = get-content $versionFile
$versionNum = (Select-String '\s*version:\s*"(?<version>\d.\d\d)"' $versionFile).Matches[0].Groups[1].Value

# erase the destDir if it exists
if (test-path $destDir) {
    remove-item $destDir -recurse
}

# Check that all files have been updated within the last 5 minutes
$minutes = 5
checkIfCurrent $srcDir\Breeze.webApi\Breeze.webApi.dll $minutes
checkIfCurrent $srcDir\Breeze.Client\Scripts\breeze*.js $minutes

# erases all files in any bin,obj and resharper folders below $srcDir and any .suo files
get-childItem $srcDir\ -include bin,obj,packages,*_Resharper*,*.suo -recurse -force | foreach ($_) { remove-item $_.fullname -Force -Recurse }

#create basic release folder structure and zip it
new-item $destDir\Scripts -type Directory
copy-item $srcDir\Breeze.Client\Scripts\breeze*.js $destDir\Scripts 
new-item $destDir\WebApi -type Directory
copy-item $srcDir\Breeze.WebApi\Breeze.WebApi.dll $destDir\WebApi
copy-item $srcDir\ThirdParty\Irony.dll $destDir\WebApi
copy-item $srcDir\readme.txt $destDir\readme.txt
"Version: $VersionNum" | out-file $destDir\version.txt
$zipFile = $srcDir+"\release-$versionNum.zip"
if (test-path $zipFile) {
    remove-item $zipFile
}
sz a -tzip "$zipFile" "$destDir\*"    

#create basic plus... release folder structure and zip it
copy-item $srcDir\DocCode $destDir\DocCode -recurse
copy-item $srcDir\Samples\ToDo $destDir\Samples\ToDo -recurse
copy-item $srcDir\readme-plus.txt $destDir\readme.txt
$zipFile = $srcDir+"\release-plus-$versionNum.zip"
if (test-path $zipFile) {
    remove-item $zipFile
}
sz a -tzip "$zipFile" "$destDir\*"    

Write-Host "Press any key to continue ..."
cmd /c pause | out-null