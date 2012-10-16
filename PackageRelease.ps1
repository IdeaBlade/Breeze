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

function getBreezeVersion($srcDir) {
    $versionFile = "$srcDir\Breeze.Client\Scripts\IBlade\root.js"
    $text = get-content $versionFile
    $versionNum = (Select-String '\s*version:\s*"(?<version>\d.\d\d*.?\d*)"' $versionFile).Matches[0].Groups[1].Value
    return $versionNum
}


# make sure 7-Zip is available
if (test-path "$env:ProgramFiles (x86)\7-Zip\7z.exe") {
    set-alias sz "$env:ProgramFiles (x86)\7-Zip\7z.exe" 
} elseif (test-path "$env:ProgramFiles\7-Zip\7z.exe") {
    set-alias sz "$env:ProgramFiles\7-Zip\7z.exe" 
} else {  
    pauseAndThrow("$env:ProgramFiles\7-Zip\7z.exe or $env:ProgramFiles (x86)\7-Zip\7z.exe needed")
} 


# srcDir is the location of this script file
$srcDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$destDir = "$srcDir\_temp"

$versionNum = getBreezeVersion $srcDir

# erase the destDir if it exists
if (test-path $destDir) {
    remove-item $destDir -recurse
}

# Check that all files have been updated within the last 5 minutes
$minutes = 5
checkIfCurrent $srcDir\Breeze.webApi\Breeze.webApi.dll $minutes
checkIfCurrent $srcDir\Breeze.Client\Scripts\breeze*.js $minutes

# erases all files in any bin,obj and resharper folders below $srcDir and any .suo files

gci $srcDir\ -include *_Resharper*,*.suo -recurse -force | foreach ($_) { remove-item $_.fullname -Force -Recurse }
gci $srcDir breeze-runtime*.zip -force | foreach ($_) {  remove-item $_.fullname -Force }

#create basic release folder structure and zip it
new-item $destDir\Scripts -type Directory
copy-item $srcDir\Breeze.Client\Scripts\breeze*.js $destDir\Scripts 
new-item $destDir\WebApi -type Directory
copy-item $srcDir\Breeze.WebApi\Breeze.WebApi.dll $destDir\WebApi
copy-item $srcDir\ThirdParty\Irony.dll $destDir\WebApi
copy-item $srcDir\readme.txt $destDir\readme.txt
"Version: $VersionNum" | out-file $destDir\version.txt
$zipFile = $srcDir+"\breeze-runtime-$versionNum.zip"
if (test-path $zipFile) {
    remove-item $zipFile
}
sz a -tzip "$zipFile" "$destDir\*"    

#create basic plus... release folder structure and zip it
gci $srcDir\DocCode\ -include bin,obj,packages -recurse -force | foreach ($_) { remove-item $_.fullname -Force -Recurse }
copy-item $srcDir\DocCode $destDir\DocCode -recurse
gci $destDir\DocCode -include Todos.sdf -recurse -force | remove-Item -recurse -force

gci $srcDir\Samples\ToDo\ -include bin,obj,packages -recurse -force | foreach ($_) { remove-item $_.fullname -Force -Recurse }
copy-item $srcDir\Samples\ToDo $destDir\Samples\ToDo -recurse
gci $destDir\Samples\Todo -include *.sdf -recurse -force | remove-Item -recurse -force

gci $srcDir\Samples\BreezyDevices\ -include bin,obj,packages -recurse -force | foreach ($_) { remove-item $_.fullname -Force -Recurse }
copy-item $srcDir\Samples\BreezyDevices $destDir\Samples\BreezyDevices -recurse
gci $destDir\Samples\BreezyDevices -include *.mdf,*.ldf -recurse -force | remove-Item -recurse -force

copy-item $srcDir\readme-plus.txt $destDir\readme.txt
$zipFile = "$srcDir\breeze-runtime-plus-$versionNum.zip"
if (test-path $zipFile) {
    remove-item $zipFile
}

sz a -tzip "$zipFile" "$destDir\*"    

Write-Host "Press any key to continue ..."
cmd /c pause | out-null