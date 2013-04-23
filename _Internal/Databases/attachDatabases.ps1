[System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | out-null;
$sqlServerSmo = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Server ("localhost")
$destinationDir = $sqlServerSmo.Settings.BackupDirectory;
$destinationDir = $destinationDir.TrimEnd("Backup") + "DATA\";

$sourceDir = $MyInvocation.MyCommand.Path;
$sourceDir = $sourceDir.TrimEnd($MyInvocation.MyCommand.Name);

$file_list = "NorthwindIB", 
             "ProduceTPC",
             "ProduceTPH",
             "ProduceTPT";

foreach ($file in $file_list) {
  if ($sqlServerSmo.databases[$file] -ne $null) {
	$sqlServerSmo.KillAllProcesses($file) 
	$sqlServerSmo.databases[$file].drop() 
  }
  
  Copy-Item $sourceDir$file".mdf" $destinationDir
  Copy-Item $sourceDir$file"_log.ldf" $destinationDir

  $datafile = $destinationDir+$file+".mdf";
  $logfile = $destinationDir+$file+"_log.LDF"
  
  $sc = new-object System.Collections.Specialized.StringCollection; 
  $sc.Add($datafile) | Out-Null; 
  $sc.Add($logfile) | Out-Null;

  $sqlServerSmo.AttachDatabase($file, $sc);
}