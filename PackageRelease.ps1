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
    $versionFile = "$srcDir\Breeze.Client\Scripts\IBlade\_head.jsfrag"
    $text = get-content $versionFile
    $versionNum = (Select-String '\s+version:\s*"(?<version>\d.\d\d*.?\d*)"' $versionFile).Matches[0].Groups[1].Value
    return $versionNum
}

function eraseExtraFiles($dir) {
    # erases all files in any bin,obj and resharper folders below $dir and any .suo files
    # '@' in the next line insures that the result is an array ( even if no files found).
	$files = @(gci $dir\ -include  bin,obj,packages,*_Resharper*,*.suo -recurse)  
	$files | foreach ($_) { remove-item $_.fullname -recurse }
}

function prepareSample($srcDir, $destDir, $sampleName, $filesToRemove) {
    $src = "$srcDir\Samples\$sampleName\" 
    $dest = "$destDir\Samples\$sampleName" 
    eraseExtraFiles $src
    copy-item "$src" "$dest" -recurse
    $xxx = "gci '$dest' -include $filesToRemove -recurse -force | remove-Item -recurse -force"
    invoke-expression $xxx
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
    remove-item $destDir -recurse -force
}

# Check that all files have been updated within the last 5 minutes
$minutes = 15
checkIfCurrent $srcDir\Breeze.webApi\Breeze.webApi.dll $minutes
checkIfCurrent $srcDir\Breeze.Client\Scripts\breeze*.*.js $minutes

eraseExtraFiles $srcDir
gci $srcDir breeze-runtime*.zip -force | foreach ($_) {  remove-item $_.fullname }

#create basic release folder structure and zip it
new-item $destDir\Scripts -type Directory
new-item $destDir\Scripts\Adapters -type Directory
new-item $destDir\TypeScript -type Directory
new-item $destDir\Metadata -type Directory
copy-item $srcDir\Breeze.Client\Scripts\breeze*.js $destDir\Scripts 

# next 2 lines are a workaround because next line does not work
# copy-item $srcDir\Breeze.Client\Scripts\IBlade\b??_breeze.*.*.js $destDir\Scripts\Adapters\breeze.*.*
$expr = "copy $srcDir\Breeze.Client\Scripts\IBlade\b??_breeze.*.*.js $destDir\Scripts\Adapters\breeze.*.*"
& cmd /c ($expr)

copy-item $srcDir\Breeze.Client\Scripts\ThirdParty\q.*js $destDir\Scripts
copy-item $srcDir\Breeze.Client\TypeScript\TypeScript\breeze.d.ts $destDir\TypeScript
copy-item $srcDir\Breeze.Client\Metadata\*.* $destDir\Metadata
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
prepareSample $srcDir $destDir "DocCode"       "Todos.sdf, *.suo"
prepareSample $srcDir $destDir "Todo"          "*.sdf, *.suo"
prepareSample $srcDir $destDir "Todo-Angular"  "*.sdf, *.suo"
prepareSample $srcDir $destDir "Todo-AngularWithDI"  "*.sdf, *.suo"
prepareSample $srcDir $destDir "Todo-Require"  "*.sdf, *.suo"
prepareSample $srcDir $destDir "NoDb"          "*.suo"
prepareSample $srcDir $destDir "BreezyDevices" "*.mdf, *.ldf, *.suo"
prepareSample $srcDir $destDir "CarBones"      "*.mdf, *.ldf, *.suo"

copy-item $srcDir\readme-plus.txt $destDir\readme.txt
$zipFile = "$srcDir\breeze-runtime-plus-$versionNum.zip"
if (test-path $zipFile) {
    remove-item $zipFile
}

sz a -tzip "$zipFile" "$destDir\*"    

Write-Host "Press any key to continue ..."
cmd /c pause | out-null