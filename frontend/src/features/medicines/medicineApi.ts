import { api } from '../../shared/services/api';

export type InitialBatchInput={batchNumber?:string;supplier?:string;quantity:number;unitCost:number;sellingPrice:number;expiryDate:string};
export type Medicine = { id:string; name:string; genericName?:string; strength?:string; form:string; unit:string; minimumStockLevel:number; defaultSellingPrice?:number;imageUrl?:string;imagePublicId?:string;imageMimeType?:string; isActive:boolean; totalStock:number; activeBatches:number };
export type MedicineInput = { name:string; genericName?:string; strength?:string; form:string; unit:string; minimumStockLevel:number; defaultSellingPrice?:number;imageUrl?:string;imagePublicId?:string;imageMimeType?:string;initialBatch?:InitialBatchInput; isActive:boolean };
export type MedicineDetails = Medicine & { batches:Array<{id:string;batchNumber?:string;supplier?:string;quantityReceived:number;quantityRemaining:number;unitCost:number;sellingPrice:number;expiryDate?:string;receivedAt:string;isActive:boolean}> };
export const medicineApi={
  list:async(search:string,page:number,includeInactive=false)=>(await api.get('/medicines',{params:{search,page,pageSize:20,includeInactive}})).data,
  details:async(id:string)=>(await api.get<MedicineDetails>(`/medicines/${id}`)).data,
  create:async(input:MedicineInput)=>(await api.post('/medicines',input)).data,
  update:async(id:string,input:MedicineInput)=>api.patch(`/medicines/${id}`,input),
  archive:async(id:string)=>api.patch(`/medicines/${id}/archive`),
  restore:async(id:string)=>api.patch(`/medicines/${id}/restore`),
  addBatch:async(id:string,input:{batchNumber?:string;supplier?:string;quantity:number;unitCost:number;sellingPrice:number;expiryDate?:string})=>api.post(`/medicines/${id}/batches`,input),
  adjust:async(id:string,input:{batchId:string;newQuantity:number;reason:string})=>api.post(`/medicines/${id}/adjust-stock`,input)
};
