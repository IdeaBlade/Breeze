If (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator"))

{   
$arguments = "& '" + $myinvocation.mycommand.definition + "'"
Start-Process powershell -Verb runAs -ArgumentList $arguments
Break
}


[System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | out-null;
$sqlServerSmo = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Server ("localhost")
$sourceDir = $sqlServerSmo.Settings.BackupDirectory;
$sourceDir = $sourceDir.TrimEnd("Backup") + "DATA\";

$destinationDir = $MyInvocation.MyCommand.Path;
$destinationDir = $destinationDir.TrimEnd($MyInvocation.MyCommand.Name);

$file_list = "NorthwindIB", 
             "ProduceTPC",
             "ProduceTPH",
             "ProduceTPT"
			 

$service = get-service "MSSQLSERVER" 
stop-service $service.name -force

foreach ($file in $file_list) {  
  Copy-Item $sourceDir$file".mdf" $destinationDir
  Copy-Item $sourceDir$file"_log.ldf" $destinationDir
}

start-service $service.name