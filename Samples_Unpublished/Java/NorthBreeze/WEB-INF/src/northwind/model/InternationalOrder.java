package northwind.model;

import java.math.BigDecimal;

public class InternationalOrder {
    private int orderID;
    private String customsDescription;
    private BigDecimal exciseTax;
    private int rowVersion;

    private Order order;

	public int getOrderID() {
		return orderID;
	}

	public void setOrderID(int orderID) {
		this.orderID = orderID;
	}

	public String getCustomsDescription() {
		return customsDescription;
	}

	public void setCustomsDescription(String customsDescription) {
		this.customsDescription = customsDescription;
	}

	public BigDecimal getExciseTax() {
		return exciseTax;
	}

	public void setExciseTax(BigDecimal exciseTax) {
		this.exciseTax = exciseTax;
	}

	public int getRowVersion() {
		return rowVersion;
	}

	public void setRowVersion(int rowVersion) {
		this.rowVersion = rowVersion;
	}

	public Order getOrder() {
		return order;
	}

	public void setOrder(Order order) {
		this.order = order;
	}

}
