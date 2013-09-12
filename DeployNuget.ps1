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
      $expr = 'nuget push ' + $_.fullname 
      invoke-expression $expr
  }

}


#----------------------------------------------------------------------

# srcDir is the location of this script file
$srcDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent

deployNuget $srcDir 'Breeze.Client'
deployNuget $srcDir 'Breeze.Server.WebApi.Core'
deployNuget $srcDir 'Breeze.Server.WebApi.EF'
deployNuget $srcDir 'Breeze.Server.WebApi.NH'

deployNuget $srcDir 'Breeze.WebApi'
deployNuget $srcDir 'Breeze.WebApi.Sample'



Write-Host "Press any key to continue ..."
cmd /c pause | out-null