[System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | out-null;
$sqlServerSmo = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Server ("localhost");
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
	$sqlServerSmo.KillAllProcesses($file);
    Write-Host "Dropping database "$file;
	$sqlServerSmo.databases[$file].drop();
  }
  
  Write-Host "Copying "$file".mdf and "$file"_log.ldf";
  Copy-Item $sourceDir$file".mdf" $destinationDir;
  Copy-Item $sourceDir$file"_log.ldf" $destinationDir;

  $datafile = $destinationDir+$file+".mdf";
  $logfile = $destinationDir+$file+"_log.LDF";
  
  $sc = new-object System.Collections.Specialized.StringCollection; 
  $sc.Add($datafile) | Out-Null; 
  $sc.Add($logfile) | Out-Null;

  Write-Host "Reattaching "$file;
  Write-Host;
  $sqlServerSmo.AttachDatabase($file, $sc);
}

Write-Host "Completed!!!" -BackgroundColor DarkGreen;
Read-Host "Press [ENTER] to continue...";