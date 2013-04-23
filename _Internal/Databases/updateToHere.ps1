[System.Reflection.Assembly]::LoadWithPartialName('Microsoft.SqlServer.SMO') | out-null;
$sqlServerSmo = New-Object -TypeName Microsoft.SqlServer.Management.Smo.Server ("localhost");
$sourceDir = $sqlServerSmo.Settings.BackupDirectory;
$sourceDir = $sourceDir.TrimEnd("Backup") + "DATA\";

$destinationDir = $MyInvocation.MyCommand.Path;
$destinationDir = $destinationDir.TrimEnd($MyInvocation.MyCommand.Name);

$file_list = "NorthwindIB", 
             "ProduceTPC",
             "ProduceTPH",
             "ProduceTPT";

foreach ($file in $file_list) {
  $datafile = $sourceDir+$file+".mdf";
  $logfile = $sourceDir+$file+"_log.LDF";
  
  $sc = new-object System.Collections.Specialized.StringCollection;
  $sc.Add($datafile) | Out-Null;
  $sc.Add($logfile) | Out-Null;
  
  if ($sqlServerSmo.databases[$file] -ne $null) {
	$sqlServerSmo.KillAllProcesses($file);
    Write-Host "Detaching database "$file;
	$sqlServerSmo.DetachDatabase($file, $sc);
  }
  
  Write-Host "Copying "$file".mdf and "$file"_log.ldf";
  Copy-Item $sourceDir$file".mdf" $destinationDir;
  Copy-Item $sourceDir$file"_log.ldf" $destinationDir;

  Write-Host "Reattaching "$file;
  Write-Host;
  $sqlServerSmo.AttachDatabase($file, $sc);
}

Write-Host "Completed!!!" -BackgroundColor DarkGreen;
Read-Host "Press [ENTER] to continue...";