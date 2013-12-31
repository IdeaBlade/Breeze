package northwind.model;

public class EmployeeTerritory {
    private int id;
    private int employeeID;
    private int territoryID;
    private int rowVersion;

    private Employee employee;
    private Territory territory;
    
	public int getId() {
		return id;
	}
	public void setId(int id) {
		this.id = id;
	}
	public int getEmployeeID() {
		return employeeID;
	}
	public void setEmployeeID(int employeeID) {
		this.employeeID = employeeID;
	}
	public int getTerritoryID() {
		return territoryID;
	}
	public void setTerritoryID(int territoryID) {
		this.territoryID = territoryID;
	}
	public int getRowVersion() {
		return rowVersion;
	}
	public void setRowVersion(int rowVersion) {
		this.rowVersion = rowVersion;
	}
	public Employee getEmployee() {
		return employee;
	}
	public void setEmployee(Employee employee) {
		this.employee = employee;
	}
	public Territory getTerritory() {
		return territory;
	}
	public void setTerritory(Territory territory) {
		this.territory = territory;
	}

}
