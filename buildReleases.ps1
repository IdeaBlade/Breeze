# make sure 7-Zip is available
if (test-path "$env:ProgramFiles (x86)\7-Zip\7z.exe") {
    set-alias sz "$env:ProgramFiles (x86)\7-Zip\7z.exe" 
} else {  
    throw "$env:ProgramFiles\7-Zip\7z.exe or $env:ProgramFiles (x86)\7-Zip\7z.exe needed"
} 

# srcDir is the location of this script file
$srcDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$destDir = $srcDir+"\_temp"

# erases all files in any bin,obj and resharper folders below $folder and any .suo files
Get-ChildItem $srcDir\ -include bin,obj,packages,*_Resharper*,*.suo -recurse -force | foreach ($_) { remove-item $_.fullname -Force -Recurse }
if (Test-Path $destDir) {
    remove-item $destDir -recurse
}
new-item $destDir\Scripts -type Directory
Copy-item $srcDir\Breeze.Client\Scripts\*.js $destDir\Scripts 
new-item $destDir\WebApi -type Directory
Copy-item $srcDir\Breeze.WebApi\Breeze.WebApi.dll $destDir\WebApi
copy-item $srcDir\ThirdParty\Irony.dll $destDir\WebApi
Copy-item $srcDir\readme.txt $destDir\readme.txt
$zipFile = $srcDir+"\release.zip"
if (Test-Path $zipFile) {
    remove-item $zipFile
}
sz a -tzip "$zipFile" "$destDir\*"    


Copy-Item $srcDir\DocCode $destDir\DocCode -recurse
Copy-item $srcDir\Samples\ToDo $destDir\Samples\ToDo -recurse
Copy-item $srcDir\readme-plus.txt $destDir\readme.txt
$zipFile = $srcDir+"\release-plus.zip"
if (Test-Path $zipFile) {
    remove-item $zipFile
}
sz a -tzip "$zipFile" "$destDir\*"    