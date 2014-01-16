package northwind.model;

import java.util.Date;

public class DiscontinuedProduct extends Product {
    private Date discontinuedDate;

	public Date getDiscontinuedDate() {
		return discontinuedDate;
	}
	public void setDiscontinuedDate(Date discontinuedDate) {
		this.discontinuedDate = discontinuedDate;
	}

}
