use NorthwindIB
go
delete from InternationalOrder  where OrderID in (select [Order].OrderID from [Order] where CustomerID is null or EmployeeID is null)
go
delete from OrderDetail where OrderID in (select [Order].OrderID from [Order] where CustomerID is null or EmployeeID is null)
go
delete from [Order] where CustomerID is null or EmployeeID is null
go
delete from Employee where LastName like 'Test%' or LastName like '''%'
go
delete from Customer where CompanyName like 'Test%' or CompanyName like '''%'
go
delete from Territory where TerritoryDescription like 'Test%'
go
delete from Supplier where CompanyName like 'Test%' or CompanyName like '''%'
go
delete from Region where RegionDescription like 'Test%'
go
delete from Role where Name like 'Test%'
go
delete from TimeLimit where Id > 50
go