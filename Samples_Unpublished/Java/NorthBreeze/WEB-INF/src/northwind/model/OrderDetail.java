package northwind.model;

import java.io.Serializable;
import java.math.BigDecimal;

public class OrderDetail implements Serializable {
	private static final long serialVersionUID = 1L;
	private int orderID;
    private int productID;
    private BigDecimal unitPrice;
    private short quantity;
    private float discount;
    private int rowVersion;

    private Order order;
    private Product product;

    public int hashCode()
    {
        if (orderID == 0) return super.hashCode(); //transient instance
        if (productID == 0) return super.hashCode(); //transient instance
        return orderID ^ productID;

    }

    public boolean equals(Object obj)
    {
    	if (obj == null) return false;
    	if (!(obj instanceof OrderDetail)) return false;
        OrderDetail x = (OrderDetail) obj;
        if (orderID == 0 && x.getOrderID() == 0) return (this == x);
        if (getProductID() == 0 && x.getProductID() == 0) return (this == x);
        return (getOrderID() == x.getOrderID()) && (productID == x.getProductID());
    }

	public int getOrderID() {
		return orderID;
	}

	public void setOrderID(int orderID) {
		this.orderID = orderID;
	}

	public int getProductID() {
		return productID;
	}

	public void setProductID(int productID) {
		this.productID = productID;
	}

	public BigDecimal getUnitPrice() {
		return unitPrice;
	}

	public void setUnitPrice(BigDecimal unitPrice) {
		this.unitPrice = unitPrice;
	}

	public short getQuantity() {
		return quantity;
	}

	public void setQuantity(short quantity) {
		this.quantity = quantity;
	}

	public float getDiscount() {
		return discount;
	}

	public void setDiscount(float discount) {
		this.discount = discount;
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

	public Product getProduct() {
		return product;
	}

	public void setProduct(Product product) {
		this.product = product;
	}

}
