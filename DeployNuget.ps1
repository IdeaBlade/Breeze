function pauseAndThrow($msg="") {
    if ($msg -ne "") {
        Write-Host $msg
    }
    Write-Host "Press any key to continue ..."
    cmd /c pause | out-null
    throw $msg
}

function deployNuget($srcDir, $folderName) {
  
  $destDir = "$srcDir\Nuget.builds\$folderName"
  
  # push them
  gci $destDir *.nupkg -force | foreach ($_) {  
      $expr = '..\..\..\nuget.exe push ' + $_.fullname 
      invoke-expression $expr
  }

}


#----------------------------------------------------------------------

# srcDir is the location of this script file
$srcDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent


deployNuget $srcDir 'Breeze.WebApi'
deployNuget $srcDir 'Breeze.WebApiSample'

#Breeze.WebApi
#Breeze.WebApiSample

Write-Host "Press any key to continue ..."
cmd /c pause | out-null