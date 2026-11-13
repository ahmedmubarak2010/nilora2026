window.NILORA_DATA={
 async farms(){const {data,error}=await db.from("farms").select("*").order("created_at",{ascending:false});if(error)throw error;return data||[]},
 async fields(){const {data,error}=await db.from("fields").select("*,farms(name,latitude,longitude,governorate,locality)").order("created_at",{ascending:false});if(error)throw error;return data||[]},
 async addFarm(x){const {data,error}=await db.from("farms").insert({...x,owner_id:NILORA.user.id}).select().single();if(error)throw error;return data},
 async addField(x){const {data,error}=await db.from("fields").insert(x).select().single();if(error)throw error;return data},
 async assignments(){const {data,error}=await db.from("farm_assignments").select("status,farms(name,governorate,locality,area_feddan)").eq("status","active");if(error)throw error;return data||[]},
 async assessments(){const {data,error}=await db.from("crop_assessments").select("id,crop_code,season,status,score,fields(name)").order("created_at",{ascending:false});if(error)throw error;return data||[]},
 async nasaPower(fieldId,range={}){const {data,error}=await db.functions.invoke("nasa-power",{body:{field_id:fieldId,...range}});if(error)throw error;if(data?.error)throw new Error(data.error);return data},
 async sentinelScenes(fieldId){const {data,error}=await db.functions.invoke("sentinel-scenes",{body:{field_id:fieldId}});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
};