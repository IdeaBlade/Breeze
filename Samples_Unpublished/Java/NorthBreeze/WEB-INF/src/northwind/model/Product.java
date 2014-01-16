package northwind.model;

import java.math.BigDecimal;
import java.util.Date;

public class Product {
    private int productID;
    private String productName;
    private Integer supplierID;
    private Integer categoryID;
    private String quantityPerUnit;
    private BigDecimal unitPrice;
    private Short unitsInStock;
    private Short unitsOnOrder;
    private Short reorderLevel;
//    private boolean discontinued; discriminator
    private int rowVersion;

    private Category category;
    private Supplier supplier;
    
	public int getProductID() {
		return productID;
	}
	public void setProductID(int productID) {
		this.productID = productID;
	}
	public String getProductName() {
		return productName;
	}
	public void setProductName(String productName) {
		this.productName = productName;
	}
	public Integer getSupplierID() {
		return supplierID;
	}
	public void setSupplierID(Integer supplierID) {
		this.supplierID = supplierID;
	}
	public Integer getCategoryID() {
		return categoryID;
	}
	public void setCategoryID(Integer categoryID) {
		this.categoryID = categoryID;
	}
	public String getQuantityPerUnit() {
		return quantityPerUnit;
	}
	public void setQuantityPerUnit(String quantityPerUnit) {
		this.quantityPerUnit = quantityPerUnit;
	}
	public BigDecimal getUnitPrice() {
		return unitPrice;
	}
	public void setUnitPrice(BigDecimal unitPrice) {
		this.unitPrice = unitPrice;
	}
	public Short getUnitsInStock() {
		return unitsInStock;
	}
	public void setUnitsInStock(Short unitsInStock) {
		this.unitsInStock = unitsInStock;
	}
	public Short getUnitsOnOrder() {
		return unitsOnOrder;
	}
	public void setUnitsOnOrder(Short unitsOnOrder) {
		this.unitsOnOrder = unitsOnOrder;
	}
	public Short getReorderLevel() {
		return reorderLevel;
	}
	public void setReorderLevel(Short reorderLevel) {
		this.reorderLevel = reorderLevel;
	}
	public int getRowVersion() {
		return rowVersion;
	}
	public void setRowVersion(int rowVersion) {
		this.rowVersion = rowVersion;
	}
	public Category getCategory() {
		return category;
	}
	public void setCategory(Category category) {
		this.category = category;
	}
	public Supplier getSupplier() {
		return supplier;
	}
	public void setSupplier(Supplier supplier) {
		this.supplier = supplier;
	}

}
