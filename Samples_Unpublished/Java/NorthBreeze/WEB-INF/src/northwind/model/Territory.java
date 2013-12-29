package northwind.model;
import java.util.Set;

public class Territory {
    private int territoryID;
    private String territoryDescription;
    private int regionID;
    private int rowVersion;

    private Set<EmployeeTerritory> employeeTerritories;
    private Region region;
    private Set<Employee> employees;

	public int getTerritoryID() {
		return territoryID;
	}
	public void setTerritoryID(int territoryID) {
		this.territoryID = territoryID;
	}
	public String getTerritoryDescription() {
		return territoryDescription;
	}
	public void setTerritoryDescription(String territoryDescription) {
		this.territoryDescription = territoryDescription;
	}
	public int getRegionID() {
		return regionID;
	}
	public void setRegionID(int regionID) {
		this.regionID = regionID;
	}
	public int getRowVersion() {
		return rowVersion;
	}
	public void setRowVersion(int rowVersion) {
		this.rowVersion = rowVersion;
	}
	public Set<EmployeeTerritory> getEmployeeTerritories() {
		return employeeTerritories;
	}
	public void setEmployeeTerritories(Set<EmployeeTerritory> employeeTerritories) {
		this.employeeTerritories = employeeTerritories;
	}
	public Region getRegion() {
		return region;
	}
	public void setRegion(Region region) {
		this.region = region;
	}
	public Set<Employee> getEmployees() {
		return employees;
	}
	public void setEmployees(Set<Employee> employees) {
		this.employees = employees;
	}

}
