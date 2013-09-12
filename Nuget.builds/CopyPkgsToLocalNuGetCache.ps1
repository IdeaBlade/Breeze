# srcDir is the location of this script file
$srcDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent

copy-item $srcDir\Breeze.WebApi\Breeze.WebApi.*.nupkg $env:LOCALAPPDATA\Nuget\Cache
copy-item $srcDir\Breeze.WebApi.Sample\Breeze.WebApi.Sample.*.nupkg $env:LOCALAPPDATA\Nuget\Cache

copy-item $srcDir\Breeze.Client\Breeze.Client.*.nupkg $env:LOCALAPPDATA\Nuget\Cache
copy-item $srcDir\Breeze.Server.WebApi.Core\Breeze.Server.WebApi.Core.*.nupkg $env:LOCALAPPDATA\Nuget\Cache
copy-item $srcDir\Breeze.Server.WebApi.EF\Breeze.Server.WebApi.EF.*.nupkg $env:LOCALAPPDATA\Nuget\Cache
copy-item $srcDir\Breeze.Server.WebApi.NH\Breeze.Server.WebApi.NH.*.nupkg $env:LOCALAPPDATA\Nuget\Cache


# copy Breeze.WebApi\Breeze.WebApi.*.nupkg "%LOCALAPPDATA%\NuGet\Cache" /-Y
# copy Breeze.WebApiSample\Breeze.WebApiSample.*.nupkg "%LOCALAPPDATA%\NuGet\Cache" /-Y
