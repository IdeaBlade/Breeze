[System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | out-null;
$sqlServerSmo = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Server ("localhost")
$sourceDir = $sqlServerSmo.Settings.BackupDirectory;
$sourceDir = $sourceDir.TrimEnd("Backup") + "DATA\";

$destinationDir = $MyInvocation.MyCommand.Path;
$destinationDir = $destinationDir.TrimEnd($MyInvocation.MyCommand.Name);

$file_list = "NorthwindIB", 
             "ProduceTPC",
             "ProduceTPH",
             "ProduceTPT",
			 "CodeFirstSampleEntities";

$service = get-service "MSSQLSERVER" -ErrorAction SilentlyContinue
stop-service $service.name -force

foreach ($file in $file_list) {  
  Copy-Item $sourceDir$file".mdf" $destinationDir
  Copy-Item $sourceDir$file"_log.ldf" $destinationDir
}

start-service $service.name