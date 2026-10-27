$env:DOTNET_ROLL_FORWARD="Major"; dotnet stryker --solution backend/InvoiceApp.sln --test-project backend/tests/InvoiceApp.Tests/InvoiceApp.Tests.csproj -p InvoiceApp.Domain.csproj --reporter html
