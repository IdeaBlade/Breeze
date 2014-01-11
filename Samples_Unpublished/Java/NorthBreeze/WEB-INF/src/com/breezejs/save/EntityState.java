package com.breezejs.save;

public enum EntityState {
    Detached(1),
    Unchanged(2),
    Added(4),
    Deleted(8),
    Modified(16);
	
	public final int value;
    EntityState(int value) {
    	this.value = value;
    }
}
