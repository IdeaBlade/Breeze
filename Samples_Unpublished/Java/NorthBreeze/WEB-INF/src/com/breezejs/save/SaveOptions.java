package com.breezejs.save;

import java.util.Map;

public class SaveOptions {
	
	public SaveOptions() {}
	
	public SaveOptions(Map map) {
		this.allowConcurrentSaves = "true".equalsIgnoreCase(String.valueOf(map.get("")));
		this.tag = map.get("tag");
	}
	
	public boolean allowConcurrentSaves;
	public Object tag;
}
